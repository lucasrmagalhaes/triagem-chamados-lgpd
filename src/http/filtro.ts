import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response } from 'express';
import { ZodError } from 'zod';

type RespostaHttp = Response;

@Catch()
export class FiltroErros implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const resposta = host.switchToHttp().getResponse<RespostaHttp>();
    if (exception instanceof ZodError) {
      resposta.status(400).json({
        status: 400,
        mensagem: 'corpo invalido',
        campos: exception.issues.map((issue) => issue.path.join('.')),
      });
      return;
    }
    if (exception instanceof HttpException) {
      resposta.status(exception.getStatus()).json({
        status: exception.getStatus(),
        mensagem: 'requisicao recusada',
      });
      return;
    }
    const status = statusDe(exception);
    const mensagem = exception instanceof Error ? exception.message : 'erro interno';
    resposta.status(status).json({ status, mensagem });
  }
}

function statusDe(exception: unknown): number {
  if (typeof exception === 'object' && exception && 'status' in exception) {
    const status = Number((exception as { status: unknown }).status);
    if (status >= 400 && status < 600) return status;
  }
  return 500;
}
