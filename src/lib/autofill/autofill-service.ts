import { defineProxyService } from "@webext-core/proxy-service";
import { z } from "zod";
import { contentAutofillMessaging } from "@/lib/autofill/content-autofill-service";
import { createLogger } from "@/lib/logger";
import { store } from "@/lib/storage";
import type {
  AutofillResult,
  DetectedField,
  FieldMapping,
  FieldPurpose,
} from "@/types/autofill";
import type { MemoryEntry } from "@/types/memory";

const logger = createLogger("autofill-service");

class AutofillService {
  private static readonly SIMPLE_PURPOSE_KEYWORDS: Record<
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

  private static readonly STOP_WORDS = new Set<string>([
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
  ]);

  private static readonly EMAIL_SCHEMA = z.email();
  private static readonly STRICT_URL_SCHEMA = z.url();
  private static readonly PHONE_REGEX = z.e164();
  private static readonly ZIP_REGEX = z.string().regex(/^[a-z0-9\s-]{3,10}$/i);

  private static readonly MATCH_THRESHOLD = 0.35;
  private static readonly AUTO_FILL_THRESHOLD = 0.75;
  private static readonly MAX_TOKENS = 60;

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

      logger.debug(
        `Detected ${result.totalFields} fields in ${result.forms.length} forms`,
      );

      const allFields = result.forms.flatMap((form) => form.fields);
      const pageUrl = tab.url || "";
      const processingResult = await this.processFields(allFields, pageUrl);

      logger.debug("Autofill processing result:", processingResult);

      if (!processingResult.success) {
        throw new Error(processingResult.error || "Failed to process fields");
      }

      const matchedCount = processingResult.mappings.filter(
        (mapping) => mapping.memoryId !== null,
      ).length;

      logger.debug(
        `Processed ${allFields.length} fields and found ${matchedCount} preliminary matches`,
      );

