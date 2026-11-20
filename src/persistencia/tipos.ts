import type { Categoria, FilaEfetiva, FilaModelo, Prioridade } from '../dominio/taxonomia';
import type { TipoPii } from '../mascaramento/mascaramento';
import type { ExemploSimilar } from '../agente/tipos';

export type StatusChamado = 'classificado' | 'revisao' | 'decidido';
export type EstadoExemplos = 'pronto' | 'vazio' | 'incompativel';

export type ExemploGravado = {
  id: string;
  textoMascarado: string;
  categoria: Categoria;
  prioridade: Prioridade;
  fila: FilaModelo;
  embedding: number[];
};

export type DecisaoHumana = {
  categoria: Categoria;
  prioridade: Prioridade;
  fila: FilaModelo;
  comentario?: string;
};

export type RegistroChamado = {
  id: string;
  referenciaExterna: string | null;
  hashOriginal: string;
  textoMascarado: string;
  tiposPii: TipoPii[];
  categoria: Categoria;
  prioridade: Prioridade;
  filaPrevista: FilaModelo;
  filaEfetiva: FilaEfetiva;
  confianca: number;
  limiar: number;
  justificativa: string;
  modelo: string;
  exemplosUsados: string[];
  tokensEntrada: number;
  tokensSaida: number;
  latenciaMs: number;
  status: StatusChamado;
  decisaoHumana: DecisaoHumana | null;
  criadoEm: string;
  atualizadoEm: string;
};

export type RegistroAuditoria = {
  id: string;
  chamadoId: string | null;
  evento: string;
  detalhe: Record<string, unknown>;
  criadoEm: string;
};

export interface Banco {
  readonly estadoExemplos: EstadoExemplos;
  readonly identificadorEmbedding: string;
  buscarExemplos(vetor: number[], limite: number): Promise<ExemploSimilar[]>;
  substituirExemplos(itens: ExemploGravado[], identificadorEmbedding: string): Promise<void>;
  inserirChamado(registro: RegistroChamado): Promise<void>;
  obterChamado(id: string): Promise<RegistroChamado | undefined>;
  listarChamados(status: StatusChamado, limite: number): Promise<RegistroChamado[]>;
  decidirChamado(id: string, decisao: DecisaoHumana, filaEfetiva: FilaModelo): Promise<void>;
  registrarAuditoria(evento: RegistroAuditoria): Promise<void>;
  listarAuditoria(chamadoId: string | undefined, limite: number): Promise<RegistroAuditoria[]>;
  fechar(): Promise<void>;
}
