import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Categoria, Prioridade, TipoAmostra } from '../dominio/taxonomia';
import { CATEGORIAS } from '../dominio/taxonomia';
import type { ChamadoRotulado } from '../dominio/esquema';
import { cpfValido, detectarPii } from '../mascaramento/mascaramento';
import { NOMES_SINTETICOS } from '../mascaramento/mascaramento';
import { filaPorPolitica } from '../agente/politica';
import {
  AMBIGUO,
  ASIDES,
  CONTEXTOS,
  FECHOS,
  LEXICO,
  PARAFRASE,
  RELATO,
  SAUDACOES,
} from './frases';

export const SEMENTE_DATASET = 42;

const PLANO: Record<Categoria, Record<Prioridade, number>> = {
  acesso: { baixa: 10, media: 18, alta: 14, urgente: 8 },
  pagamento: { baixa: 10, media: 18, alta: 13, urgente: 8 },
  bug: { baixa: 12, media: 18, alta: 13, urgente: 8 },
  cadastro: { baixa: 14, media: 20, alta: 12, urgente: 4 },
  entrega: { baixa: 10, media: 18, alta: 14, urgente: 8 },
  duvida: { baixa: 16, media: 18, alta: 14, urgente: 2 },
};

const DDDS = ['11', '21', '31', '41', '47', '51', '61', '71', '81', '85'];

export function gerarDataset(semente = SEMENTE_DATASET): ChamadoRotulado[] {
  const aleatorio = criarAleatorio(semente);
  const rascunhos: Array<Omit<ChamadoRotulado, 'id' | 'split' | 'fila'>> = [];

  for (const categoria of CATEGORIAS) {
    for (const prioridade of ['baixa', 'media', 'alta', 'urgente'] as Prioridade[]) {
      for (let i = 0; i < PLANO[categoria][prioridade]; i += 1) {
        const tipo = tipoDoIndice(i);
        const miolo = mioloDe(categoria, prioridade, i, tipo);
        const texto = montarTexto(miolo, tipo, categoria, i, aleatorio);
        rascunhos.push({
          texto,
          categoria,
          prioridade,
          ambiguo: tipo !== 'direto',
          tipo,
        });
      }
    }
  }

  const porCategoria = new Map<Categoria, ChamadoRotulado[]>();
  for (const categoria of CATEGORIAS) porCategoria.set(categoria, []);

  rascunhos.forEach((item, indice) => {
    const fila = filaPorPolitica(item.categoria, item.texto, item.prioridade);
    const registro: ChamadoRotulado = {
      id: `ch-${String(indice + 1).padStart(4, '0')}`,
      texto: item.texto,
      categoria: item.categoria,
      prioridade: item.prioridade,
      fila,
      ambiguo: item.ambiguo,
      tipo: item.tipo,
      split: 'treino',
    };
    porCategoria.get(item.categoria)?.push(registro);
  });

  const saida: ChamadoRotulado[] = [];
  for (const categoria of CATEGORIAS) {
    const itens = embaralhar(porCategoria.get(categoria) ?? [], sementeDaCategoria(categoria));
    itens.forEach((item, indice) => {
      saida.push({ ...item, split: indice % 5 === 0 ? 'avaliacao' : 'treino' });
    });
  }
  return saida.sort((a, b) => a.id.localeCompare(b.id));
}

export function escreverDataset(destino = path.join(process.cwd(), 'dataset')): ChamadoRotulado[] {
  const itens = gerarDataset();
  mkdirSync(destino, { recursive: true });
  writeFileSync(path.join(destino, 'chamados.jsonl'), itens.map((item) => JSON.stringify(item)).join('\n') + '\n');
  writeFileSync(path.join(destino, 'manifesto.json'), JSON.stringify(manifesto(itens), null, 2) + '\n');
  return itens;
}

export function manifesto(itens: ChamadoRotulado[]) {
  const contar = (chave: 'categoria' | 'prioridade' | 'fila' | 'split' | 'tipo') => {
    const mapa: Record<string, number> = {};
    for (const item of itens) mapa[item[chave]] = (mapa[item[chave]] ?? 0) + 1;
    return mapa;
  };
  return {
    semente: SEMENTE_DATASET,
    estilo: 'informal com giria, erro de digitacao, mistura de assuntos e caso ambiguo',
    total: itens.length,
    categorias: contar('categoria'),
    prioridades: contar('prioridade'),
    filas: contar('fila'),
    splits: contar('split'),
    tipos: contar('tipo'),
    comPii: itens.filter((item) => detectarPii(item.texto).length > 0).length,
  };
}

