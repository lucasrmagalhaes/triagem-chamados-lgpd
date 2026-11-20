import { normalizar } from '../dominio/texto';

export const TIPOS_PII = ['cpf', 'email', 'telefone', 'nome'] as const;
export type TipoPii = (typeof TIPOS_PII)[number];

export type OcorrenciaPii = {
  inicio: number;
  fim: number;
  tipo: TipoPii;
  valor: string;
};

export type ResultadoMascara = {
  texto: string;
  tipos: TipoPii[];
  quantidade: number;
};

const ROTULO: Record<TipoPii, string> = {
  cpf: 'CPF',
  email: 'EMAIL',
  telefone: 'TELEFONE',
  nome: 'NOME',
};

const PRIORIDADE_TIPO: Record<TipoPii, number> = {
  email: 4,
  cpf: 3,
  telefone: 2,
  nome: 1,
};

const DDDS = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38', '41', '42', '43', '44', '45', '46', '47',
  '48', '49', '51', '53', '54', '55', '61', '62', '63', '64', '65', '66', '67', '68',
  '69', '71', '73', '74', '75', '77', '79', '81', '82', '83', '84', '85', '86', '87',
  '88', '89', '91', '92', '93', '94', '95', '96', '97', '98', '99',
]);

const PRIMEIROS = [
  'ana', 'maria', 'joao', 'joão', 'jose', 'josé', 'pedro', 'paulo', 'carlos', 'marcos',
  'lucas', 'gabriel', 'rafael', 'felipe', 'bruno', 'diego', 'andre', 'andré', 'rodrigo',
  'fernando', 'ricardo', 'eduardo', 'gustavo', 'camila', 'juliana', 'fernanda', 'patricia',
  'patrícia', 'amanda', 'bruna', 'larissa', 'beatriz', 'leticia', 'letícia', 'aline',
  'renata', 'vanessa', 'tatiane', 'simone', 'adriana', 'claudia', 'cláudia', 'mariana',
  'carolina', 'bianca', 'daniela', 'zuleica',
];

const SOBRENOMES = [
  'silva', 'santos', 'oliveira', 'souza', 'ferreira', 'rodrigues', 'almeida', 'pereira',
  'barbosa', 'gomes', 'ribeiro', 'carvalho', 'araujo', 'araújo', 'martins', 'teixeira',
  'moreira', 'pires',
];

const NOMES = [...PRIMEIROS, ...SOBRENOMES].sort((a, b) => b.length - a.length);
const NOMES_NORM = new Set(NOMES.map((nome) => normalizar(nome)));

const PARADA_NOME = new Set([
  'no', 'na', 'do', 'da', 'de', 'dos', 'das', 'que', 'pra', 'pro', 'com', 'um', 'uma',
  'meu', 'minha', 'sistema', 'porque', 'pq', 'nao', 'não', 'o', 'a', 'os', 'as', 'em',
  'por', 'para', 'se', 'ja', 'já', 'eu', 'vc', 'voce', 'você', 'ta', 'tá', 'to', 'tô',
  'e', 'ou', 'mas', 'isso', 'essa', 'esse', 'esta', 'este', 'obrigado', 'obrigada',
  'financeiro', 'suporte', 'pedido', 'boleto', 'pix', 'senha', 'login', 'entrega',
  'cadastro', 'filial', 'urgente', 'hoje', 'erro', 'tela', 'portal', 'modulo', 'módulo',
  'relatorio', 'relatório', 'fatura', 'pagamento', 'acesso', 'duvida', 'dúvida', 'bug',
  'rastreio', 'coleta', 'vpn', 'email', 'telefone', 'cpf', 'celular', 'numero', 'número',
  'chamado', 'time', 'gente', 'pessoal', 'problema', 'ajuda', 'favor', 'dia', 'dias',
]);

