import type { ChamadoRotulado } from '../dominio/esquema';
import { CATEGORIAS, FILAS_MODELO, PRIORIDADES, TIPOS_AMOSTRA } from '../dominio/taxonomia';
import type { AgenteTriagem } from '../agente/tipos';
import { resumirTarefa, type ResumoTarefa } from './metricas';
import { estimarCustoUsd, type PrecoModelo } from './precos';

export type ItemAvaliado = {
  id: string;
  tipo: ChamadoRotulado['tipo'];
  confianca: number;
  latenciaMs: number;
  tokensEntrada: number;
  tokensSaida: number;
  gold: { categoria: string; prioridade: string; fila: string };
  pred: { categoria: string; prioridade: string; fila: string };
};

export type ResumoModelo = {
  modelo: string;
  modo: 'heuristico' | 'gateway';
  n: number;
  latenciaMediaMs: number;
  tokensEntrada: number;
  tokensSaida: number;
  custoEstimadoUsd: number | null;
  taxaRevisao: number;
  acuraciaCategoriaAcimaDoLimiar: number | null;
  acuraciaCategoriaAbaixoDoLimiar: number | null;
  categoria: ResumoTarefa;
  prioridade: ResumoTarefa;
  fila: ResumoTarefa;
  porTipo: Record<string, { n: number; acuraciaCategoria: number }>;
};

export async function avaliarAgente(opcoes: {
  agente: AgenteTriagem;
  holdout: ChamadoRotulado[];
  limiar: number;
  modo: 'heuristico' | 'gateway';
  classificar: (item: ChamadoRotulado) => Promise<ItemAvaliado>;
  precos?: Record<string, PrecoModelo>;
}): Promise<ResumoModelo> {
  const itens: ItemAvaliado[] = [];
  for (const item of opcoes.holdout) itens.push(await opcoes.classificar(item));
  return resumirAvaliacao(opcoes.agente.modelo, opcoes.modo, itens, opcoes.limiar, opcoes.precos);
}

export function resumirAvaliacao(
  modelo: string,
  modo: 'heuristico' | 'gateway',
  itens: ItemAvaliado[],
  limiar: number,
  precos?: Record<string, PrecoModelo>,
): ResumoModelo {
  const tokensEntrada = itens.reduce((soma, item) => soma + item.tokensEntrada, 0);
  const tokensSaida = itens.reduce((soma, item) => soma + item.tokensSaida, 0);
  const acima = itens.filter((item) => item.confianca >= limiar);
  const abaixo = itens.filter((item) => item.confianca < limiar);
  const porTipo: ResumoModelo['porTipo'] = {};
  for (const tipo of TIPOS_AMOSTRA) {
    const fatia = itens.filter((item) => item.tipo === tipo);
    porTipo[tipo] = {
      n: fatia.length,
      acuraciaCategoria: acuracia(fatia, 'categoria'),
    };
  }

  return {
    modelo,
    modo,
    n: itens.length,
    latenciaMediaMs: itens.length === 0 ? 0 : itens.reduce((soma, item) => soma + item.latenciaMs, 0) / itens.length,
    tokensEntrada,
    tokensSaida,
    custoEstimadoUsd: estimarCustoUsd(modelo, tokensEntrada, tokensSaida, precos),
    taxaRevisao: itens.length === 0 ? 0 : abaixo.length / itens.length,
    acuraciaCategoriaAcimaDoLimiar: acima.length === 0 ? null : acuracia(acima, 'categoria'),
    acuraciaCategoriaAbaixoDoLimiar: abaixo.length === 0 ? null : acuracia(abaixo, 'categoria'),
    categoria: resumirTarefa(
      itens.map((item) => item.gold.categoria),
      itens.map((item) => item.pred.categoria),
      CATEGORIAS,
    ),
    prioridade: resumirTarefa(
      itens.map((item) => item.gold.prioridade),
      itens.map((item) => item.pred.prioridade),
      PRIORIDADES,
    ),
    fila: resumirTarefa(
      itens.map((item) => item.gold.fila),
      itens.map((item) => item.pred.fila),
      FILAS_MODELO,
    ),
    porTipo,
  };
}

function acuracia(itens: ItemAvaliado[], campo: 'categoria' | 'prioridade' | 'fila'): number {
  if (itens.length === 0) return 0;
  const acertos = itens.filter((item) => item.gold[campo] === item.pred[campo]).length;
  return acertos / itens.length;
}
