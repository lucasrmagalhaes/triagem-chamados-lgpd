import type { Categoria, Prioridade } from '../dominio/taxonomia';
import { CATEGORIAS, MODELO_HEURISTICO } from '../dominio/taxonomia';
import { indiceTermo, normalizar } from '../dominio/texto';
import type { ExemploSimilar, ResultadoModelo } from './tipos';
import { filaPorPolitica } from './politica';
import { TERMOS_CATEGORIA, TERMOS_PRIORIDADE } from './sinais';

export type DiagnosticoHeuristico = {
  categoria: Categoria;
  prioridade: Prioridade;
  confianca: number;
  margem: number;
  pontos: Record<Categoria, number>;
};

export function diagnosticar(texto: string): DiagnosticoHeuristico {
  const base = normalizar(texto);
  const pontos = Object.fromEntries(
    CATEGORIAS.map((categoria) => [categoria, pontuar(base, TERMOS_CATEGORIA[categoria]).pontos]),
  ) as Record<Categoria, number>;
  const ranking = CATEGORIAS.map((categoria) => ({
    categoria,
    pontos: pontos[categoria],
    primeiro: pontuar(base, TERMOS_CATEGORIA[categoria]).primeiro,
  })).sort((a, b) => b.pontos - a.pontos || a.primeiro - b.primeiro || a.categoria.localeCompare(b.categoria));

  const melhor = ranking[0];
  const segundo = ranking[1];
  const margem =
    melhor.pontos === 0 ? 0 : (melhor.pontos - segundo.pontos) / (melhor.pontos + segundo.pontos + 1);
  const confianca = melhor.pontos === 0 ? 0.3 : arredondar(0.42 + margem * 0.55);
  return {
    categoria: melhor.pontos === 0 ? 'duvida' : melhor.categoria,
    prioridade: prioridadePorSinais(base),
    confianca,
    margem,
    pontos,
  };
}

export function classificarHeuristico(textoMascarado: string, exemplos: ExemploSimilar[] = []): ResultadoModelo {
  const diagnostico = diagnosticar(textoMascarado);
  const fila = filaPorPolitica(diagnostico.categoria, textoMascarado, diagnostico.prioridade);
  const concorrente = CATEGORIAS.filter((categoria) => categoria !== diagnostico.categoria).sort(
    (a, b) => diagnostico.pontos[b] - diagnostico.pontos[a],
  )[0];
  return {
    categoria: diagnostico.categoria,
    prioridade: diagnostico.prioridade,
    fila,
    confianca: diagnostico.confianca,
    justificativa: `Sinais de ${diagnostico.categoria} com margem ${diagnostico.margem.toFixed(2)} sobre ${concorrente}. Prioridade ${diagnostico.prioridade}.`,
    modelo: MODELO_HEURISTICO,
    tokensEntrada: 0,
    tokensSaida: 0,
    exemplosUsados: exemplos.map((exemplo) => exemplo.id),
  };
}

export class AgenteHeuristico {
  readonly modelo = MODELO_HEURISTICO;

  async classificar(entrada: { textoMascarado: string; exemplos: ExemploSimilar[] }): Promise<ResultadoModelo> {
    return classificarHeuristico(entrada.textoMascarado, entrada.exemplos);
  }
}

function prioridadePorSinais(texto: string): Prioridade {
  if (TERMS_PRESENTES(texto, TERMOS_PRIORIDADE.urgente)) return 'urgente';
  if (TERMS_PRESENTES(texto, TERMOS_PRIORIDADE.alta)) return 'alta';
  if (TERMS_PRESENTES(texto, TERMOS_PRIORIDADE.baixa)) return 'baixa';
  return 'media';
}

function TERMS_PRESENTES(texto: string, termos: string[]): boolean {
  return termos.some((termo) => indiceTermo(texto, termo) >= 0);
}

function pontuar(texto: string, termos: string[]): { pontos: number; primeiro: number } {
  let pontos = 0;
  let primeiro = Number.POSITIVE_INFINITY;
  for (const termo of termos) {
    const indice = indiceTermo(texto, termo);
    if (indice < 0) continue;
    pontos += 1;
    if (indice < primeiro) primeiro = indice;
  }
  return { pontos, primeiro };
}

function arredondar(valor: number): number {
  return Math.round(Math.min(0.97, Math.max(0.3, valor)) * 1000) / 1000;
}
