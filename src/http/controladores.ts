import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import { esquemaCriarChamado, esquemaDecisao } from '../dominio/esquema';
import { TriagemService } from '../triagem/pipeline';

@Controller('chamados')
export class ChamadosController {
  constructor(@Inject(TriagemService) private readonly triagem: TriagemService) {}

  @Post()
  criar(@Body() corpo: unknown) {
    return this.triagem.triar(esquemaCriarChamado.parse(corpo));
  }

  @Get(':id')
  obter(@Param('id') id: string) {
    return this.triagem.obter(id);
  }
}

@Controller('revisao')
export class RevisaoController {
  constructor(@Inject(TriagemService) private readonly triagem: TriagemService) {}

  @Get()
  listar(@Query('limite') limite?: string) {
    return this.triagem.listarRevisao(limiteSeguro(limite));
  }

  @Post(':id/decisao')
  decidir(@Param('id') id: string, @Body() corpo: unknown) {
    return this.triagem.decidir(id, esquemaDecisao.parse(corpo));
  }
}

@Controller('auditoria')
export class AuditoriaController {
  constructor(@Inject(TriagemService) private readonly triagem: TriagemService) {}

  @Get()
  listar(@Query('chamadoId') chamadoId?: string, @Query('limite') limite?: string) {
    return this.triagem.listarAuditoria(chamadoId, limiteSeguro(limite));
  }
}

@Controller('saude')
export class SaudeController {
  constructor(@Inject(TriagemService) private readonly triagem: TriagemService) {}

  @Get()
  saude() {
    return this.triagem.descrever();
  }
}

function limiteSeguro(valor: string | undefined): number {
  const numero = Number(valor ?? 50);
  if (!Number.isFinite(numero) || numero <= 0) return 50;
  return Math.min(Math.floor(numero), 200);
}
