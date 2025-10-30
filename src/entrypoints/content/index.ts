import { contentAutofillMessaging } from "@/lib/autofill/content-autofill-service";
import { FormDetector } from "./form-detector";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",

  async main() {
    console.log(
      "🤖 [Superfill] Content script loaded on:",
      window.location.href,
    );

    const formDetector = new FormDetector();

    contentAutofillMessaging.onMessage("detectForms", async () => {
      try {
        const forms = formDetector.detectAll();
        const totalFields = forms.reduce(
          (sum, form) => sum + form.fields.length,
          0,
        );

        forms.forEach((form, index) => {
          console.log(`📋 [ContentAutofill] Form ${index + 1}:`, {
            opid: form.opid,
            name: form.name,
            fieldCount: form.fields.length,
            action: form.action,
            method: form.method,
          });
        });

        console.log(
          `📋 [ContentAutofill] Detected ${forms.length} forms with ${totalFields} total fields`,
        );

        return {
          success: true,
          forms,
          totalFields,
        };
      } catch (error) {
        console.error("❌ [ContentAutofill] Error detecting forms:", error);
        return {
          success: false,
          forms: [],
          totalFields: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    contentAutofillMessaging.onMessage(
      "fillField",
      async ({ data: { fieldOpid, value } }) => {
        // TODO: Implement in TASK-019 - Autofill field population
        console.log(
          `[ContentAutofill] fillField called for ${fieldOpid} with value (not implemented)`,
          value,
        );
        return true;
      },
    );
  },
});
