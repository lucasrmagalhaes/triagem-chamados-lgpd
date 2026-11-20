import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Pool, type QueryResultRow } from 'pg';
import { SIMILARIDADE_MINIMA } from '../dominio/taxonomia';
import type { Categoria, FilaModelo, Prioridade } from '../dominio/taxonomia';
import type { TipoPii } from '../mascaramento/mascaramento';
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

export class BancoPostgres implements Banco {
  estadoExemplos: EstadoExemplos = 'vazio';
  identificadorEmbedding = '';

  constructor(private readonly pool: Pool) {}

  static async conectar(databaseUrl: string, identificadorEsperado: string): Promise<BancoPostgres> {
    const pool = new Pool({ connectionString: databaseUrl });
    const banco = new BancoPostgres(pool);
    const sql = readFileSync(path.join(process.cwd(), 'sql/migracao.sql'), 'utf8');
    await pool.query(sql);
    const meta = await pool.query<{ valor: string }>('SELECT valor FROM metadados WHERE chave = $1', [
      'modelo_embedding',
    ]);
    const contagem = await pool.query<{ n: number }>('SELECT count(*)::int AS n FROM exemplos');
    const total = contagem.rows[0]?.n ?? 0;
    const guardado = meta.rows[0]?.valor ?? '';
    banco.identificadorEmbedding = guardado;
    if (total === 0) banco.estadoExemplos = 'vazio';
    else if (guardado === identificadorEsperado) banco.estadoExemplos = 'pronto';
    else banco.estadoExemplos = 'incompativel';
    return banco;
  }

  async buscarExemplos(vetor: number[], limite: number): Promise<ExemploSimilar[]> {
    if (this.estadoExemplos !== 'pronto') return [];
    const consulta = vetorLiteral(vetor);
    const { rows } = await this.pool.query<{
      id: string;
      texto_mascarado: string;
      categoria: Categoria;
      prioridade: Prioridade;
      fila: FilaModelo;
      similaridade: number;
    }>(
      `SELECT id, texto_mascarado, categoria, prioridade, fila,
              1 - (embedding <=> $1::vector) AS similaridade
       FROM exemplos
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [consulta, limite],
    );
    return rows
      .filter((linha) => Number(linha.similaridade) >= SIMILARIDADE_MINIMA)
      .map((linha) => ({
        id: linha.id,
        textoMascarado: linha.texto_mascarado,
        categoria: linha.categoria,
        prioridade: linha.prioridade,
        fila: linha.fila,
        similaridade: Number(linha.similaridade),
      }));
  }

  async substituirExemplos(itens: ExemploGravado[], identificadorEmbedding: string): Promise<void> {
    const cliente = await this.pool.connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query('DELETE FROM exemplos');
      for (const item of itens) {
        await cliente.query(
          `INSERT INTO exemplos (id, texto_mascarado, categoria, prioridade, fila, embedding)
           VALUES ($1, $2, $3, $4, $5, $6::vector)`,
          [item.id, item.textoMascarado, item.categoria, item.prioridade, item.fila, vetorLiteral(item.embedding)],
        );
      }
      await cliente.query(
        `INSERT INTO metadados (chave, valor) VALUES ('modelo_embedding', $1)
         ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor`,
        [identificadorEmbedding],
      );
      await cliente.query('COMMIT');
    } catch (erro) {
      await cliente.query('ROLLBACK');
      throw erro;
    } finally {
      cliente.release();
    }
    this.identificadorEmbedding = identificadorEmbedding;
    this.estadoExemplos = itens.length === 0 ? 'vazio' : 'pronto';
  }

  async inserirChamado(registro: RegistroChamado): Promise<void> {
    await this.pool.query(
      `INSERT INTO chamados (
         id, referencia_externa, hash_original, texto_mascarado, tipos_pii, categoria, prioridade,
         fila_prevista, fila_efetiva, confianca, limiar, justificativa, modelo, exemplos_usados,
         tokens_entrada, tokens_saida, latencia_ms, status, decisao_humana, criado_em, atualizado_em
       ) VALUES (
         $1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb,
         $15, $16, $17, $18, $19::jsonb, $20, $21
       )`,
      [
        registro.id,
        registro.referenciaExterna,
        registro.hashOriginal,
        registro.textoMascarado,
        JSON.stringify(registro.tiposPii),
        registro.categoria,
        registro.prioridade,
        registro.filaPrevista,
        registro.filaEfetiva,
        registro.confianca,
        registro.limiar,
        registro.justificativa,
        registro.modelo,
        JSON.stringify(registro.exemplosUsados),
        registro.tokensEntrada,
        registro.tokensSaida,
        registro.latenciaMs,
        registro.status,
        registro.decisaoHumana ? JSON.stringify(registro.decisaoHumana) : null,
        registro.criadoEm,
        registro.atualizadoEm,
      ],
    );
  }

  async obterChamado(id: string): Promise<RegistroChamado | undefined> {
    const { rows } = await this.pool.query('SELECT * FROM chamados WHERE id = $1', [id]);
    return rows[0] ? mapearChamado(rows[0]) : undefined;
  }

  async listarChamados(status: StatusChamado, limite: number): Promise<RegistroChamado[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM chamados WHERE status = $1 ORDER BY criado_em ASC LIMIT $2',
      [status, limite],
    );
    return rows.map(mapearChamado);
  }

  async decidirChamado(id: string, decisao: DecisaoHumana, filaEfetiva: FilaModelo): Promise<void> {
    await this.pool.query(
      `UPDATE chamados
       SET decisao_humana = $2::jsonb, fila_efetiva = $3, status = 'decidido', atualizado_em = now()
       WHERE id = $1`,
      [id, JSON.stringify(decisao), filaEfetiva],
    );
  }

  async registrarAuditoria(evento: RegistroAuditoria): Promise<void> {
    await this.pool.query(
      `INSERT INTO auditoria (id, chamado_id, evento, detalhe, criado_em)
       VALUES ($1, $2, $3, $4::jsonb, $5)`,
      [evento.id, evento.chamadoId, evento.evento, JSON.stringify(evento.detalhe), evento.criadoEm],
    );
  }

  async listarAuditoria(chamadoId: string | undefined, limite: number): Promise<RegistroAuditoria[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM auditoria
       WHERE ($1::uuid IS NULL OR chamado_id = $1::uuid)
       ORDER BY criado_em ASC
       LIMIT $2`,
      [chamadoId ?? null, limite],
    );
    return rows.map((linha) => ({
      id: String(linha.id),
      chamadoId: linha.chamado_id ? String(linha.chamado_id) : null,
      evento: String(linha.evento),
      detalhe: (linha.detalhe ?? {}) as Record<string, unknown>,
      criadoEm: new Date(linha.criado_em as string).toISOString(),
    }));
  }

