import type { Categoria, FilaModelo, Prioridade } from '../dominio/taxonomia';
import { contemTermo, normalizar } from '../dominio/texto';

export function filaPorPolitica(categoria: Categoria, texto: string, prioridade: Prioridade): FilaModelo {
  const base = normalizar(texto);
  if (categoria === 'acesso') {
    if (prioridade === 'urgente' || contemTermo(base, 'vpn') || contemTermo(base, 'servidor') || contemTermo(base, 'fabrica')) {
      return 'fila_infra';
    }
    return 'fila_acessos';
  }
  if (categoria === 'pagamento') {
    if (contemTermo(base, 'gateway') || contemTermo(base, 'checkout') || contemTermo(base, 'fora do ar')) {
      return 'fila_engenharia';
    }
    return 'fila_financeiro';
  }
  if (categoria === 'bug') return prioridade === 'baixa' ? 'fila_atendimento' : 'fila_engenharia';
  if (categoria === 'cadastro') return 'fila_cadastro';
  if (categoria === 'entrega') return 'fila_logistica';
  if (contemTermo(base, 'boleto') || contemTermo(base, 'fatura') || contemTermo(base, 'nota fiscal')) return 'fila_financeiro';
  return 'fila_atendimento';
}
