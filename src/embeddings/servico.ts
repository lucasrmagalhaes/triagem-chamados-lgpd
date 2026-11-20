import { embed, embedMany } from 'ai';
import { DIMENSOES_EMBEDDING } from '../dominio/taxonomia';
import { assertSemPii } from '../mascaramento/mascaramento';
import { embeddingLocal } from './local';

export type ModoEmbedding = 'local' | 'gateway';

export class ServicoEmbedding {
  constructor(
    readonly modo: ModoEmbedding,
    readonly modelo: string,
    readonly dimensoes = DIMENSOES_EMBEDDING,
  ) {}

  async embed(textoMascarado: string): Promise<number[]> {
    assertSemPii(textoMascarado);
    if (this.modo === 'local') return embeddingLocal(textoMascarado, this.dimensoes);
    const { embedding } = await embed({
      model: this.modelo,
      value: textoMascarado,
      dimensions: this.dimensoes,
    });
    if (embedding.length !== this.dimensoes) {
      throw new Error(
        `O embedding retornou ${embedding.length} dimensoes e a coluna pgvector espera ${this.dimensoes}.`,
      );
    }
    return embedding;
  }

  async embedMuitos(textosMascarados: string[]): Promise<number[][]> {
    for (const texto of textosMascarados) assertSemPii(texto);
    if (textosMascarados.length === 0) return [];
    if (this.modo === 'local') {
      return textosMascarados.map((texto) => embeddingLocal(texto, this.dimensoes));
    }

    const vetores: number[][] = [];
    for (let i = 0; i < textosMascarados.length; i += 64) {
      const lote = textosMascarados.slice(i, i + 64);
      const { embeddings } = await embedMany({
        model: this.modelo,
        values: lote,
        dimensions: this.dimensoes,
      });
      for (const vetor of embeddings) {
        if (vetor.length !== this.dimensoes) {
          throw new Error(
            `O embedding retornou ${vetor.length} dimensoes e a coluna pgvector espera ${this.dimensoes}.`,
          );
        }
        vetores.push(vetor);
      }
    }
    return vetores;
  }
}
