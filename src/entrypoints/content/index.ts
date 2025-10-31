import "./content.css";

import { contentAutofillMessaging } from "@/lib/autofill/content-autofill-service";
import { createLogger } from "@/lib/logger";
import type {
  DetectedField,
  DetectedForm,
  DetectedFormSnapshot,
  FieldOpId,
  FormOpId,
  PreviewSidebarPayload,
} from "@/types/autofill";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { FieldAnalyzer } from "./field-analyzer";
import { FormDetector } from "./form-detector";
import { PreviewSidebarManager } from "./preview-manager";

const logger = createLogger("content");

const formCache = new Map<FormOpId, DetectedForm>();
const fieldCache = new Map<FieldOpId, DetectedField>();
let serializedFormCache: DetectedFormSnapshot[] = [];
let previewManager: PreviewSidebarManager | null = null;

const cacheDetectedForms = (forms: DetectedForm[]) => {
  formCache.clear();
  fieldCache.clear();

  for (const form of forms) {
    formCache.set(form.opid, form);

    for (const field of form.fields) {
      fieldCache.set(field.opid, field);
    }
  }
};

const serializeForms = (forms: DetectedForm[]): DetectedFormSnapshot[] =>
  forms.map((form) => ({
    opid: form.opid,
    action: form.action,
    method: form.method,
    name: form.name,
    fields: form.fields.map((field) => {
      const { rect, ...metadata } = field.metadata;

      return {
        opid: field.opid,
        formOpid: field.formOpid,
        metadata: {
          ...metadata,
          rect: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left,
          } as DOMRectInit,
        },
      } satisfies DetectedFormSnapshot["fields"][number];
    }),
  }));

