import { carregarArquivoEnv, carregarConfig, identificadorEmbedding } from '../src/config';
import { lerDataset } from '../src/dataset/ler';
import { ServicoEmbedding } from '../src/embeddings/servico';
import { carregarExemplos } from '../src/composicao';
import { BancoPostgres } from '../src/persistencia/postgres';

async function main(): Promise<void> {
  carregarArquivoEnv();
  const config = carregarConfig();
  if (!config.databaseUrl) {
    console.error('Defina DATABASE_URL. O seed grava apenas o texto mascarado.');
    process.exit(1);
  }
  const embeddings = new ServicoEmbedding(
    config.usarEmbeddingGateway ? 'gateway' : 'local',
    config.modeloEmbedding,
    config.dimensoes,
  );
  const banco = await BancoPostgres.conectar(config.databaseUrl, identificadorEmbedding(config));
  const treino = lerDataset().filter((item) => item.split === 'treino');
  const exemplos = await carregarExemplos(treino, embeddings);
  await banco.substituirExemplos(exemplos, identificadorEmbedding(config));
  console.log(`seed gravou ${exemplos.length} exemplos mascarados com ${identificadorEmbedding(config)}`);
  await banco.fechar();
}

main().catch((erro: unknown) => {
  console.error(erro);
  process.exit(1);
});
