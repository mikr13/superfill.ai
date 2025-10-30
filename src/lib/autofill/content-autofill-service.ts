import { defineExtensionMessaging } from "@webext-core/messaging";
import type { DetectFormsResult } from "@/types/autofill";

interface ContentAutofillProtocolMap {
  detectForms: () => DetectFormsResult;
  fillField: (data: { fieldOpid: string; value: string }) => boolean;
}

export const contentAutofillMessaging =
  defineExtensionMessaging<ContentAutofillProtocolMap>();
