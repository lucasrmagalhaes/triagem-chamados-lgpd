import { readFileSync } from 'node:fs';
import path from 'node:path';
import { esquemaRotulo, type ChamadoRotulado } from '../dominio/esquema';

export function caminhoDataset(nome = 'chamados.jsonl'): string {
  return path.join(process.cwd(), 'dataset', nome);
}

export function lerDataset(caminho = caminhoDataset()): ChamadoRotulado[] {
  const bruto = readFileSync(caminho, 'utf8').trim();
  if (!bruto) return [];
  return bruto.split('\n').map((linha) => esquemaRotulo.parse(JSON.parse(linha)));
}
