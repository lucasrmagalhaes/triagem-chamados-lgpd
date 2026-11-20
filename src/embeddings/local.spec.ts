import { describe, expect, it } from 'vitest';
import { DIMENSOES_EMBEDDING } from '../dominio/taxonomia';
import { embeddingLocal, similaridadeCosseno } from './local';
import { ServicoEmbedding } from './servico';

describe('embedding local', () => {
  it('aproxima textos parecidos e recusa dado pessoal', async () => {
    const senha = embeddingLocal('nao consigo login, a senha fica invalida', DIMENSOES_EMBEDDING);
    const acesso = embeddingLocal('o login e a senha do portal nao entram', DIMENSOES_EMBEDDING);
    const boleto = embeddingLocal('o boleto venceu e o pix nao compensou', DIMENSOES_EMBEDDING);
    expect(senha).toHaveLength(DIMENSOES_EMBEDDING);
    expect(similaridadeCosseno(senha, acesso)).toBeGreaterThan(similaridadeCosseno(senha, boleto));

    const servico = new ServicoEmbedding('local', 'openai/text-embedding-3-small');
    await expect(servico.embed('cpf 390.533.447-05')).rejects.toThrow(/dados pessoais/i);
  });
});
