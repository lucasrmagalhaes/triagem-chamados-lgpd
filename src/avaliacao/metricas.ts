export type MetricasClasse = {
  classe: string;
  precisao: number;
  recall: number;
  f1: number;
  suporte: number;
};

export type ResumoTarefa = {
  acuracia: number;
  f1Macro: number;
  f1Ponderado: number;
  porClasse: MetricasClasse[];
  matriz: { rotulos: string[]; linhas: number[][] };
};

export function resumirTarefa(golds: string[], preds: string[], rotulos: readonly string[]): ResumoTarefa {
  if (golds.length !== preds.length) throw new Error('gold e pred precisam ter o mesmo tamanho');
  const linhas = rotulos.map(() => rotulos.map(() => 0));
  let acertos = 0;
  for (let i = 0; i < golds.length; i += 1) {
    const linha = rotulos.indexOf(golds[i]);
    const coluna = rotulos.indexOf(preds[i]);
    if (linha < 0 || coluna < 0) {
      throw new Error(`rotulo fora da taxonomia: ${golds[i]} / ${preds[i]}`);
    }
    linhas[linha][coluna] += 1;
    if (golds[i] === preds[i]) acertos += 1;
  }

  const porClasse = rotulos.map((classe, indice) => {
    const tp = linhas[indice][indice];
    const suporte = linhas[indice].reduce((soma, valor) => soma + valor, 0);
    const preditos = linhas.reduce((soma, linha) => soma + linha[indice], 0);
    const precisao = preditos === 0 ? 0 : tp / preditos;
    const recall = suporte === 0 ? 0 : tp / suporte;
    const f1 = precisao + recall === 0 ? 0 : (2 * precisao * recall) / (precisao + recall);
    return { classe, precisao, recall, f1, suporte };
  });

  const presentes = porClasse.filter((item) => item.suporte > 0);
  const f1Macro = media(presentes.map((item) => item.f1));
  const total = presentes.reduce((soma, item) => soma + item.suporte, 0);
  const f1Ponderado = total === 0 ? 0 : presentes.reduce((soma, item) => soma + item.f1 * item.suporte, 0) / total;

  return {
    acuracia: golds.length === 0 ? 0 : acertos / golds.length,
    f1Macro,
    f1Ponderado,
    porClasse,
    matriz: { rotulos: [...rotulos], linhas },
  };
}

function media(valores: number[]): number {
  if (valores.length === 0) return 0;
  return valores.reduce((soma, valor) => soma + valor, 0) / valores.length;
}
