import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { AIProvider } from "@/lib/providers/registry";

const OPENAI_COMPATIBLE_PROVIDERS = {
  openai: {
    baseURL: undefined,
    model: "gpt-4o-mini",
  },
  groq: {
    baseURL: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
  },
  deepseek: {
    baseURL: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
  },
  ollama: {
    baseURL: "http://localhost:11434/v1",
    model: "llama3.2",
  },
} as const;

export const getAIModel = (provider: AIProvider, apiKey: string) => {
  if (provider === "anthropic") {
    const anthropic = createAnthropic({ apiKey });
    return anthropic("claude-3-5-haiku-latest");
  }

  const config = OPENAI_COMPATIBLE_PROVIDERS[provider];

  if (config) {
    const openaiCompatible = createOpenAI({
      apiKey: provider === "ollama" ? "ollama" : apiKey,
      ...(config.baseURL && { baseURL: config.baseURL }),
    });
    return openaiCompatible(config.model);
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
};
