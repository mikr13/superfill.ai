import { keyVault } from "./security/key-vault";

export type AIProvider = "openai" | "anthropic";

export interface ProviderOption {
  value: AIProvider;
  label: string;
  available: boolean;
}

export async function getProviderOptions(): Promise<ProviderOption[]> {
  const [openaiKey, anthropicKey] = await Promise.all([
    keyVault.getKey("openai"),
    keyVault.getKey("anthropic"),
  ]);

  return [
    {
      value: "openai",
      label: "OpenAI",
      available: openaiKey !== null,
    },
    {
      value: "anthropic",
      label: "Anthropic",
      available: anthropicKey !== null,
    },
  ];
}

export async function getAvailableProviders(): Promise<ProviderOption[]> {
  const providers = await getProviderOptions();
  return providers.filter((p) => p.available);
}

export async function isProviderAvailable(
  provider: AIProvider,
): Promise<boolean> {
  const key = await keyVault.getKey(provider);
  return key !== null;
}

export async function getFirstAvailableProvider(): Promise<AIProvider | null> {
  const providers = await getAvailableProviders();
  return providers.length > 0 ? providers[0].value : null;
}