const GATILHO_NOME =
  /(?:meu nome é|meu nome e|me chamo|me chama|aqui é o|aqui é a|aqui e o|aqui e a|sou o|sou a|att\.?|assinado)\s+/giu;

export function cpfValido(digitos: string): boolean {
  if (!/^\d{11}$/.test(digitos)) return false;
  if (/^(\d)\1{10}$/.test(digitos)) return false;
  const nums = digitos.split('').map(Number);
  const digito = (tamanho: number) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i += 1) soma += nums[i] * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === nums[9] && digito(10) === nums[10];
}

export function detectarPii(texto: string): OcorrenciaPii[] {
  const achados: OcorrenciaPii[] = [];
  coletar(texto, /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, 'email', achados);
  coletar(texto, /\d{3}\.\d{3}\.\d{3}-\d{2}/g, 'cpf', achados);
  coletar(texto, /\(\d{2}\)\s*9?\d{4}-?\d{4}/g, 'telefone', achados);
  coletar(texto, /\+55\s*\(?\d{2}\)?\s*9?\d{4}-?\d{4}/g, 'telefone', achados);
  coletar(texto, /\b\d{2}\s+9\d{4}-\d{4}\b/g, 'telefone', achados);

  for (const match of texto.matchAll(/(?<!\d)\d{11}(?!\d)/g)) {
    const valor = match[0];
    const inicio = match.index ?? 0;
    if (cpfValido(valor)) {
      achados.push({ inicio, fim: inicio + valor.length, tipo: 'cpf', valor });
    } else if (pareceCelular(valor)) {
      achados.push({ inicio, fim: inicio + valor.length, tipo: 'telefone', valor });
    }
  }

  achados.push(...nomesContextuais(texto));
  achados.push(...nomesDicionario(texto));
  return resolverSobreposicao(achados);
}

export function mascararTexto(texto: string): ResultadoMascara {
  const ocorrencias = detectarPii(texto);
  const mapa = new Map<string, string>();
  const contagem: Partial<Record<TipoPii, number>> = {};
  const emOrdem = [...ocorrencias].sort((a, b) => a.inicio - b.inicio || a.fim - b.fim);
  for (const item of emOrdem) {
    const chave = `${item.tipo}:${normalizarValor(item)}`;
    if (mapa.has(chave)) continue;
    contagem[item.tipo] = (contagem[item.tipo] ?? 0) + 1;
    mapa.set(chave, `[${ROTULO[item.tipo]}_${contagem[item.tipo]}]`);
  }

  let saida = texto;
  for (const item of [...ocorrencias].sort((a, b) => b.inicio - a.inicio)) {
    const token = mapa.get(`${item.tipo}:${normalizarValor(item)}`);
    if (!token) continue;
    saida = saida.slice(0, item.inicio) + token + saida.slice(item.fim);
  }

  const tipos = TIPOS_PII.filter((tipo) => ocorrencias.some((item) => item.tipo === tipo));
  return { texto: saida, tipos, quantidade: ocorrencias.length };
}

export class BloqueioPii extends Error {
  readonly status = 422;

  constructor(readonly tipos: TipoPii[]) {
    super('O texto ainda contem dados pessoais depois do mascaramento. A chamada ao modelo foi bloqueada.');
    this.name = 'BloqueioPii';
  }
}

export function assertSemPii(texto: string): void {
  const restantes = detectarPii(texto);
  if (restantes.length === 0) return;
  const tipos = TIPOS_PII.filter((tipo) => restantes.some((item) => item.tipo === tipo));
  throw new BloqueioPii(tipos);
}

function coletar(texto: string, regex: RegExp, tipo: TipoPii, destino: OcorrenciaPii[]): void {
  for (const match of texto.matchAll(regex)) {
    const valor = match[0];
    const inicio = match.index ?? 0;
    destino.push({ inicio, fim: inicio + valor.length, tipo, valor });
  }
}

