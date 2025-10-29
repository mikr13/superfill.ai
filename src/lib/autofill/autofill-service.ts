import { defineProxyService } from "@webext-core/proxy-service";
import type { AutofillResult, DetectedField } from "@/types/autofill";

class AutofillService {
  async startAutofillOnActiveTab(): Promise<{
    success: boolean;
    fieldsDetected: number;
    mappingsFound: number;
    error?: string;
  }> {
    try {
      console.log("[AutofillService] Starting autofill on active tab...");

      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab.id) {
        throw new Error("No active tab found");
      }

      const response = await browser.tabs.sendMessage(tab.id, {
        action: "startAutofill",
      });

      return response;
    } catch (error) {
      console.error("[AutofillService] Error starting autofill:", error);
      return {
        success: false,
        fieldsDetected: 0,
        mappingsFound: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async processFields(
    fields: DetectedField[],
    pageUrl: string,
  ): Promise<AutofillResult> {
    try {
      console.log(
        `[AutofillService] Processing ${fields.length} fields for ${pageUrl}`,
      );

      // TODO: Implement field matching logic in TASK-018
      // For now, return empty mappings
      return {
        success: true,
        mappings: [],
        processingTime: 0,
      };
    } catch (error) {
      console.error("[AutofillService] Error processing fields:", error);
      return {
        success: false,
        mappings: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async testConnection(): Promise<boolean> {
    return true;
  }
}

export const [registerAutofillService, getAutofillService] = defineProxyService(
  "AutofillService",
  () => new AutofillService(),
);
