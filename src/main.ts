import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { carregarArquivoEnv, carregarConfig } from './config';
import { FiltroErros } from './http/filtro';
import { encerrarObservabilidade, iniciarObservabilidade } from './observabilidade/langfuse';

async function bootstrap(): Promise<void> {
  carregarArquivoEnv();
  await iniciarObservabilidade();
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new FiltroErros());
  app.enableShutdownHooks();
  const config = carregarConfig();
  await app.listen(config.port);
  console.log(`triagem ouvindo na porta ${config.port}`);
}

process.once('SIGTERM', () => {
  void encerrarObservabilidade();
});

bootstrap().catch((erro: unknown) => {
  console.error(erro);
  process.exit(1);
});
