import { Output, ToolLoopAgent, isStepCount, tool, type LanguageModel } from 'ai';
import { z } from 'zod';
import { esquemaTriagem } from '../dominio/esquema';
import { CATEGORIAS, EXEMPLOS_K, FILAS_MODELO, PRIORIDADES } from '../dominio/taxonomia';
import { assertSemPii, mascararTexto } from '../mascaramento/mascaramento';
import { filaPorPolitica } from './politica';
import type { ExemploSimilar, ResultadoModelo } from './tipos';

const INSTRUCOES = [
  'Voce tria chamados internos de suporte escritos em portugues informal.',
  'O texto ja chegou mascarado. Marcadores como [CPF_1], [EMAIL_1], [TELEFONE_1] e [NOME_1] sao dados pessoais removidos de proposito. Nao tente recupera-los.',
  'Chame buscar_exemplos com o texto do chamado e politica_de_fila antes de fechar a classificacao.',
  'A fila e a fila operacional. Nao escolha fila_revisao. A revisao humana e decidida fora do modelo, pelo limiar de confianca.',
  'confianca fica entre 0 e 1. Use valor alto so quando a categoria, a prioridade e a fila estiverem claras.',
  'justificativa curta, em portugues, sem repetir dado pessoal.',
].join(' ');

export async function classificarComSdk(opcoes: {
  model: LanguageModel;
  modeloId: string;
  textoMascarado: string;
  exemplos: ExemploSimilar[];
  buscarMais: (consultaMascarada: string) => Promise<ExemploSimilar[]>;
  telemetria: boolean;
  registrarConteudo: boolean;
}): Promise<ResultadoModelo> {
  assertSemPii(opcoes.textoMascarado);
  const exemplos = opcoes.exemplos.map((exemplo) => ({
    ...exemplo,
    textoMascarado: mascararTexto(exemplo.textoMascarado).texto,
  }));
  for (const exemplo of exemplos) assertSemPii(exemplo.textoMascarado);

  const prompt = [
    'Chamado mascarado:',
    opcoes.textoMascarado,
    '',
    'Exemplos parecidos ja recuperados:',
    exemplos.length === 0
      ? 'nenhum'
      : exemplos
          .map(
            (exemplo) =>
              `- ${exemplo.id} | ${exemplo.categoria} | ${exemplo.prioridade} | ${exemplo.fila} | ${exemplo.similaridade.toFixed(2)} | ${exemplo.textoMascarado}`,
          )
          .join('\n'),
  ].join('\n');
  assertSemPii(prompt);

  const agent = new ToolLoopAgent({
    model: opcoes.model,
    instructions: INSTRUCOES,
    tools: {
      buscar_exemplos: tool({
        description: 'Busca chamados rotulados parecidos com uma consulta mascarada.',
        inputSchema: z.object({
          consulta: z.string().min(3).max(2000),
        }),
        execute: async ({ consulta }) => {
          const mascarada = mascararTexto(consulta).texto;
          assertSemPii(mascarada);
          const achados = await opcoes.buscarMais(mascarada);
          return achados.slice(0, EXEMPLOS_K).map((exemplo) => ({
            id: exemplo.id,
            categoria: exemplo.categoria,
            prioridade: exemplo.prioridade,
            fila: exemplo.fila,
            similaridade: Number(exemplo.similaridade.toFixed(3)),
            texto: mascararTexto(exemplo.textoMascarado).texto,
          }));
        },
      }),
      politica_de_fila: tool({
        description: 'Devolve a fila operacional da politica interna para a categoria e a prioridade informadas.',
        inputSchema: z.object({
          categoria: z.enum(CATEGORIAS),
          prioridade: z.enum(PRIORIDADES),
          sinais: z.array(z.string()).max(8),
        }),
        execute: async ({ categoria, prioridade, sinais }) => {
          const texto = mascararTexto(sinais.join(' ')).texto;
          return {
            fila: filaPorPolitica(categoria, texto, prioridade),
            filasValidas: FILAS_MODELO,
          };
        },
      }),
    },
    output: Output.object({
      schema: esquemaTriagem,
      name: 'triagem',
      description: 'Classificacao estruturada do chamado mascarado.',
    }),
    stopWhen: isStepCount(6),
    maxOutputTokens: 500,
    telemetry: opcoes.telemetria
      ? {
          isEnabled: true,
          functionId: 'triagem-chamados',
          recordInputs: opcoes.registrarConteudo,
          recordOutputs: opcoes.registrarConteudo,
        }
      : { isEnabled: false },
  });

  const result = await agent.generate({ prompt });
  if (!result.output) throw new Error(`O modelo ${opcoes.modeloId} nao devolveu saida estruturada.`);
  const ferramentas = result.steps.flatMap((step) => step.toolCalls.map((chamada) => chamada.toolName));
  const idsFerramenta = ferramentas.includes('buscar_exemplos') ? exemplos.map((exemplo) => exemplo.id) : [];
  return {
    ...result.output,
    justificativa: mascararTexto(result.output.justificativa).texto,
    modelo: opcoes.modeloId,
    tokensEntrada: result.usage.inputTokens ?? 0,
    tokensSaida: result.usage.outputTokens ?? 0,
    exemplosUsados: [...new Set([...exemplos.map((exemplo) => exemplo.id), ...idsFerramenta])],
  };
}
