import { normalizar } from '../dominio/texto';

export function embeddingLocal(texto: string, dimensoes: number): number[] {
  const vetor = new Array<number>(dimensoes).fill(0);
  const base = normalizar(texto);
  const tokens = base.split(/[^a-z0-9]+/).filter((token) => token.length >= 3);
  const pecas = [...tokens];
  for (let i = 0; i < tokens.length - 1; i += 1) pecas.push(`${tokens[i]}_${tokens[i + 1]}`);
  for (let i = 0; i < base.length - 2; i += 1) pecas.push(base.slice(i, i + 3));

  for (const peca of pecas) {
    const hash = hash32(peca);
    vetor[hash % dimensoes] += 1;
    vetor[(hash >>> 8) % dimensoes] += 0.5;
  }

  let norma = 0;
  for (const valor of vetor) norma += valor * valor;
  norma = Math.sqrt(norma);
  if (norma === 0) return vetor;
  return vetor.map((valor) => valor / norma);
}

export function similaridadeCosseno(a: number[], b: number[]): number {
  const limite = Math.min(a.length, b.length);
  let produto = 0;
  let normaA = 0;
  let normaB = 0;
  for (let i = 0; i < limite; i += 1) {
    produto += a[i] * b[i];
    normaA += a[i] * a[i];
    normaB += b[i] * b[i];
  }
  if (normaA === 0 || normaB === 0) return 0;
  return produto / (Math.sqrt(normaA) * Math.sqrt(normaB));
}

function hash32(valor: string): number {
  let hash = 2166136261;
  for (let i = 0; i < valor.length; i += 1) {
    hash ^= valor.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