function tipoDoIndice(indice: number): TipoAmostra {
  const resto = indice % 10;
  if (resto <= 1) return 'ambiguo';
  if (resto <= 4) return 'misto';
  return 'direto';
}

function mioloDe(categoria: Categoria, prioridade: Prioridade, indice: number, tipo: TipoAmostra): string {
  if (tipo === 'ambiguo') return AMBIGUO[categoria][prioridade][indice % AMBIGUO[categoria][prioridade].length];
  const parafrase = tipo === 'misto' ? indice % 10 !== 2 : indice % 10 >= 8;
  const banco = parafrase ? PARAFRASE : LEXICO;
  return banco[categoria][prioridade][indice % banco[categoria][prioridade].length];
}

function montarTexto(
  miolo: string,
  tipo: TipoAmostra,
  categoria: Categoria,
  indice: number,
  aleatorio: () => number,
): string {
  const estilo = aleatorio();
  const curto = estilo < 0.18;
  const longo = estilo > 0.72;
  const partes: string[] = [];

  if (!curto && aleatorio() < 0.8) partes.push(escolher(SAUDACOES, aleatorio));
  if (longo) partes.push(...escolherVarios(CONTEXTOS, 2, aleatorio));
  else if (!curto && aleatorio() < 0.55) partes.push(escolher(CONTEXTOS, aleatorio));

  partes.push(miolo.trim());
  if (longo) partes.push(RELATO);
  if (tipo === 'misto') {
    const outra = outraCategoria(categoria, indice);
    const ponte = escolher(
      ['ah e outra coisa:', 'aproveitando,', 'de quebra,', 'nao sei se importa, mas', 'e so pra registrar:'],
      aleatorio,
    );
    partes.push(`${ponte} ${escolher(asidesPermitidos(categoria, outra), aleatorio)}`);
  }
  if (!curto && aleatorio() < 0.65) partes.push(escolher(FECHOS, aleatorio));

  let texto = juntar(partes);
  texto = aplicarGiria(texto, aleatorio);
  texto = aplicarTypo(texto, aleatorio);
  texto = inserirPii(texto, aleatorio);
  return texto;
}

function outraCategoria(categoria: Categoria, indice: number): Categoria {
  const outras = CATEGORIAS.filter((item) => item !== categoria);
  return outras[indice % outras.length];
}

function asidesPermitidos(categoria: Categoria, outra: Categoria): string[] {
  const lista = ASIDES[outra].filter((frase) => {
    if (categoria === 'duvida' && /boleto|fatura|nota fiscal/.test(frase)) return false;
    if (categoria === 'pagamento' && /gateway|checkout|fora do ar/.test(frase)) return false;
    if (categoria === 'acesso' && /\bvpn\b|\bservidor\b|\bfabrica\b/.test(frase)) return false;
    return true;
  });
  return lista.length > 0 ? lista : ASIDES[outra];
}

function aplicarGiria(texto: string, aleatorio: () => number): string {
  if (aleatorio() > 0.62) return texto;
  const giro = Math.floor(aleatorio() * 7);
  if (giro === 0) return texto.replace(/\bnao\b/, 'naum');
  if (giro === 1) return `mano, ${texto}`;
  if (giro === 2) return texto.replace(/\btambem\b/, 'tbm');
  if (giro === 3) return `${texto} sla`;
  if (giro === 4) return `vei ${texto}`;
  if (giro === 5) return `${texto} kk`;
  return `aff, ${texto}`;
}

function aplicarTypo(texto: string, aleatorio: () => number): string {
  if (aleatorio() > 0.5) return texto;
  const palavras = texto.split(' ');
  const candidatos = palavras
    .map((palavra, indice) => ({ palavra, indice }))
    .filter((item) => item.palavra.length >= 6 && !/\d/.test(item.palavra) && !item.palavra.includes('@'));
  if (candidatos.length === 0) return texto;
  const alvo = candidatos[Math.floor(aleatorio() * candidatos.length)];
  const chars = [...alvo.palavra];
  const pos = 1 + Math.floor(aleatorio() * Math.max(1, chars.length - 2));
  const modo = Math.floor(aleatorio() * 3);
  if (modo === 0 && pos < chars.length - 1) {
    const atual = chars[pos];
    chars[pos] = chars[pos + 1];
    chars[pos + 1] = atual;
  } else if (modo === 1) {
    chars.splice(pos, 1);
  } else {
    chars.splice(pos, 0, chars[pos]);
  }
  palavras[alvo.indice] = chars.join('');
  return palavras.join(' ');
}

