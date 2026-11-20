import { AgenteHeuristico } from './agente/heuristico';
import type { AgenteTriagem, ExemploSimilar } from './agente/tipos';
import { classificarComSdk } from './agente/sdk';
import { carregarConfig, identificadorEmbedding, type ConfigApp } from './config';
import { lerDataset } from './dataset/ler';
import { ServicoEmbedding } from './embeddings/servico';
import { mascararTexto } from './mascaramento/mascaramento';
import { BancoMemoria } from './persistencia/memoria';
import { BancoPostgres } from './persistencia/postgres';
import type { Banco, ExemploGravado } from './persistencia/tipos';
import { PipelineTriagem, TriagemService } from './triagem/pipeline';

export type Aplicacao = {
  config: ConfigApp;
  banco: Banco;
  embeddings: ServicoEmbedding;
  triagem: TriagemService;
};

export async function comporAplicacao(env: NodeJS.ProcessEnv = process.env): Promise<Aplicacao> {
  const config = carregarConfig(env);
  const embeddings = new ServicoEmbedding(
    config.usarEmbeddingGateway ? 'gateway' : 'local',
    config.modeloEmbedding,
    config.dimensoes,
  );
  const identificador = identificadorEmbedding(config);
  const banco = config.databaseUrl
    ? await BancoPostgres.conectar(config.databaseUrl, identificador)
    : await bancoComDataset(embeddings, identificador);

  const agente: AgenteTriagem = config.forcarHeuristica
    ? new AgenteHeuristico()
    : agenteGateway(config, embeddings, banco);

  const pipeline = new PipelineTriagem(embeddings, banco, agente, config.limiar);
  const triagem = new TriagemService(pipeline, banco, {
    banco: config.databaseUrl ? 'postgres' : 'memoria',
    embedding: identificador,
    langfuse: config.langfuse,
    limiar: config.limiar,
  });
  return { config, banco, embeddings, triagem };
}

export async function carregarExemplos(
  itens: Array<{ id: string; texto: string; categoria: ExemploGravado['categoria']; prioridade: ExemploGravado['prioridade']; fila: ExemploGravado['fila'] }>,
  embeddings: ServicoEmbedding,
): Promise<ExemploGravado[]> {
  const mascarados = itens.map((item) => ({ ...item, textoMascarado: mascararTexto(item.texto).texto }));
  const vetores = await embeddings.embedMuitos(mascarados.map((item) => item.textoMascarado));
  return mascarados.map((item, indice) => ({
    id: item.id,
    textoMascarado: item.textoMascarado,
    categoria: item.categoria,
    prioridade: item.prioridade,
    fila: item.fila,
    embedding: vetores[indice],
  }));
}

async function bancoComDataset(embeddings: ServicoEmbedding, identificador: string): Promise<Banco> {
  const banco = new BancoMemoria();
  try {
    const treino = lerDataset().filter((item) => item.split === 'treino');
    const exemplos = await carregarExemplos(treino, embeddings);
    await banco.substituirExemplos(exemplos, identificador);
  } catch {
    await banco.substituirExemplos([], identificador);
  }
  return banco;
}

function agenteGateway(config: ConfigApp, embeddings: ServicoEmbedding, banco: Banco): AgenteTriagem {
  return {
    modelo: config.modeloTriagem,
    async classificar(entrada): Promise<Awaited<ReturnType<AgenteTriagem['classificar']>>> {
      return classificarComSdk({
        model: config.modeloTriagem,
        modeloId: config.modeloTriagem,
        textoMascarado: entrada.textoMascarado,
        exemplos: entrada.exemplos,
        buscarMais: (consulta) => buscarConsulta(consulta, embeddings, banco),
        telemetria: config.langfuse,
        registrarConteudo: config.registrarConteudo,
      });
    },
  };
}

async function buscarConsulta(consulta: string, embeddings: ServicoEmbedding, banco: Banco): Promise<ExemploSimilar[]> {
  const vetor = await embeddings.embed(consulta);
  return banco.buscarExemplos(vetor, 4);
}
