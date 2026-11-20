import { SIMILARIDADE_MINIMA } from '../dominio/taxonomia';
import { similaridadeCosseno } from '../embeddings/local';
import type { ExemploSimilar } from '../agente/tipos';
import type {
  Banco,
  DecisaoHumana,
  EstadoExemplos,
  ExemploGravado,
  RegistroAuditoria,
  RegistroChamado,
  StatusChamado,
} from './tipos';
import type { FilaModelo } from '../dominio/taxonomia';

export class BancoMemoria implements Banco {
  estadoExemplos: EstadoExemplos = 'vazio';
  identificadorEmbedding = '';
  private exemplos: ExemploGravado[] = [];
  private chamados: RegistroChamado[] = [];
  private auditoria: RegistroAuditoria[] = [];

  async buscarExemplos(vetor: number[], limite: number): Promise<ExemploSimilar[]> {
    if (this.estadoExemplos !== 'pronto') return [];
    return this.exemplos
      .map((exemplo) => ({
        id: exemplo.id,
        textoMascarado: exemplo.textoMascarado,
        categoria: exemplo.categoria,
        prioridade: exemplo.prioridade,
        fila: exemplo.fila,
        similaridade: similaridadeCosseno(vetor, exemplo.embedding),
      }))
      .filter((exemplo) => exemplo.similaridade >= SIMILARIDADE_MINIMA)
      .sort((a, b) => b.similaridade - a.similaridade)
      .slice(0, limite);
  }

  async substituirExemplos(itens: ExemploGravado[], identificadorEmbedding: string): Promise<void> {
    this.exemplos = itens;
    this.identificadorEmbedding = identificadorEmbedding;
    this.estadoExemplos = itens.length === 0 ? 'vazio' : 'pronto';
  }

  async inserirChamado(registro: RegistroChamado): Promise<void> {
    this.chamados.push(registro);
  }

  async obterChamado(id: string): Promise<RegistroChamado | undefined> {
    return this.chamados.find((item) => item.id === id);
  }

  async listarChamados(status: StatusChamado, limite: number): Promise<RegistroChamado[]> {
    return this.chamados
      .filter((item) => item.status === status)
      .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))
      .slice(0, limite);
  }

  async decidirChamado(id: string, decisao: DecisaoHumana, filaEfetiva: FilaModelo): Promise<void> {
    const chamado = this.chamados.find((item) => item.id === id);
    if (!chamado) return;
    chamado.decisaoHumana = decisao;
    chamado.filaEfetiva = filaEfetiva;
    chamado.status = 'decidido';
    chamado.atualizadoEm = new Date().toISOString();
  }

  async registrarAuditoria(evento: RegistroAuditoria): Promise<void> {
    this.auditoria.push(evento);
  }

  async listarAuditoria(chamadoId: string | undefined, limite: number): Promise<RegistroAuditoria[]> {
    return this.auditoria
      .filter((item) => (chamadoId ? item.chamadoId === chamadoId : true))
      .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))
      .slice(-limite);
  }

  async fechar(): Promise<void> {}
}
