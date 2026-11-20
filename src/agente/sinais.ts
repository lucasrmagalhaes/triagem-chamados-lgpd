import type { Categoria, Prioridade } from '../dominio/taxonomia';

export const TERMOS_CATEGORIA: Record<Categoria, string[]> = {
  acesso: ['senha', 'login', 'logar', 'vpn', 'permissao', 'autenticacao', 'usuario travado'],
  pagamento: ['boleto', 'pix', 'nota fiscal', 'pagamento', 'fatura', 'reembolso', 'conciliacao'],
  bug: ['tela branca', 'timeout', 'bug', 'excecao', 'lentidao', 'nao abre'],
  cadastro: ['cadastro', 'cnpj', 'endereco', 'filial', 'razao social', 'dados cadastrais'],
  entrega: ['entrega', 'rastreio', 'atraso', 'romaneio', 'coleta', 'transportadora', 'pedido atrasado'],
  duvida: ['como faco', 'como eu', 'duvida', 'me explica', 'passo a passo', 'tutorial'],
};

export const TERMOS_PRIORIDADE: Record<Exclude<Prioridade, 'media'>, string[]> = {
  urgente: ['urgente', 'producao parada', 'nao consigo trabalhar', 'sistema fora', 'tudo parado'],
  alta: ['hoje', 'bloqueado', 'nao entra', 'cliente cobrando', 'sem acesso', 'travou', 'erro 500'],
  baixa: ['quando puder', 'sem pressa', 'duvida rapida', 'so uma duvida'],
};
