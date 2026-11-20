import { describe, expect, it } from 'vitest';
import { resumirTarefa } from './metricas';
import { estimarCustoUsd } from './precos';

describe('metricas', () => {
  it('calcula precisao, recall, F1 e matriz', () => {
    const resumo = resumirTarefa(['a', 'a', 'b', 'b'], ['a', 'b', 'b', 'b'], ['a', 'b']);
    expect(resumo.acuracia).toBe(0.75);
    expect(resumo.matriz.linhas).toEqual([
      [1, 1],
      [0, 2],
    ]);
    const classeA = resumo.porClasse.find((item) => item.classe === 'a');
    const classeB = resumo.porClasse.find((item) => item.classe === 'b');
    expect(classeA?.precisao).toBe(1);
    expect(classeA?.recall).toBe(0.5);
    expect(classeA?.f1).toBeCloseTo(2 / 3);
    expect(classeB?.precisao).toBeCloseTo(2 / 3);
    expect(classeB?.recall).toBe(1);
    expect(classeB?.f1).toBeCloseTo(0.8);
    expect(resumo.f1Macro).toBeCloseTo((2 / 3 + 0.8) / 2);
  });

  it('estima custo com o preco por token do catalogo', () => {
    const custo = estimarCustoUsd('openai/gpt-5-nano', 1_000_000, 1_000_000);
    expect(custo).toBeCloseTo(0.05 + 0.4);
    expect(estimarCustoUsd('modelo-desconhecido', 10, 10)).toBeNull();
  });
});
