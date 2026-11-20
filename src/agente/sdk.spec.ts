import { MockLanguageModelV4 } from 'ai/test';
import { describe, expect, it } from 'vitest';
import { BloqueioPii } from '../mascaramento/mascaramento';
import { classificarComSdk } from './sdk';

const uso = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 20, text: 20, reasoning: undefined },
};

describe('agente com AI SDK', () => {
  it('barra a chamada quando o texto ainda tem CPF', async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new Error('o modelo nao deveria ser chamado');
      },
    });
    await expect(
      classificarComSdk({
        model,
        modeloId: 'mock',
        textoMascarado: 'cpf 390.533.447-05 no login',
        exemplos: [],
        buscarMais: async () => [],
        telemetria: false,
        registrarConteudo: false,
      }),
    ).rejects.toBeInstanceOf(BloqueioPii);
  });

  it('le a saida estruturada do mock sem chave de provedor', async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              categoria: 'pagamento',
              prioridade: 'alta',
              fila: 'fila_financeiro',
              confianca: 0.81,
              justificativa: 'boleto e pix sem compensar',
            }),
          },
        ],
        finishReason: { unified: 'stop', raw: undefined },
        usage: uso,
        warnings: [],
      }),
    });
    const resultado = await classificarComSdk({
      model,
      modeloId: 'mock/estruturado',
      textoMascarado: 'o boleto venceu e o pix nao compensou. preciso disso hoje.',
      exemplos: [],
      buscarMais: async () => [],
      telemetria: false,
      registrarConteudo: false,
    });
    expect(resultado.categoria).toBe('pagamento');
    expect(resultado.fila).toBe('fila_financeiro');
    expect(resultado.confianca).toBe(0.81);
    expect(resultado.modelo).toBe('mock/estruturado');
    expect(resultado.tokensEntrada).toBeGreaterThan(0);
  });
});
