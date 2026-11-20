CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS metadados (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exemplos (
  id TEXT PRIMARY KEY,
  texto_mascarado TEXT NOT NULL,
  categoria TEXT NOT NULL,
  prioridade TEXT NOT NULL,
  fila TEXT NOT NULL,
  embedding vector(256) NOT NULL
);

CREATE INDEX IF NOT EXISTS exemplos_embedding_idx
  ON exemplos USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS chamados (
  id UUID PRIMARY KEY,
  referencia_externa TEXT,
  hash_original TEXT NOT NULL,
  texto_mascarado TEXT NOT NULL,
  tipos_pii JSONB NOT NULL,
  categoria TEXT,
  prioridade TEXT,
  fila_prevista TEXT,
  fila_efetiva TEXT,
  confianca REAL,
  limiar REAL,
  justificativa TEXT,
  modelo TEXT,
  exemplos_usados JSONB NOT NULL DEFAULT '[]'::jsonb,
  tokens_entrada INTEGER NOT NULL DEFAULT 0,
  tokens_saida INTEGER NOT NULL DEFAULT 0,
  latencia_ms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  decisao_humana JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chamados_status_idx ON chamados (status, criado_em);

CREATE TABLE IF NOT EXISTS auditoria (
  id UUID PRIMARY KEY,
  chamado_id UUID REFERENCES chamados (id),
  evento TEXT NOT NULL,
  detalhe JSONB NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auditoria_chamado_idx ON auditoria (chamado_id, criado_em);
