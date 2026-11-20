import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  DIMENSOES_EMBEDDING,
  LIMIAR_PADRAO,
  MODELO_EMBEDDING_PADRAO,
  MODELO_TRIAGEM_PADRAO,
  MODELOS_AVALIACAO_PADRAO,
} from './dominio/taxonomia';

export type ConfigApp = {
  port: number;
  databaseUrl?: string;
  limiar: number;
  modeloTriagem: string;
  modeloEmbedding: string;
  dimensoes: number;
  chaveGateway?: string;
  usarEmbeddingGateway: boolean;
  modelosAvaliacao: string[];
  avaliacaoReal: boolean;
  langfuse: boolean;
  registrarConteudo: boolean;
  forcarHeuristica: boolean;
};

export function carregarArquivoEnv(caminho = path.join(process.cwd(), '.env')): void {
  if (!existsSync(caminho)) return;
  for (const linha of readFileSync(caminho, 'utf8').split('\n')) {
    const texto = linha.trim();
    if (!texto || texto.startsWith('#')) continue;
    const separador = texto.indexOf('=');
    if (separador < 0) continue;
    const chave = texto.slice(0, separador).trim();
    const valor = texto.slice(separador + 1).trim();
    if (process.env[chave] === undefined) process.env[chave] = valor;
  }
}

export function carregarConfig(env: NodeJS.ProcessEnv = process.env): ConfigApp {
  const limiar = Number(env.LIMIAR_CONFIANCA ?? LIMIAR_PADRAO);
  if (!Number.isFinite(limiar) || limiar <= 0 || limiar >= 1) {
    throw new Error('LIMIAR_CONFIANCA deve ser um numero entre 0 e 1.');
  }
  const chaveGateway = env.AI_GATEWAY_API_KEY?.trim() || undefined;
  return {
    port: Number(env.PORT ?? 3000),
    databaseUrl: env.DATABASE_URL?.trim() || undefined,
    limiar,
    modeloTriagem: env.MODELO_TRIAGEM?.trim() || MODELO_TRIAGEM_PADRAO,
    modeloEmbedding: env.MODELO_EMBEDDING?.trim() || MODELO_EMBEDDING_PADRAO,
    dimensoes: DIMENSOES_EMBEDDING,
    chaveGateway,
    usarEmbeddingGateway: env.USAR_EMBEDDING_GATEWAY === 'true',
    modelosAvaliacao: (env.AVALIACAO_MODELOS || MODELOS_AVALIACAO_PADRAO.join(','))
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    avaliacaoReal: env.AVALIACAO_REAL === 'true',
    langfuse: Boolean(env.LANGFUSE_PUBLIC_KEY && env.LANGFUSE_SECRET_KEY),
    registrarConteudo: env.LANGFUSE_REGISTRAR_CONTEUDO !== 'false',
    forcarHeuristica: env.FORCAR_HEURISTICA === 'true' || !chaveGateway,
  };
}

export function identificadorEmbedding(config: ConfigApp): string {
  if (!config.usarEmbeddingGateway) return 'local/hash-256';
  return `${config.modeloEmbedding}@${config.dimensoes}`;
}
