import type { Categoria, FilaModelo, Prioridade } from '../dominio/taxonomia';

export type ExemploSimilar = {
  id: string;
  textoMascarado: string;
  categoria: Categoria;
  prioridade: Prioridade;
  fila: FilaModelo;
  similaridade: number;
};

export type ResultadoModelo = {
  categoria: Categoria;
  prioridade: Prioridade;
  fila: FilaModelo;
  confianca: number;
  justificativa: string;
  modelo: string;
  tokensEntrada: number;
  tokensSaida: number;
  exemplosUsados: string[];
};

export interface AgenteTriagem {
  readonly modelo: string;
  classificar(entrada: { textoMascarado: string; exemplos: ExemploSimilar[] }): Promise<ResultadoModelo>;
}
