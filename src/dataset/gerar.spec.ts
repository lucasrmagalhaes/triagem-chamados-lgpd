import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { classificarHeuristico } from '../agente/heuristico';
import { filaPorPolitica } from '../agente/politica';
import { assertSemPii, detectarPii, mascararTexto } from '../mascaramento/mascaramento';
import { FECHOS_PROIBIDOS } from './frases';
import { lerDataset } from './ler';
import { gerarDataset } from './gerar';

describe('dataset sintetico', () => {
  const itens = gerarDataset();

  it('tem 300 chamados com rotulo, fila da politica e os dois splits', () => {
    expect(itens).toHaveLength(300);
    expect(new Set(itens.map((item) => item.id)).size).toBe(300);
    expect(new Set(itens.map((item) => item.texto)).size).toBe(300);
    expect(itens.some((item) => item.split === 'treino')).toBe(true);
    expect(itens.some((item) => item.split === 'avaliacao')).toBe(true);
    for (const item of itens) {
      expect(item.fila).toBe(filaPorPolitica(item.categoria, item.texto, item.prioridade));
      expect(() => assertSemPii(mascararTexto(item.texto).texto)).not.toThrow();
    }
  });

  it('varia tamanho, giria, mistura e ambiguidade sem fecho explicito de prioridade', () => {
    const tamanhos = itens.map((item) => item.texto.length);
    const girias = ['mano', 'vei ', 'naum', 'tbm', ' sla', ' kk', 'aff'];
    const contar = (tipo: string) => itens.filter((item) => item.tipo === tipo).length;

    expect(Math.min(...tamanhos)).toBeLessThan(90);
    expect(Math.max(...tamanhos)).toBeGreaterThan(320);
    expect(tamanhos.filter((tamanho) => tamanho < 140).length).toBeGreaterThan(25);
    expect(tamanhos.filter((tamanho) => tamanho > 280).length).toBeGreaterThan(25);
    expect(itens.filter((item) => girias.some((marca) => item.texto.includes(marca))).length).toBeGreaterThan(40);
    expect(contar('direto')).toBeGreaterThan(120);
    expect(contar('misto')).toBeGreaterThan(60);
    expect(contar('ambiguo')).toBeGreaterThan(40);
    expect(itens.filter((item) => detectarPii(item.texto).length > 0).length).toBeGreaterThan(50);

    for (const item of itens) {
      for (const fecho of FECHOS_PROIBIDOS) {
        expect(item.texto.includes(fecho), `${item.id} ${fecho}`).toBe(false);
      }
    }
  });

  it('nao entrega a prioridade de bandeja para o baseline lexical', () => {
    let acertoCategoria = 0;
    let acertoPrioridade = 0;
    for (const item of itens) {
      const pred = classificarHeuristico(mascararTexto(item.texto).texto);
      if (pred.categoria === item.categoria) acertoCategoria += 1;
      if (pred.prioridade === item.prioridade) acertoPrioridade += 1;
    }
    const categoria = acertoCategoria / itens.length;
    const prioridade = acertoPrioridade / itens.length;
    expect(categoria).toBeGreaterThan(0.35);
    expect(categoria).toBeLessThan(0.9);
    expect(prioridade).toBeLessThan(0.8);
  });

  it('esta versionado igual ao gerador', () => {
    const arquivo = lerDataset();
    expect(arquivo).toEqual(itens);
    expect(readFileSync('sql/migracao.sql', 'utf8')).toContain('vector(256)');
  });
});