const ensurePreviewManager = (ctx: ContentScriptContext) => {
  if (!previewManager) {
    previewManager = new PreviewSidebarManager({
      ctx,
      getFieldMetadata: (fieldOpid) => fieldCache.get(fieldOpid) ?? null,
      getFormMetadata: (formOpid) => formCache.get(formOpid) ?? null,
    });
  }

  return previewManager;
};

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",
  runAt: "document_idle",

  async main(ctx) {
    logger.info("Content script loaded on:", window.location.href);

    const fieldAnalyzer = new FieldAnalyzer();
    const formDetector = new FormDetector(fieldAnalyzer);

    contentAutofillMessaging.onMessage("detectForms", async () => {
      try {
        const allForms = formDetector.detectAll();

        const forms = allForms.filter((form) => {
          if (form.fields.length === 0) return false;

          if (form.fields.length === 1) {
            const field = form.fields[0];
            logger.info("Single field form:", field);
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

        cacheDetectedForms(forms);
        serializedFormCache = serializeForms(forms);

        const totalFields = forms.reduce(
          (sum, form) => sum + form.fields.length,
          0,
        );

        logger.info("Detected forms and fields:", forms.length, totalFields);

        forms.forEach((form, index) => {
          logger.info(`Form ${index + 1}:`, {
            opid: form.opid,
            name: form.name,
            fieldCount: form.fields.length,
            action: form.action,
            method: form.method,
          });

          form.fields.slice(0, 3).forEach((field) => {
            logger.info(`  └─ Field ${field.opid}:`, {
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
            logger.info(`  └─ ... and ${form.fields.length - 3} more fields`);
          }
        });

        logger.info(
          `Detected ${forms.length} forms with ${totalFields} total fields`,
        );

        return {
          success: true,
          forms: serializedFormCache,
          totalFields,
        };
      } catch (error) {
        logger.error("Error detecting forms:", error);
        return {
          success: false,
          forms: [],
          totalFields: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    contentAutofillMessaging.onMessage(
      "showPreview",
      async ({ data }: { data: PreviewSidebarPayload }) => {
        logger.info("Received preview payload from background", {
          mappings: data.mappings.length,
          forms: data.forms.length,
        });

        const manager = ensurePreviewManager(ctx);
        await manager.show({
          payload: data,
        });

        return true;
      },
    );

    contentAutofillMessaging.onMessage("closePreview", async () => {
      if (previewManager) {
        previewManager.destroy();
      }

      return true;
    });

    // Temporarily show contentAutofill permanent UI for testing
    // const manager = ensurePreviewManager(ctx);
    // await manager.show({
    //   payload: {
    //     mappings: [
    //       {
    //         fieldOpid: "__0" as FieldOpId,
    //         memoryId: "memory_123",
    //         autoFill: true,
    //         value: "Test Value",
    //         confidence: 0.95,
    //         reasoning: "Test reasoning",
    //         alternativeMatches: [],
    //       },
    //     ],
    //     forms: [
    //       {
    //         opid: "__form_0" as FormOpId,
    //         action: "https://example.com/submit",
    //         method: "POST",
    //         name: "Test Form",
    //         fields: [
    //           {
    //             opid: "__0" as FieldOpId,
    //             formOpid: "__form_0" as FormOpId,
    //             metadata: {
    //               autocomplete: "name",
    //               className: "input-name",
    //               id: "name-field",
    //               labelAria: "Full Name",
    //               labelData: "Name",
    //               labelLeft: null,
    //               labelRight: null,
    //               labelTag: "Name",
    //               labelTop: null,
    //               helperText: "Please enter your full name",
    //               placeholder: "John Doe",
    //               name: "fullname",
    //               type: "text",
    //               currentValue: "",
    //               disabled: false,
    //               readonly: false,
    //               maxLength: 100,
    //               required: true,
    //               fieldType: "text",
    //               fieldPurpose: "name",
    //               rect: {
    //                 x: 100,
    //                 y: 100,
    //                 width: 200,
    //                 height: 30,
    //               },
    //             },
    //           },
    //           {
    //             opid: "__1" as FieldOpId,
    //             formOpid: "__form_1" as FormOpId,
    //             metadata: {
    //               autocomplete: "name",
    //               className: "input-name",
    //               id: "name-field-1",
    //               labelAria: "Full Name",
    //               labelData: "Name",
    //               labelLeft: null,
    //               labelRight: null,
    //               labelTag: "Name",
    //               labelTop: null,
    //               helperText: "Please enter your full name",
    //               placeholder: "John Doe",
    //               name: "fullname",
    //               type: "text",
    //               currentValue: "",
    //               disabled: false,
    //               readonly: false,
    //               maxLength: 100,
    //               required: true,
    //               fieldType: "text",
    //               fieldPurpose: "name",
    //               rect: {
    //                 x: 100,
    //                 y: 100,
    //                 width: 200,
    //                 height: 30,
    //               },
    //             },
    //           },
    //           {
    //             opid: "__3" as FieldOpId,
    //             formOpid: "__form_3" as FormOpId,
    //             metadata: {
    //               autocomplete: "name",
    //               className: "input-name",
    //               id: "name-field-1",
    //               labelAria: "Full Name",
    //               labelData: "Name",
    //               labelLeft: null,
    //               labelRight: null,
    //               labelTag: "Name",
    //               labelTop: null,
    //               helperText: "Please enter your full name",
    //               placeholder: "John Doe",
    //               name: "fullname",
    //               type: "text",
    //               currentValue: "",
    //               disabled: false,
    //               readonly: false,
    //               maxLength: 100,
    //               required: true,
    //               fieldType: "text",
    //               fieldPurpose: "name",
    //               rect: {
    //                 x: 100,
    //                 y: 100,
    //                 width: 200,
    //                 height: 30,
    //               },
    //             },
    //           },
    //           {
    //             opid: "__4" as FieldOpId,
    //             formOpid: "__form_4" as FormOpId,
    //             metadata: {
    //               autocomplete: "name",
    //               className: "input-name",
    //               id: "name-field-1",
    //               labelAria: "Full Name",
    //               labelData: "Name",
    //               labelLeft: null,
    //               labelRight: null,
    //               labelTag: "Name",
    //               labelTop: null,
    //               helperText: "Please enter your full name",
    //               placeholder: "John Doe",
    //               name: "fullname",
    //               type: "text",
    //               currentValue: "",
    //               disabled: false,
    //               readonly: false,
    //               maxLength: 100,
    //               required: true,
    //               fieldType: "text",
    //               fieldPurpose: "name",
    //               rect: {
    //                 x: 100,
    //                 y: 100,
    //                 width: 200,
    //                 height: 30,
    //               },
    //             },
    //           },
    //         ],
    //       },
    //     ],
    //   },
    // });
    // End temporary UI show
  },
});
