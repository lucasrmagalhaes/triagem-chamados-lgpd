type SdkAberto = { shutdown(): Promise<void> };

let sdkAberto: SdkAberto | undefined;

export async function iniciarObservabilidade(): Promise<boolean> {
  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) return false;
  const { NodeSDK } = await import('@opentelemetry/sdk-node');
  const { LangfuseSpanProcessor } = await import('@langfuse/otel');
  const { LangfuseVercelAiSdkIntegration } = await import('@langfuse/vercel-ai-sdk');
  const { registerTelemetry } = await import('ai');
  const sdk = new NodeSDK({ spanProcessors: [new LangfuseSpanProcessor()] });
  sdk.start();
  registerTelemetry(new LangfuseVercelAiSdkIntegration());
  sdkAberto = sdk;
  return true;
}

export async function encerrarObservabilidade(): Promise<void> {
  if (!sdkAberto) return;
  await sdkAberto.shutdown();
  sdkAberto = undefined;
}
