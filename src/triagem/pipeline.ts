import { createHash, randomUUID } from 'node:crypto';
import type { AgenteTriagem } from '../agente/tipos';
import { EXEMPLOS_K, FILA_REVISAO, type FilaEfetiva, type FilaModelo } from '../dominio/taxonomia';
import type { ServicoEmbedding } from '../embeddings/servico';
import { assertSemPii, mascararTexto, type TipoPii } from '../mascaramento/mascaramento';
import type { Banco, RegistroChamado } from '../persistencia/tipos';

export type DecisaoTriagem = {
  hashOriginal: string;
  textoMascarado: string;
  tiposPii: TipoPii[];
  categoria: RegistroChamado['categoria'];
  prioridade: RegistroChamado['prioridade'];
  filaPrevista: FilaModelo;
  filaEfetiva: FilaEfetiva;
  confianca: number;
  limiar: number;
  revisaoHumana: boolean;
  justificativa: string;
  modelo: string;
  exemplosUsados: string[];
  tokensEntrada: number;
  tokensSaida: number;
  latenciaMs: number;
};

export class PipelineTriagem {
  constructor(
    private readonly embeddings: ServicoEmbedding,
    private readonly banco: Banco,
    private readonly agente: AgenteTriagem,
    private readonly limiar: number,
  ) {}

  async classificar(texto: string): Promise<DecisaoTriagem> {
    const mascara = mascararTexto(texto);
    assertSemPii(mascara.texto);
    const inicio = Date.now();
    const vetor = await this.embeddings.embed(mascara.texto);
    const exemplos = await this.banco.buscarExemplos(vetor, EXEMPLOS_K);
    for (const exemplo of exemplos) assertSemPii(exemplo.textoMascarado);
    const resultado = await this.agente.classificar({ textoMascarado: mascara.texto, exemplos });
    const revisaoHumana = resultado.confianca < this.limiar;
    return {
      hashOriginal: hashTexto(texto),
      textoMascarado: mascara.texto,
      tiposPii: mascara.tipos,
      categoria: resultado.categoria,
      prioridade: resultado.prioridade,
      filaPrevista: resultado.fila,
      filaEfetiva: revisaoHumana ? FILA_REVISAO : resultado.fila,
      confianca: resultado.confianca,
      limiar: this.limiar,
      revisaoHumana,
      justificativa: mascararTexto(resultado.justificativa).texto,
      modelo: resultado.modelo,
      exemplosUsados: resultado.exemplosUsados,
      tokensEntrada: resultado.tokensEntrada,
      tokensSaida: resultado.tokensSaida,
      latenciaMs: Date.now() - inicio,
    };
  }
}

export class NaoEncontrado extends Error {
  readonly status = 404;

  constructor() {
    super('Chamado nao encontrado.');
    this.name = 'NaoEncontrado';
  }
}

export class TriagemService {
  constructor(
    private readonly pipeline: PipelineTriagem,
    private readonly banco: Banco,
    private readonly info: {
      banco: 'memoria' | 'postgres';
      embedding: string;
      langfuse: boolean;
      limiar: number;
    },
  ) {}

  async triar(entrada: { texto: string; referenciaExterna?: string }): Promise<RegistroChamado> {
    const hashOriginal = hashTexto(entrada.texto);
    let decisao: DecisaoTriagem;
    try {
      decisao = await this.pipeline.classificar(entrada.texto);
    } catch (erro) {
      const tipos = (erro as { tipos?: TipoPii[] }).tipos;
      if (tipos) {
        await this.banco.registrarAuditoria({
          id: randomUUID(),
          chamadoId: null,
          evento: 'bloqueio_pii',
          detalhe: { tipos, hashOriginal },
          criadoEm: new Date().toISOString(),
        });
      }
      throw erro;
    }

    const agora = new Date().toISOString();
    const registro: RegistroChamado = {
      id: randomUUID(),
      referenciaExterna: entrada.referenciaExterna ?? null,
      hashOriginal: decisao.hashOriginal,
      textoMascarado: decisao.textoMascarado,
      tiposPii: decisao.tiposPii,
      categoria: decisao.categoria,
      prioridade: decisao.prioridade,
      filaPrevista: decisao.filaPrevista,
      filaEfetiva: decisao.filaEfetiva,
      confianca: decisao.confianca,
      limiar: decisao.limiar,
      justificativa: decisao.justificativa,
      modelo: decisao.modelo,
      exemplosUsados: decisao.exemplosUsados,
      tokensEntrada: decisao.tokensEntrada,
      tokensSaida: decisao.tokensSaida,
      latenciaMs: decisao.latenciaMs,
      status: decisao.revisaoHumana ? 'revisao' : 'classificado',
      decisaoHumana: null,
      criadoEm: agora,
      atualizadoEm: agora,
    };
    await this.banco.inserirChamado(registro);
    await this.banco.registrarAuditoria({
      id: randomUUID(),
      chamadoId: registro.id,
      evento: decisao.revisaoHumana ? 'encaminhado_revisao' : 'triagem_concluida',
      detalhe: {
        modelo: registro.modelo,
        categoria: registro.categoria,
        prioridade: registro.prioridade,
        filaPrevista: registro.filaPrevista,
        filaEfetiva: registro.filaEfetiva,
        confianca: registro.confianca,
        limiar: registro.limiar,
        tiposPii: registro.tiposPii,
        exemplosUsados: registro.exemplosUsados,
        tokensEntrada: registro.tokensEntrada,
        tokensSaida: registro.tokensSaida,
        latenciaMs: registro.latenciaMs,
      },
      criadoEm: agora,
    });
    return registro;
  }

  async obter(id: string): Promise<RegistroChamado> {
    const chamado = await this.banco.obterChamado(id);
    if (!chamado) throw new NaoEncontrado();
    return chamado;
  }

  async listarRevisao(limite: number): Promise<RegistroChamado[]> {
    return this.banco.listarChamados('revisao', limite);
  }

  async decidir(
    id: string,
    entrada: { categoria: RegistroChamado['categoria']; prioridade: RegistroChamado['prioridade']; fila: FilaModelo; comentario?: string },
  ): Promise<RegistroChamado> {
    const chamado = await this.obter(id);
    const comentario = entrada.comentario ? mascararTexto(entrada.comentario).texto : undefined;
    const decisao = {
      categoria: entrada.categoria,
      prioridade: entrada.prioridade,
      fila: entrada.fila,
      comentario,
    };
    await this.banco.decidirChamado(id, decisao, entrada.fila);
    await this.banco.registrarAuditoria({
      id: randomUUID(),
      chamadoId: id,
      evento: 'decisao_humana',
      detalhe: { ...decisao, filaPrevista: chamado.filaPrevista, modelo: chamado.modelo },
      criadoEm: new Date().toISOString(),
    });
    return this.obter(id);
  }

  listarAuditoria(chamadoId: string | undefined, limite: number) {
    return this.banco.listarAuditoria(chamadoId, limite);
  }

  descrever() {
    return {
      status: 'ok' as const,
      banco: this.info.banco,
      embedding: this.info.embedding,
      exemplos: this.banco.estadoExemplos,
      identificadorEmbedding: this.banco.identificadorEmbedding,
      langfuse: this.info.langfuse,
      limiar: this.info.limiar,
    };
  }
}

export function hashTexto(texto: string): string {
  return createHash('sha256').update(texto).digest('hex');
}