function pareceCelular(digitos: string): boolean {
  return digitos.length === 11 && DDDS.has(digitos.slice(0, 2)) && digitos[2] === '9';
}

function nomesDicionario(texto: string): OcorrenciaPii[] {
  const regex = new RegExp(`(?<![\\p{L}])(?:${NOMES.join('|')})(?![\\p{L}])`, 'giu');
  const achados: OcorrenciaPii[] = [];
  for (const match of texto.matchAll(regex)) {
    const valor = match[0];
    const inicio = match.index ?? 0;
    achados.push({ inicio, fim: inicio + valor.length, tipo: 'nome', valor });
  }
  return achados;
}

function nomesContextuais(texto: string): OcorrenciaPii[] {
  const achados: OcorrenciaPii[] = [];
  GATILHO_NOME.lastIndex = 0;
  for (const match of texto.matchAll(GATILHO_NOME)) {
    const inicio = (match.index ?? 0) + match[0].length;
    const nome = lerNome(texto, inicio);
    if (!nome) continue;
    achados.push({ inicio, fim: nome.fim, tipo: 'nome', valor: nome.valor });
  }
  return achados;
}

function lerNome(texto: string, inicio: number): { fim: number; valor: string } | undefined {
  const resto = texto.slice(inicio);
  const bruto = /^(?:[A-Za-zÀ-ÿ]{2,})(?:\s+(?:da|de|do|das|dos)\s+[A-Za-zÀ-ÿ]{2,}|\s+[A-Za-zÀ-ÿ]{2,}){0,2}/iu.exec(resto);
  if (!bruto) return undefined;

  const tokens = bruto[0].split(/\s+/);
  const aceitos: string[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const chave = normalizar(token);
    if (PARADA_NOME.has(chave)) break;
    if (i > 0 && (chave === 'da' || chave === 'de' || chave === 'do' || chave === 'das' || chave === 'dos')) {
      const seguinte = tokens[i + 1];
      if (!seguinte || PARADA_NOME.has(normalizar(seguinte)) || !nomeConhecido(seguinte)) break;
      aceitos.push(token, seguinte);
      i += 1;
      continue;
    }
    if (i > 0 && !nomeConhecido(token) && aceitos.length >= 2) break;
    aceitos.push(token);
  }

  if (aceitos.length === 0 || PARADA_NOME.has(normalizar(aceitos[0]))) return undefined;
  const valor = aceitos.join(' ');
  return { valor, fim: inicio + valor.length };
}

function nomeConhecido(token: string): boolean {
  return NOMES_NORM.has(normalizar(token));
}

function normalizarValor(item: OcorrenciaPii): string {
  if (item.tipo === 'email') return item.valor.toLowerCase();
  if (item.tipo === 'cpf' || item.tipo === 'telefone') return item.valor.replace(/\D/g, '');
  return normalizar(item.valor);
}

function resolverSobreposicao(itens: OcorrenciaPii[]): OcorrenciaPii[] {
  const ordenados = [...itens].sort((a, b) => {
    const prioridade = PRIORIDADE_TIPO[b.tipo] - PRIORIDADE_TIPO[a.tipo];
    if (prioridade !== 0) return prioridade;
    const tamanho = b.fim - b.inicio - (a.fim - a.inicio);
    if (tamanho !== 0) return tamanho;
    return a.inicio - b.inicio;
  });
  const aceitos: OcorrenciaPii[] = [];
  for (const item of ordenados) {
    const conflita = aceitos.some((outro) => item.inicio < outro.fim && outro.inicio < item.fim);
    if (!conflita) aceitos.push(item);
  }
  return aceitos.sort((a, b) => a.inicio - b.inicio);
}

export const NOMES_SINTETICOS = {
  primeiros: ['ana', 'joao', 'maria', 'pedro', 'camila', 'lucas', 'juliana', 'rafael'],
  sobrenomes: ['silva', 'santos', 'oliveira', 'souza', 'pereira', 'almeida'],
};
