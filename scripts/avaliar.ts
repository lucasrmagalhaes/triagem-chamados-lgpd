import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { AgenteHeuristico } from '../src/agente/heuristico';
import type { AgenteTriagem } from '../src/agente/tipos';
import { classificarComSdk } from '../src/agente/sdk';
import { PRECOS_CATALOGO_2026_11_20, precosAoVivo, type PrecoModelo } from '../src/avaliacao/precos';
import { avaliarAgente, type ItemAvaliado, type ResumoModelo } from '../src/avaliacao/rodar';
import { carregarArquivoEnv, carregarConfig, identificadorEmbedding, type ConfigApp } from '../src/config';
import { carregarExemplos } from '../src/composicao';
import { lerDataset } from '../src/dataset/ler';
import type { ChamadoRotulado } from '../src/dominio/esquema';
import { ServicoEmbedding } from '../src/embeddings/servico';
import { BancoMemoria } from '../src/persistencia/memoria';
import { PipelineTriagem } from '../src/triagem/pipeline';

async function main(): Promise<void> {
  carregarArquivoEnv();
  const config = carregarConfig();
  const dataset = lerDataset();
  const holdout = dataset.filter((item) => item.split === 'avaliacao');
  const treino = dataset.filter((item) => item.split === 'treino');
  const embeddings = new ServicoEmbedding('local', config.modeloEmbedding, config.dimensoes);
  const banco = new BancoMemoria();
  await banco.substituirExemplos(
    await carregarExemplos(treino, embeddings),
    identificadorEmbedding({ ...config, usarEmbeddingGateway: false }),
  );

  const modelos: ResumoModelo[] = [];
  const falhas: Array<{ modelo: string; mensagem: string }> = [];
  modelos.push(await rodar(new AgenteHeuristico(), 'heuristico', { config, embeddings, banco, holdout }));

  const rodarModelos = config.avaliacaoReal && Boolean(config.chaveGateway);
  if (rodarModelos) {
    let precos = PRECOS_CATALOGO_2026_11_20;
    try {
      precos = { ...PRECOS_CATALOGO_2026_11_20, ...(await precosAoVivo(config.modelosAvaliacao)) };
    } catch (erro) {
      console.error(`catalogo ao vivo indisponivel, usando a tabela de 20/11/2026. ${mensagem(erro)}`);
    }
    for (const modelo of config.modelosAvaliacao) {
      try {
        modelos.push(
          await rodar(agenteGateway(modelo, embeddings, banco, config), 'gateway', {
            config,
            embeddings,
            banco,
            holdout,
            precos,
          }),
        );
      } catch (erro) {
        falhas.push({ modelo, mensagem: mensagem(erro) });
      }
    }
  }

  const relatorio = {
    geradoEm: new Date().toISOString(),
    holdout: holdout.length,
    treino: treino.length,
    limiar: config.limiar,
    fontePrecos: 'catalogo-2026-11-20',
    observacao: rodarModelos
      ? 'Comparacao com modelos do AI Gateway. O heuristico-local continua no mesmo holdout.'
      : 'Sem chamada de LLM. Defina AI_GATEWAY_API_KEY e AVALIACAO_REAL=true para preencher o comparativo de custo e acuracia. Os numeros abaixo sao do classificador heuristico local.',
    modelos,
    falhas,
  };
  const destino = path.join(process.cwd(), 'eval/resultados');
  mkdirSync(destino, { recursive: true });
  writeFileSync(path.join(destino, 'ultimo.json'), JSON.stringify(relatorio, null, 2) + '\n');
  for (const item of modelos) {
    console.log(
      [
        item.modelo,
        `n=${item.n}`,
        `cat=${item.categoria.acuracia.toFixed(3)}`,
        `f1cat=${item.categoria.f1Macro.toFixed(3)}`,
        `pri=${item.prioridade.acuracia.toFixed(3)}`,
        `f1pri=${item.prioridade.f1Macro.toFixed(3)}`,
        `fila=${item.fila.acuracia.toFixed(3)}`,
        `f1fila=${item.fila.f1Macro.toFixed(3)}`,
        `revisao=${item.taxaRevisao.toFixed(3)}`,
        `custo=${item.custoEstimadoUsd ?? 0}`,
      ].join(' '),
    );
  }
  if (falhas.length > 0) console.error(JSON.stringify(falhas, null, 2));
}

async function rodar(
  agente: AgenteTriagem,
  modo: 'heuristico' | 'gateway',
  deps: {
    config: ConfigApp;
    embeddings: ServicoEmbedding;
    banco: BancoMemoria;
    holdout: ChamadoRotulado[];
    precos?: Record<string, PrecoModelo>;
  },
): Promise<ResumoModelo> {
  const pipeline = new PipelineTriagem(deps.embeddings, deps.banco, agente, deps.config.limiar);
  return avaliarAgente({
    agente,
    holdout: deps.holdout,
    limiar: deps.config.limiar,
    modo,
    precos: deps.precos,
    classificar: async (item) => {
      const inicio = Date.now();
      const decisao = await pipeline.classificar(item.texto);
      const avaliado: ItemAvaliado = {
        id: item.id,
        tipo: item.tipo,
        confianca: decisao.confianca,
        latenciaMs: Date.now() - inicio,
        tokensEntrada: decisao.tokensEntrada,
        tokensSaida: decisao.tokensSaida,
        gold: { categoria: item.categoria, prioridade: item.prioridade, fila: item.fila },
        pred: {
          categoria: decisao.categoria,
          prioridade: decisao.prioridade,
          fila: decisao.filaPrevista,
        },
      };
      return avaliado;
    },
  });
}

function agenteGateway(
  modelo: string,
  embeddings: ServicoEmbedding,
  banco: BancoMemoria,
  config: ConfigApp,
): AgenteTriagem {
  return {
    modelo,
    classificar: (entrada) =>
      classificarComSdk({
        model: modelo,
        modeloId: modelo,
        textoMascarado: entrada.textoMascarado,
        exemplos: entrada.exemplos,
        buscarMais: async (consulta) => banco.buscarExemplos(await embeddings.embed(consulta), 4),
        telemetria: config.langfuse,
        registrarConteudo: config.registrarConteudo,
      }),
  };
}

function mensagem(erro: unknown): string {
  return erro instanceof Error ? erro.message : 'erro desconhecido';
}

main().catch((erro: unknown) => {
  console.error(erro);
  process.exit(1);
});
