export const CATEGORIAS = ['acesso', 'pagamento', 'bug', 'cadastro', 'entrega', 'duvida'] as const;
export const PRIORIDADES = ['baixa', 'media', 'alta', 'urgente'] as const;
export const FILAS_MODELO = [
  'fila_acessos',
  'fila_infra',
  'fila_financeiro',
  'fila_engenharia',
  'fila_cadastro',
  'fila_logistica',
  'fila_atendimento',
] as const;
export const FILA_REVISAO = 'fila_revisao' as const;
export const TIPOS_AMOSTRA = ['direto', 'misto', 'ambiguo'] as const;
export const SPLITS = ['treino', 'avaliacao'] as const;

export type Categoria = (typeof CATEGORIAS)[number];
export type Prioridade = (typeof PRIORIDADES)[number];
export type FilaModelo = (typeof FILAS_MODELO)[number];
export type FilaEfetiva = FilaModelo | typeof FILA_REVISAO;
export type TipoAmostra = (typeof TIPOS_AMOSTRA)[number];
export type SplitAmostra = (typeof SPLITS)[number];

export const DIMENSOES_EMBEDDING = 256;
export const LIMIAR_PADRAO = 0.72;
export const EXEMPLOS_K = 4;
export const SIMILARIDADE_MINIMA = 0.12;

export const MODELO_HEURISTICO = 'heuristico-local';
export const MODELO_TRIAGEM_PADRAO = 'google/gemini-2.5-flash-lite';
export const MODELO_EMBEDDING_PADRAO = 'openai/text-embedding-3-small';
export const MODELOS_AVALIACAO_PADRAO = [
  'openai/gpt-5-nano',
  'google/gemini-2.5-flash-lite',
  'anthropic/claude-haiku-4.5',
] as const;
