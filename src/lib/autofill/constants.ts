import type { FieldPurpose } from "@/types/autofill";

export const SIMPLE_FIELD_PURPOSES: readonly FieldPurpose[] = [
  "name",
  "email",
  "phone",
] as const;

export const SIMPLE_FIELD_CONFIDENCE = 0.95;

export const FIELD_PURPOSE_KEYWORDS: Record<
  Exclude<FieldPurpose, "unknown">,
  readonly string[]
> = {
  name: ["name", "fullname", "first", "last", "given", "family"],
  email: ["email", "mail", "e-mail", "inbox"],
  phone: ["phone", "tel", "mobile", "cell", "telephone"],
  address: ["address", "street", "addr", "location"],
  city: ["city", "town"],
  state: ["state", "province", "region"],
  zip: ["zip", "postal", "postcode"],
  country: ["country", "nation"],
  company: ["company", "organization", "employer", "business"],
  title: ["title", "position", "role", "job"],
} as const;

export const MAX_FIELDS_PER_PAGE = 200;

export const MAX_MEMORIES_FOR_MATCHING = 50;

export const CONFIDENCE_LEVELS = {
  HIGH: 0.8,
  MEDIUM: 0.5,
  LOW: 0.0,
} as const;

export const MIN_MATCH_CONFIDENCE = 0.35;

export const AUTO_FILL_THRESHOLD = 0.75;

export const MAX_FIELD_CONTEXT_TOKENS = 100;

export const STOP_WORDS = new Set<string>([
  "the",
  "and",
  "for",
  "with",
  "your",
  "please",
  "enter",
  "type",
  "here",
  "click",
  "select",
  "choose",
  "submit",
  "field",
  "form",
  "info",
  "information",
  "optional",
  "required",
]);
