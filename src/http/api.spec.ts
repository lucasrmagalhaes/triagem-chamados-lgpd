import { NestFactory } from '@nestjs/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../app.module';
import { FiltroErros } from './filtro';

describe('API HTTP', () => {
  let base: string;
  let fechar: () => Promise<void>;

  beforeAll(async () => {
    delete process.env.DATABASE_URL;
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.LANGFUSE_PUBLIC_KEY;
    delete process.env.LANGFUSE_SECRET_KEY;
    process.env.FORCAR_HEURISTICA = 'true';
    process.env.USAR_EMBEDDING_GATEWAY = 'false';
    const app = await NestFactory.create(AppModule, { logger: false });
    app.useGlobalFilters(new FiltroErros());
    await app.listen(0);
    base = await app.getUrl();
    fechar = () => app.close();
  });

  afterAll(async () => {
    await fechar();
  });

  it('classifica, lista a revisao e nao devolve o CPF no erro', async () => {
    const saude = await fetch(`${base}/saude`);
    expect(saude.status).toBe(200);
    const corpoSaude = await saude.json();
    expect(corpoSaude.banco).toBe('memoria');
    expect(corpoSaude.exemplos).toBe('pronto');

    const invalido = await fetch(`${base}/chamados`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ texto: 'cpf', extra: '390.533.447-05' }),
    });
    expect(invalido.status).toBe(400);
    expect(await invalido.text()).not.toContain('390');

    const resposta = await fetch(`${base}/chamados`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        texto: 'o boleto eu ja quitei. o login que nao passa. preciso disso hoje. cpf 390.533.447-05',
        referenciaExterna: 'HD-22',
      }),
    });
    expect(resposta.status).toBe(201);
    const chamado = await resposta.json();
    expect(chamado.status).toBe('revisao');
    expect(chamado.filaEfetiva).toBe('fila_revisao');
    expect(chamado.textoMascarado).not.toContain('390');
    expect(chamado.referenciaExterna).toBe('HD-22');

    const fila = await fetch(`${base}/revisao`);
    const lista = await fila.json();
    expect(lista.some((item: { id: string }) => item.id === chamado.id)).toBe(true);

    const decisao = await fetch(`${base}/revisao/${chamado.id}/decisao`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        categoria: 'acesso',
        prioridade: 'alta',
        fila: 'fila_acessos',
        comentario: 'conferido com o cpf 390.533.447-05',
      }),
    });
    expect(decisao.status).toBe(201);
    const decidido = await decisao.json();
    expect(decidido.status).toBe('decidido');
    expect(decidido.decisaoHumana.comentario).not.toContain('390');
    expect(decidido.filaEfetiva).toBe('fila_acessos');

    const auditoria = await fetch(`${base}/auditoria?chamadoId=${chamado.id}`);
    const eventos = await auditoria.json();
    expect(eventos.map((evento: { evento: string }) => evento.evento)).toEqual([
      'encaminhado_revisao',
      'decisao_humana',
    ]);
    expect(JSON.stringify(eventos)).not.toContain('390');
  });
});
