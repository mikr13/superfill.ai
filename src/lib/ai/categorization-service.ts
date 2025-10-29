import { defineProxyService } from "@webext-core/proxy-service";
import { store } from "@/lib/storage";
import {
  type AnalysisResult,
  categorizationAgent,
  fallbackCategorization,
} from "./categorization";

class CategorizationService {
  async analyze(
    answer: string,
    question?: string,
    apiKey?: string,
  ): Promise<AnalysisResult> {
    try {
      if (!apiKey) {
        console.warn("No API key provided, using fallback categorization");
        return await fallbackCategorization(answer, question);
      }

      const userSettings = await store.userSettings.getValue();
      const { selectedProvider } = userSettings;

      const result = await categorizationAgent(
        answer,
        question,
        selectedProvider,
        apiKey,
      );

      return result;
    } catch (error) {
      console.error("AI categorization error:", error);
      // Fallback to rule-based categorization
      return await fallbackCategorization(answer, question);
    }
  }

  async getStats() {
    return {
      totalCategorizations: 0,
      aiSuccessRate: 0,
      fallbackRate: 0,
    };
  }
}

export const [registerCategorizationService, getCategorizationService] =
  defineProxyService(
    "CategorizationService",
    () => new CategorizationService(),
  );
