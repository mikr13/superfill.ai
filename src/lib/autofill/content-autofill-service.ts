import type {
  DetectFormsResult,
  PreviewSidebarPayload,
} from "@/types/autofill";
import { defineExtensionMessaging } from "@webext-core/messaging";

interface ContentAutofillProtocolMap {
  detectForms: () => DetectFormsResult;
  showPreview: (data: PreviewSidebarPayload) => boolean;
  closePreview: () => boolean;
}

export const contentAutofillMessaging =
  defineExtensionMessaging<ContentAutofillProtocolMap>();
