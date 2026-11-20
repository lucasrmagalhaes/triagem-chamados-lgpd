import { describe, expect, it } from 'vitest';
import { AgenteHeuristico } from '../agente/heuristico';
import type { AgenteTriagem } from '../agente/tipos';
import { ServicoEmbedding } from '../embeddings/servico';
import { BancoMemoria } from '../persistencia/memoria';
import { PipelineTriagem, TriagemService } from './pipeline';

const TEXTO =
  'aqui e o Joao Silva, nao consigo login e a senha falha. fico no aguardo. cpf 390.533.447-05 email joao.silva@exemplo.com fone (11) 98888-7777';

describe('pipeline de triagem', () => {
  it('mascara antes do embedding e do agente e manda confianca baixa para revisao', async () => {
    const vistos: string[] = [];
    const embeddings = new ServicoEmbedding('local', 'openai/text-embedding-3-small');
    const original = embeddings.embed.bind(embeddings);
    embeddings.embed = async (texto: string) => {
      vistos.push(texto);
      return original(texto);
    };
    const agente: AgenteTriagem = {
      modelo: 'espiao',
      async classificar(entrada) {
        vistos.push(entrada.textoMascarado);
        vistos.push(JSON.stringify(entrada.exemplos));
        return {
          categoria: 'acesso',
          prioridade: 'media',
          fila: 'fila_acessos',
          confianca: 0.41,
          justificativa: 'margem baixa',
          modelo: 'espiao',
          tokensEntrada: 11,
          tokensSaida: 7,
          exemplosUsados: entrada.exemplos.map((exemplo) => exemplo.id),
        };
      },
    };
    const banco = new BancoMemoria();
    const servico = new TriagemService(new PipelineTriagem(embeddings, banco, agente, 0.72), banco, {
      banco: 'memoria',
      embedding: 'local/hash-256',
      langfuse: false,
      limiar: 0.72,
    });

    const chamado = await servico.triar({ texto: TEXTO, referenciaExterna: 'HD-10' });
    const auditoria = await servico.listarAuditoria(chamado.id, 10);
    const bruto = JSON.stringify({ chamado, auditoria, vistos });

    expect(chamado.status).toBe('revisao');
    expect(chamado.filaEfetiva).toBe('fila_revisao');
    expect(chamado.filaPrevista).toBe('fila_acessos');
    expect(chamado.tiposPii).toEqual(expect.arrayContaining(['cpf', 'email', 'telefone', 'nome']));
    expect(bruto).not.toMatch(/39053344705|390\.533\.447-05/);
    expect(bruto).not.toMatch(/joao\.silva@exemplo\.com/i);
    expect(bruto).not.toMatch(/98888/);
    expect(bruto).not.toMatch(/joao silva/i);
    expect(auditoria[0]?.evento).toBe('encaminhado_revisao');
    expect(auditoria[0]?.detalhe).not.toHaveProperty('texto');
  });

  it('mantem a fila prevista quando a confianca passa do limiar', async () => {
    const banco = new BancoMemoria();
    const embeddings = new ServicoEmbedding('local', 'openai/text-embedding-3-small');
    const servico = new TriagemService(
      new PipelineTriagem(embeddings, banco, new AgenteHeuristico(), 0.72),
      banco,
      { banco: 'memoria', embedding: 'local/hash-256', langfuse: false, limiar: 0.72 },
    );
    const chamado = await servico.triar({
      texto: 'nao to conseguindo login, a senha fica invalida no portal. fico no aguardo.',
    });
    expect(chamado.categoria).toBe('acesso');
    expect(chamado.prioridade).toBe('media');
    expect(chamado.status).toBe('classificado');
    expect(chamado.filaEfetiva).toBe('fila_acessos');

    const revisao = await servico.listarRevisao(20);
    expect(revisao).toHaveLength(0);
  });
});
