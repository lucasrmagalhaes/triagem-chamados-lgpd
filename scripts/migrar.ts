import { carregarArquivoEnv, carregarConfig } from '../src/config';
import { BancoPostgres } from '../src/persistencia/postgres';
import { identificadorEmbedding } from '../src/config';

async function main(): Promise<void> {
  carregarArquivoEnv();
  const config = carregarConfig();
  if (!config.databaseUrl) {
    console.error('Defina DATABASE_URL para aplicar sql/migracao.sql.');
    process.exit(1);
  }
  const banco = await BancoPostgres.conectar(config.databaseUrl, identificadorEmbedding(config));
  console.log(`migracao aplicada. exemplos: ${banco.estadoExemplos}`);
  await banco.fechar();
}

main().catch((erro: unknown) => {
  console.error(erro);
  process.exit(1);
});
