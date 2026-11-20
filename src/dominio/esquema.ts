import { z } from 'zod';
import { CATEGORIAS, FILAS_MODELO, PRIORIDADES, SPLITS, TIPOS_AMOSTRA } from './taxonomia';

export const esquemaTriagem = z.object({
  categoria: z.enum(CATEGORIAS),
  prioridade: z.enum(PRIORIDADES),
  fila: z.enum(FILAS_MODELO),
  confianca: z.number().min(0).max(1),
  justificativa: z.string().min(1).max(400),
});

export type SaidaModelo = z.infer<typeof esquemaTriagem>;

export const esquemaCriarChamado = z.object({
  texto: z.string().trim().min(5).max(4000),
  referenciaExterna: z.string().trim().min(1).max(80).optional(),
});

export const esquemaDecisao = z.object({
  categoria: z.enum(CATEGORIAS),
  prioridade: z.enum(PRIORIDADES),
  fila: z.enum(FILAS_MODELO),
  comentario: z.string().trim().max(500).optional(),
});

export const esquemaRotulo = z.object({
  id: z.string(),
  texto: z.string().min(1),
  categoria: z.enum(CATEGORIAS),
  prioridade: z.enum(PRIORIDADES),
  fila: z.enum(FILAS_MODELO),
  ambiguo: z.boolean(),
  tipo: z.enum(TIPOS_AMOSTRA),
  split: z.enum(SPLITS),
});

export type ChamadoRotulado = z.infer<typeof esquemaRotulo>;
