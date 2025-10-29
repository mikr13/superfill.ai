import { defineProxyService } from "@webext-core/proxy-service";

type Provider = "openai" | "anthropic";

class KeyValidationService {
  async validateKey(provider: Provider, key: string): Promise<boolean> {
    try {
      switch (provider) {
        case "openai":
          return await this.testOpenAIKey(key);
        case "anthropic":
          return await this.testAnthropicKey(key);
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  private async testOpenAIKey(key: string): Promise<boolean> {
    try {
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async testAnthropicKey(key: string): Promise<boolean> {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1,
          messages: [{ role: "user", content: "test" }],
        }),
      });
      return response.ok || response.status === 400; // 400 means auth passed, just invalid request params or credit balance too low or something similar
    } catch {
      return false;
    }
  }
}

export const [registerKeyValidationService, getKeyValidationService] =
  defineProxyService("KeyValidationService", () => new KeyValidationService());
