import { Module } from '@nestjs/common';
import { comporAplicacao, type Aplicacao } from './composicao';
import { AuditoriaController, ChamadosController, RevisaoController, SaudeController } from './http/controladores';
import { TriagemService } from './triagem/pipeline';

export const APLICACAO = Symbol('APLICACAO');

@Module({
  controllers: [ChamadosController, RevisaoController, AuditoriaController, SaudeController],
  providers: [
    {
      provide: APLICACAO,
      useFactory: () => comporAplicacao(),
    },
    {
      provide: TriagemService,
      useFactory: (aplicacao: Aplicacao) => aplicacao.triagem,
      inject: [APLICACAO],
    },
  ],
})
export class AppModule {}
