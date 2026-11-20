export type PrecoModelo = {
  entradaPorToken: number;
  saidaPorToken: number;
};

/**
 * USD por token, catalogo publico do AI Gateway em 20/11/2026.
 * Campo pricing.input / pricing.output de https://ai-gateway.vercel.sh/v1/models
 */
export const PRECOS_CATALOGO_2026_11_20: Record<string, PrecoModelo> = {
  'openai/gpt-5-nano': { entradaPorToken: 0.00000005, saidaPorToken: 0.0000004 },
  'google/gemini-2.5-flash-lite': { entradaPorToken: 0.0000001, saidaPorToken: 0.0000004 },
  'anthropic/claude-haiku-4.5': { entradaPorToken: 0.000001, saidaPorToken: 0.000005 },
  'openai/text-embedding-3-small': { entradaPorToken: 0.00000002, saidaPorToken: 0 },
};

export function estimarCustoUsd(
  modelo: string,
  tokensEntrada: number,
  tokensSaida: number,
  tabela: Record<string, PrecoModelo> = PRECOS_CATALOGO_2026_11_20,
): number | null {
  const preco = tabela[modelo];
  if (!preco) return null;
  return tokensEntrada * preco.entradaPorToken + tokensSaida * preco.saidaPorToken;
}

export async function precosAoVivo(modelos: string[]): Promise<Record<string, PrecoModelo>> {
  const resposta = await fetch('https://ai-gateway.vercel.sh/v1/models');
  if (!resposta.ok) throw new Error(`catalogo de modelos respondeu ${resposta.status}`);
  const corpo = (await resposta.json()) as {
    data?: Array<{ id: string; pricing?: { input?: string; output?: string } }>;
  };
  const tabela: Record<string, PrecoModelo> = {};
  for (const item of corpo.data ?? []) {
    if (!modelos.includes(item.id) || !item.pricing?.input) continue;
    tabela[item.id] = {
      entradaPorToken: Number(item.pricing.input),
      saidaPorToken: Number(item.pricing.output ?? 0),
    };
  }
  return tabela;
}
