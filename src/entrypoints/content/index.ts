import { contentAutofillMessaging } from "@/lib/autofill/content-autofill-service";
import { FieldAnalyzer } from "./field-analyzer";
import { FormDetector } from "./form-detector";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",

  async main() {
    console.log(
      "🤖 [Superfill] Content script loaded on:",
      window.location.href,
    );

    const fieldAnalyzer = new FieldAnalyzer();
    const formDetector = new FormDetector(fieldAnalyzer);

    contentAutofillMessaging.onMessage("detectForms", async () => {
      try {
        const allForms = formDetector.detectAll();

        const forms = allForms.filter((form) => {
          if (form.fields.length === 0) return false;

          if (form.fields.length === 1) {
            const field = form.fields[0];
            console.log(field);
            const isUnlabeled =
              !field.metadata.labelTag &&
              !field.metadata.labelAria &&
              !field.metadata.placeholder &&
              !field.metadata.labelLeft &&
              !field.metadata.labelRight &&
              !field.metadata.labelTop;

            if (field.metadata.fieldPurpose === "unknown" && isUnlabeled) {
              return false;
            }
          }

          return true;
        });

        const totalFields = forms.reduce(
          (sum, form) => sum + form.fields.length,
          0,
        );

        console.log(
          "🔍 [ContentAutofill] Detected forms and fields:",
          forms.length,
          totalFields,
        );

        forms.forEach((form, index) => {
          console.log(`📋 [ContentAutofill] Form ${index + 1}:`, {
            opid: form.opid,
            name: form.name,
            fieldCount: form.fields.length,
            action: form.action,
            method: form.method,
          });

          form.fields.slice(0, 3).forEach((field) => {
            console.log(`  └─ Field ${field.opid}:`, {
              type: field.metadata.fieldType,
              purpose: field.metadata.fieldPurpose,
              labels: {
                tag: field.metadata.labelTag,
                aria: field.metadata.labelAria,
                placeholder: field.metadata.placeholder,
              },
            });
          });

          if (form.fields.length > 3) {
            console.log(`  └─ ... and ${form.fields.length - 3} more fields`);
          }
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
