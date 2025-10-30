import { defineProxyService } from "@webext-core/proxy-service";
import { contentAutofillMessaging } from "@/lib/autofill/content-autofill-service";
import type { AutofillResult, DetectedField } from "@/types/autofill";

class AutofillService {
  async startAutofillOnActiveTab(): Promise<{
    success: boolean;
    fieldsDetected: number;
    mappingsFound: number;
    error?: string;
  }> {
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab.id) {
        throw new Error("No active tab found");
      }

      const result = await contentAutofillMessaging.sendMessage(
        "detectForms",
        undefined,
        tab.id,
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to detect forms");
      }

      console.log(
        `✅ [AutofillService] Detected ${result.totalFields} fields in ${result.forms.length} forms`,
      );

      // TODO: Process fields and create mappings (TASK-018)
      return {
        success: true,
        fieldsDetected: result.totalFields,
        mappingsFound: 0,
      };
    } catch (error) {
      console.error("❌ [AutofillService] Error starting autofill:", error);
      return {
        success: false,
        fieldsDetected: 0,
        mappingsFound: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async processFields(
    _fields: DetectedField[],
    _pageUrl: string,
  ): Promise<AutofillResult> {
    try {
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
