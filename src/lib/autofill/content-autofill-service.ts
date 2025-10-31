import { defineExtensionMessaging } from "@webext-core/messaging";
import type {
  DetectFormsResult,
  PreviewSidebarPayload,
} from "@/types/autofill";

interface ContentAutofillProtocolMap {
  detectForms: () => DetectFormsResult;
  fillField: (data: { fieldOpid: string; value: string }) => boolean;
  showPreview: (data: PreviewSidebarPayload) => boolean;
  closePreview: () => boolean;
}

export const contentAutofillMessaging =
  defineExtensionMessaging<ContentAutofillProtocolMap>();