function inserirPii(texto: string, aleatorio: () => number): string {
  const pii = sortearPii(aleatorio).trim();
  if (!pii) return texto;
  const frase = pii.replace(/^[.\s]+|[.\s]+$/g, '');
  if (aleatorio() < 0.35) return `${frase}. ${texto}`;
  const ponto = texto.indexOf('.');
  if (ponto > 24 && aleatorio() < 0.5) return `${texto.slice(0, ponto + 1)} ${frase}.${texto.slice(ponto + 1)}`;
  return `${texto.replace(/[.]+$/, '')}. ${frase}.`;
}

function sortearPii(aleatorio: () => number): string {
  if (aleatorio() > 0.48) return '';
  const primeiro = escolher(NOMES_SINTETICOS.primeiros, aleatorio);
  const artigo = primeiro === 'ana' || primeiro === 'maria' || primeiro === 'camila' || primeiro === 'juliana' ? 'a' : 'o';
  const nome = `${primeiro} ${escolher(NOMES_SINTETICOS.sobrenomes, aleatorio)}`;
  const cpf = gerarCpf(aleatorio);
  const email = `${nome.replace(/\s+/g, '.').toLowerCase()}${Math.floor(aleatorio() * 80)}@exemplo.com`;
  const telefone = gerarTelefone(aleatorio);
  const modo = Math.floor(aleatorio() * 4);
  if (modo === 0) return ` meu cpf e ${cpf}.`;
  if (modo === 1) return ` me chama no ${telefone}, email ${email}.`;
  if (modo === 2) return ` aqui e ${artigo} ${nome}.`;
  return ` aqui e ${artigo} ${nome}, cpf ${cpf}, email ${email}, telefone ${telefone}.`;
}

export function gerarCpf(aleatorio: () => number): string {
  const base = Array.from({ length: 9 }, () => Math.floor(aleatorio() * 10));
  if (base.every((digito) => digito === base[0])) base[0] = (base[0] + 1) % 10;
  const d1 = digitoCpf(base);
  const d2 = digitoCpf([...base, d1]);
  const digitos = [...base, d1, d2].join('');
  if (!cpfValido(digitos)) throw new Error('gerador de CPF produziu numero invalido');
  if (aleatorio() < 0.5) return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
  return digitos;
}

function digitoCpf(nums: number[]): number {
  let soma = 0;
  for (let i = 0; i < nums.length; i += 1) soma += nums[i] * (nums.length + 1 - i);
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

function gerarTelefone(aleatorio: () => number): string {
  const ddd = escolher(DDDS, aleatorio);
  const corpo = Array.from({ length: 8 }, () => Math.floor(aleatorio() * 10)).join('');
  const modo = Math.floor(aleatorio() * 3);
  if (modo === 0) return `(${ddd}) 9${corpo.slice(0, 4)}-${corpo.slice(4)}`;
  if (modo === 1) return `+55 ${ddd} 9${corpo.slice(0, 4)}-${corpo.slice(4)}`;
  return `${ddd}9${corpo}`;
}

function escolher<T>(itens: readonly T[], aleatorio: () => number): T {
  return itens[Math.floor(aleatorio() * itens.length)];
}

function escolherVarios<T>(itens: readonly T[], quantidade: number, aleatorio: () => number): T[] {
  const copia = [...itens];
  const saida: T[] = [];
  for (let i = 0; i < quantidade && copia.length > 0; i += 1) {
    const indice = Math.floor(aleatorio() * copia.length);
    saida.push(copia.splice(indice, 1)[0]);
  }
  return saida;
}

function juntar(partes: string[]): string {
  return partes
    .map((parte) => parte.trim().replace(/[.]+$/g, ''))
    .filter((parte) => parte.length > 0)
    .join('. ')
    .replace(/\s+/g, ' ')
    .trim();
}

function embaralhar<T>(itens: T[], semente: number): T[] {
  const aleatorio = criarAleatorio(semente);
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(aleatorio() * (i + 1));
    const atual = copia[i];
    copia[i] = copia[j];
    copia[j] = atual;
  }
  return copia;
}

function sementeDaCategoria(categoria: string): number {
  let soma = SEMENTE_DATASET;
  for (const char of categoria) soma = (Math.imul(soma, 33) + char.charCodeAt(0)) >>> 0;
  return soma || 1;
}

function criarAleatorio(semente: number): () => number {
  let estado = semente >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