  async fechar(): Promise<void> {
    await this.pool.end();
  }
}

function vetorLiteral(vetor: number[]): string {
  return `[${vetor.map((valor) => Number(valor).toString()).join(',')}]`;
}

function mapearChamado(linha: QueryResultRow): RegistroChamado {
  return {
    id: String(linha.id),
    referenciaExterna: linha.referencia_externa ? String(linha.referencia_externa) : null,
    hashOriginal: String(linha.hash_original),
    textoMascarado: String(linha.texto_mascarado),
    tiposPii: linha.tipos_pii as TipoPii[],
    categoria: linha.categoria as Categoria,
    prioridade: linha.prioridade as Prioridade,
    filaPrevista: linha.fila_prevista as FilaModelo,
    filaEfetiva: linha.fila_efetiva as RegistroChamado['filaEfetiva'],
    confianca: Number(linha.confianca),
    limiar: Number(linha.limiar),
    justificativa: String(linha.justificativa ?? ''),
    modelo: String(linha.modelo ?? ''),
    exemplosUsados: (linha.exemplos_usados ?? []) as string[],
    tokensEntrada: Number(linha.tokens_entrada ?? 0),
    tokensSaida: Number(linha.tokens_saida ?? 0),
    latenciaMs: Number(linha.latencia_ms ?? 0),
    status: linha.status as StatusChamado,
    decisaoHumana: (linha.decisao_humana ?? null) as DecisaoHumana | null,
    criadoEm: new Date(linha.criado_em as string).toISOString(),
    atualizadoEm: new Date(linha.atualizado_em as string).toISOString(),
  };
}