      return {
        success: true,
        fieldsDetected: result.totalFields,
        mappingsFound: matchedCount,
      };
    } catch (error) {
      logger.error("Error starting autofill:", error);
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
    const startedAt = this.getTimestamp();
    try {
      const fields = _fields.slice();
      if (fields.length === 0) {
        return {
          success: true,
          mappings: [],
          processingTime: 0,
        };
      }

      const memories = await store.memories.getValue();

      if (memories.length === 0) {
        const mappings = fields.map((field) =>
          this.createEmptyMapping(field, "No stored memories available"),
        );

        return {
          success: true,
          mappings,
          processingTime: this.getElapsed(startedAt),
        };
      }

      const mappings = fields.map((field) => this.matchField(field, memories));

      return {
        success: true,
        mappings,
        processingTime: this.getElapsed(startedAt),
      };
    } catch (error) {
      logger.error("Error processing fields:", error);
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

  private matchField(
    field: DetectedField,
    memories: MemoryEntry[],
  ): FieldMapping {
    const fieldTexts = this.collectFieldTexts(field);
    const fieldTokens = this.createTokenSet(fieldTexts);

    const candidates = memories
      .map((memory) => this.calculateMatchScore(field, memory, fieldTokens))
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score);

    if (candidates.length === 0) {
      return this.createEmptyMapping(field, "No matching memory found");
    }

    const bestCandidate = candidates[0];
    const confidence = this.roundConfidence(bestCandidate.score);
    const alternativeMatches = candidates.slice(1, 4).map((candidate) => ({
      memoryId: candidate.memory.id,
      value: candidate.memory.answer,
      confidence: this.roundConfidence(candidate.score),
    }));

    if (bestCandidate.score < AutofillService.MATCH_THRESHOLD) {
      const reasoning =
        bestCandidate.reasons.length > 0
          ? `Top candidate below confidence threshold (${Math.round(confidence * 100)}%). ${bestCandidate.reasons.join(" · ")}`
          : `Top candidate below confidence threshold (${Math.round(confidence * 100)}%).`;

      return {
        fieldOpid: field.opid,
        memoryId: null,
        value: null,
        confidence,
        reasoning,
        alternativeMatches,
        autoFill: false,
      };
    }

    return {
      fieldOpid: field.opid,
      memoryId: bestCandidate.memory.id,
      value: bestCandidate.memory.answer,
      confidence,
      reasoning:
        bestCandidate.reasons.length > 0
          ? bestCandidate.reasons.join(" · ")
          : `Matched based on stored context (${Math.round(confidence * 100)}% confidence)`,
      alternativeMatches,
      autoFill: confidence >= AutofillService.AUTO_FILL_THRESHOLD,
    };
  }

  private calculateMatchScore(
    field: DetectedField,
    memory: MemoryEntry,
    fieldTokens: Set<string>,
  ) {
    const reasons: string[] = [];

    const purposeScore = this.evaluatePurposeMatch(field, memory, reasons);
    const tagScore = this.evaluateTagOverlap(fieldTokens, memory, reasons);
    const labelScore = this.evaluateLabelOverlap(fieldTokens, memory, reasons);
    const valueScore = this.evaluateValueFormat(field, memory, reasons);

    const score = Math.min(
      1,
      purposeScore * 0.5 + tagScore * 0.2 + labelScore * 0.2 + valueScore * 0.1,
    );

    return {
      memory,
      score,
      reasons,
    };
  }

  private evaluatePurposeMatch(
    field: DetectedField,
    memory: MemoryEntry,
    reasons: string[],
  ): number {
    const purpose = field.metadata.fieldPurpose;
    if (purpose === "unknown") {
      return 0;
    }

    const keywords = AutofillService.SIMPLE_PURPOSE_KEYWORDS[purpose] || [
      purpose,
    ];

    const normalizedKeywords = keywords.map((keyword) => keyword.toLowerCase());
    const memoryQuestion = memory.question?.toLowerCase() ?? "";
    const memoryCategory = memory.category.toLowerCase();
    const memoryTags = memory.tags.map((tag) => tag.toLowerCase());

    const matchedTags = memoryTags.filter((tag) =>
      normalizedKeywords.some((keyword) => tag.includes(keyword)),
    );

    const questionMatch = normalizedKeywords.filter(
      (keyword) =>
        memoryQuestion.includes(keyword) || memoryCategory.includes(keyword),
    );

    let baseScore = 0;

    if (matchedTags.length > 0) {
      baseScore = Math.max(baseScore, 0.8);
      reasons.push(
        `Purpose ${purpose} matches memory tags (${matchedTags
          .slice(0, 3)
          .join(", ")})`,
      );
    }

    if (questionMatch.length > 0) {
      baseScore = Math.max(baseScore, 0.6);
      reasons.push(
        `Purpose ${purpose} inferred from memory context (${questionMatch
          .slice(0, 3)
          .join(", ")})`,
      );
    }

    if (purpose === "email") {
      if (AutofillService.isValidEmail(memory.answer)) {
        baseScore = Math.max(baseScore, 0.9);
        reasons.push("Memory answer follows email format");
      }
    } else if (purpose === "phone") {
      if (AutofillService.isValidPhone(memory.answer.trim())) {
        baseScore = Math.max(baseScore, 0.85);
        reasons.push("Memory answer looks like a phone number");
      }
    } else if (purpose === "address" || purpose === "zip") {
      if (AutofillService.isValidZip(memory.answer.trim())) {
        baseScore = Math.max(baseScore, 0.7);
        reasons.push("Memory answer resembles an address component");
      }
    }

    return baseScore;
  }

  private evaluateTagOverlap(
    fieldTokens: Set<string>,
    memory: MemoryEntry,
    reasons: string[],
  ): number {
    if (fieldTokens.size === 0 || memory.tags.length === 0) {
      return 0;
    }

    const memoryTokens = this.createTokenSet(memory.tags);
    const overlap = this.computeOverlap(fieldTokens, memoryTokens);

    if (overlap.size === 0) {
      return 0;
    }

    reasons.push(
      `Shared keywords with memory tags (${Array.from(overlap)
        .slice(0, 3)
        .join(", ")})`,
    );

    return Math.min(1, overlap.size / Math.max(memoryTokens.size, 1));
  }

  private evaluateLabelOverlap(
    fieldTokens: Set<string>,
    memory: MemoryEntry,
    reasons: string[],
  ): number {
    if (fieldTokens.size === 0) {
      return 0;
    }

    const memoryTexts = [memory.question ?? "", memory.category, memory.answer];
    const memoryTokens = this.createTokenSet(
      memoryTexts,
      AutofillService.MAX_TOKENS / 2,
    );
    const overlap = this.computeOverlap(fieldTokens, memoryTokens);

    if (overlap.size === 0) {
      return 0;
    }

    reasons.push(
      `Field labels overlap with memory content (${Array.from(overlap)
        .slice(0, 3)
        .join(", ")})`,
    );

    return Math.min(1, overlap.size / Math.max(fieldTokens.size, 1));
  }

  private evaluateValueFormat(
    field: DetectedField,
    memory: MemoryEntry,
    reasons: string[],
  ): number {
    const value = memory.answer.trim();
    const fieldType = field.metadata.fieldType;

    switch (field.metadata.fieldPurpose) {
      case "email":
        if (AutofillService.isValidEmail(value)) {
          return 1;
        }
        break;
      case "phone":
        if (AutofillService.isValidPhone(value)) {
          return 0.9;
        }
        break;
      case "zip":
        if (AutofillService.isValidZip(value)) {
          return 0.8;
        }
        break;
      default:
        break;
    }

    if (fieldType === "url" && AutofillService.isValidUrl(value)) {
      return 0.9;
    }

    if (value.length > 0 && value.length <= 300) {
      reasons.push("Memory answer length suitable for autofill value");
      return 0.3;
    }

    return 0;
  }

  private static isValidEmail(value: string): boolean {
    return AutofillService.EMAIL_SCHEMA.safeParse(value).success;
  }

  private static isValidPhone(value: string): boolean {
    return AutofillService.PHONE_REGEX.safeParse(value).success;
  }

  private static isValidZip(value: string): boolean {
    return AutofillService.ZIP_REGEX.safeParse(value).success;
  }

  private static isValidUrl(value: string): boolean {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return false;
    }

    const normalized = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;

    return AutofillService.STRICT_URL_SCHEMA.safeParse(normalized).success;
  }

  private collectFieldTexts(field: DetectedField): string[] {
    const metadata = field.metadata;
    const texts = [
      metadata.labelTag,
      metadata.labelAria,
      metadata.labelData,
      metadata.labelLeft,
      metadata.labelRight,
      metadata.labelTop,
      metadata.placeholder,
      metadata.helperText,
      metadata.name,
      metadata.id,
    ];

    return texts.filter((value): value is string => Boolean(value));
  }

  private createTokenSet(texts: string[], limit = AutofillService.MAX_TOKENS) {
    const tokens = new Set<string>();

    for (const text of texts) {
      const normalized = text.toLowerCase();
      const parts = normalized.split(/[^a-z0-9]+/);

      for (const part of parts) {
        if (!part) continue;
        if (part.length === 1 && !/\d/.test(part)) continue;
        if (AutofillService.STOP_WORDS.has(part)) {
          continue;
        }

        tokens.add(part);
        if (tokens.size >= limit) {
          return tokens;
        }
      }
    }

    return tokens;
  }

  private computeOverlap(
    fieldTokens: Set<string>,
    memoryTokens: Set<string>,
  ): Set<string> {
    const overlap = new Set<string>();
    fieldTokens.forEach((token) => {
      if (memoryTokens.has(token)) {
        overlap.add(token);
      }
    });
    return overlap;
  }

  private createEmptyMapping(
    field: DetectedField,
    reason: string,
  ): FieldMapping {
    return {
      fieldOpid: field.opid,
      memoryId: null,
      value: null,
      confidence: 0,
      reasoning: reason,
      alternativeMatches: [],
      autoFill: false,
    };
  }

  private roundConfidence(value: number): number {
    const clamped = Math.max(0, Math.min(1, value));
    return Math.round(clamped * 100) / 100;
  }

  private getTimestamp(): number {
    if (
      typeof performance !== "undefined" &&
      typeof performance.now === "function"
    ) {
      return performance.now();
    }
    return Date.now();
  }

  private getElapsed(start: number): number {
    const end = this.getTimestamp();
    return Math.max(0, Number((end - start).toFixed(2)));
  }
}

export const [registerAutofillService, getAutofillService] = defineProxyService(
  "AutofillService",
  () => new AutofillService(),
);
