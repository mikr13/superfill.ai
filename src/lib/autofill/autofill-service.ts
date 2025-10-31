import { defineProxyService } from "@webext-core/proxy-service";
import { z } from "zod";
import { contentAutofillMessaging } from "@/lib/autofill/content-autofill-service";
import { createLogger } from "@/lib/logger";
import type { AIProvider } from "@/lib/providers/registry";
import { store } from "@/lib/storage";
import type {
  AutofillResult,
  CompressedFieldData,
  CompressedMemoryData,
  DetectedFieldSnapshot,
  DetectedFormSnapshot,
  FieldMapping,
  PreviewSidebarPayload,
} from "@/types/autofill";
import type { MemoryEntry } from "@/types/memory";
import { AIMatcher } from "./ai-matcher";
import {
  MAX_FIELDS_PER_PAGE,
  MAX_MEMORIES_FOR_MATCHING,
  SIMPLE_FIELD_CONFIDENCE,
  SIMPLE_FIELD_PURPOSES,
} from "./constants";
import { FallbackMatcher } from "./fallback-matcher";
import { createEmptyMapping } from "./mapping-utils";

const logger = createLogger("autofill-service");

class AutofillService {
  private aiMatcher: AIMatcher;
  private fallbackMatcher: FallbackMatcher;
  private static readonly EMAIL_SCHEMA = z.email();
  private static readonly PHONE_SCHEMA = z.string().regex(/^\+?[1-9]\d{1,14}$/);

  constructor() {
    this.aiMatcher = new AIMatcher();
    this.fallbackMatcher = new FallbackMatcher();
  }

  async startAutofillOnActiveTab(apiKey?: string): Promise<{
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

      logger.info(
        `Detected ${result.totalFields} fields in ${result.forms.length} forms`,
      );

      const forms = result.forms;
      const allFields = forms.flatMap((form) => form.fields);
      const pageUrl = tab.url || "";
      const processingResult = await this.processForms(forms, pageUrl, apiKey);

      logger.info("Autofill processing result:", processingResult);

      try {
        await contentAutofillMessaging.sendMessage(
          "showPreview",
          this.buildPreviewPayload(forms, processingResult),
          tab.id,
        );
      } catch (previewError) {
        logger.error("Failed to send preview payload:", previewError);
      }

      if (!processingResult.success) {
        throw new Error(processingResult.error || "Failed to process fields");
      }

      const matchedCount = processingResult.mappings.filter(
        (mapping) => mapping.memoryId !== null,
      ).length;

      logger.info(
        `Processed ${allFields.length} fields and found ${matchedCount} matches`,
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

  private async processForms(
    forms: DetectedFormSnapshot[],
    _pageUrl: string,
    apiKey?: string,
  ): Promise<AutofillResult> {
    const startTime = performance.now();

    try {
      if (forms.length === 0) {
        return {
          success: true,
          mappings: [],
          processingTime: 0,
        };
      }

      const fields = forms.flatMap((form) => form.fields);

      const nonPasswordFields = fields.filter(
        (field) => field.metadata.fieldType !== "password",
      );

      const passwordFieldsCount = fields.length - nonPasswordFields.length;
      if (passwordFieldsCount > 0) {
        logger.info(`Filtered out ${passwordFieldsCount} password fields`);
      }

      const fieldsToProcess = nonPasswordFields.slice(0, MAX_FIELDS_PER_PAGE);
      if (fieldsToProcess.length < nonPasswordFields.length) {
        logger.warn(
          `Limited processing to ${MAX_FIELDS_PER_PAGE} fields out of ${nonPasswordFields.length}`,
        );
      }

      const allMemories = await store.memories.getValue();

      if (allMemories.length === 0) {
        return {
          success: true,
          mappings: fieldsToProcess.map((field) =>
            createEmptyMapping<DetectedFieldSnapshot, FieldMapping>(
              field,
              "No stored memories available",
            ),
          ),
          processingTime: performance.now() - startTime,
        };
      }

      const memories = allMemories.slice(0, MAX_MEMORIES_FOR_MATCHING);
      const { simpleFields, complexFields } =
        this.categorizeFields(fieldsToProcess);

      logger.info(
        `Categorized ${simpleFields.length} simple fields and ${complexFields.length} complex fields`,
      );

      const simpleMappings = await this.matchSimpleFields(
        simpleFields,
        memories,
      );
      const complexMappings = await this.matchComplexFields(
        complexFields,
        memories,
        apiKey,
      );
      const allMappings = this.combineMappings(
        fieldsToProcess,
        simpleMappings,
        complexMappings,
      );
      const processingTime = performance.now() - startTime;

      logger.info(
        `Autofill completed in ${processingTime.toFixed(2)}ms: ${simpleMappings.length} simple + ${complexMappings.length} complex`,
      );

      return {
        success: true,
        mappings: allMappings,
        processingTime,
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

  private categorizeFields(fields: DetectedFieldSnapshot[]): {
    simpleFields: DetectedFieldSnapshot[];
    complexFields: DetectedFieldSnapshot[];
  } {
    const simpleFields: DetectedFieldSnapshot[] = [];
    const complexFields: DetectedFieldSnapshot[] = [];

    for (const field of fields) {
      const purpose = field.metadata.fieldPurpose;

      if (SIMPLE_FIELD_PURPOSES.includes(purpose)) {
        simpleFields.push(field);
      } else {
        complexFields.push(field);
      }
    }

    return { simpleFields, complexFields };
  }

  private async matchSimpleFields(
    fields: DetectedFieldSnapshot[],
    memories: MemoryEntry[],
  ): Promise<FieldMapping[]> {
    return fields.map((field) => this.matchSingleSimpleField(field, memories));
  }

  private matchSingleSimpleField(
    field: DetectedFieldSnapshot,
    memories: MemoryEntry[],
  ): FieldMapping {
    const purpose = field.metadata.fieldPurpose;

    const relevantMemories = memories.filter((memory) => {
      const category = memory.category.toLowerCase();
      const tags = memory.tags.map((t) => t.toLowerCase());

      if (purpose === "email") {
        return (
          category.includes("email") ||
          category.includes("contact") ||
          tags.some((t) => t.includes("email"))
        );
      }

      if (purpose === "phone") {
        return (
          category.includes("phone") ||
          category.includes("contact") ||
          tags.some((t) => t.includes("phone") || t.includes("tel"))
        );
      }

      if (purpose === "name") {
        return (
          category.includes("name") ||
          category.includes("personal") ||
          tags.some((t) => t.includes("name"))
        );
      }

      return false;
    });

    if (relevantMemories.length === 0) {
      return createEmptyMapping<DetectedFieldSnapshot, FieldMapping>(
        field,
        `No ${purpose} memory found`,
      );
    }

    const scoredMemories = relevantMemories
      .map((memory) => ({
        memory,
        score: this.scoreSimpleFieldMatch(field, memory),
      }))
      .filter((scored) => scored.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scoredMemories.length === 0) {
      return createEmptyMapping<DetectedFieldSnapshot, FieldMapping>(
        field,
        `No valid ${purpose} format in memories`,
      );
    }

    const bestMatch = scoredMemories[0];
    const alternativeMatches = scoredMemories.slice(1, 4).map((scored) => ({
      memoryId: scored.memory.id,
      value: scored.memory.answer,
      confidence: scored.score,
    }));

    return {
      fieldOpid: field.opid,
      memoryId: bestMatch.memory.id,
      value: bestMatch.memory.answer,
      confidence: SIMPLE_FIELD_CONFIDENCE,
      reasoning: `Direct ${purpose} match with validation`,
      alternativeMatches,
      autoFill: true,
    };
  }

  private scoreSimpleFieldMatch(
    field: DetectedFieldSnapshot,
    memory: MemoryEntry,
  ): number {
    const purpose = field.metadata.fieldPurpose;
    const value = memory.answer.trim();

    if (purpose === "email") {
      return AutofillService.EMAIL_SCHEMA.safeParse(value).success ? 1 : 0;
    }

    if (purpose === "phone") {
      return AutofillService.PHONE_SCHEMA.safeParse(value).success ? 0.9 : 0;
    }

    if (purpose === "name") {
      // Name validation: 2-100 chars, contains letters
      if (value.length >= 2 && value.length <= 100 && /[a-z]/i.test(value)) {
        return 0.95;
      }
      return 0;
    }

    return 0;
  }

  private async matchComplexFields(
    fields: DetectedFieldSnapshot[],
    memories: MemoryEntry[],
    apiKey?: string,
  ): Promise<FieldMapping[]> {
    if (fields.length === 0) {
      return [];
    }

    const compressedFields = fields.map((f) => this.compressField(f));
    const compressedMemories = memories.map((m) => this.compressMemory(m));

    try {
      const userSettings = await store.userSettings.getValue();
      const provider = userSettings.selectedProvider as AIProvider;

      if (!apiKey) {
        logger.warn("No API key found, using fallback matcher");
        return await this.fallbackMatcher.matchFields(
          compressedFields,
          compressedMemories,
        );
      }

      return await this.aiMatcher.matchFields(
        compressedFields,
        compressedMemories,
        provider,
        apiKey,
      );
    } catch (error) {
      logger.error("AI matching failed, using fallback:", error);
      return await this.fallbackMatcher.matchFields(
        compressedFields,
        compressedMemories,
      );
    }
  }

  private compressField(field: DetectedFieldSnapshot): CompressedFieldData {
    const labels = [
      field.metadata.labelTag,
      field.metadata.labelAria,
      field.metadata.labelData,
      field.metadata.labelLeft,
      field.metadata.labelRight,
      field.metadata.labelTop,
    ].filter(Boolean) as string[];

    const context = [
      field.metadata.placeholder,
      field.metadata.helperText,
      field.metadata.name,
      field.metadata.id,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      opid: field.opid,
      type: field.metadata.fieldType,
      purpose: field.metadata.fieldPurpose,
      labels,
      context,
    };
  }

  private compressMemory(memory: MemoryEntry): CompressedMemoryData {
    return {
      id: memory.id,
      question: memory.question || "",
      answer: memory.answer,
      category: memory.category,
    };
  }

  private combineMappings(
    originalFields: DetectedFieldSnapshot[],
    simpleMappings: FieldMapping[],
    complexMappings: FieldMapping[],
  ): FieldMapping[] {
    const mappingMap = new Map<string, FieldMapping>();

    for (const mapping of [...simpleMappings, ...complexMappings]) {
      mappingMap.set(mapping.fieldOpid, mapping);
    }

    return originalFields.map((field) => {
      const mapping = mappingMap.get(field.opid);
      if (!mapping) {
        return createEmptyMapping<DetectedFieldSnapshot, FieldMapping>(
          field,
          "No mapping generated",
        );
      }
      return mapping;
    });
  }

  private buildPreviewPayload(
    forms: DetectedFormSnapshot[],
    processingResult: AutofillResult,
  ): PreviewSidebarPayload {
    return {
      forms,
      mappings: processingResult.mappings,
      processingTime: processingResult.processingTime,
    };
  }

  async testConnection(): Promise<boolean> {
    return true;
  }
}

export const [registerAutofillService, getAutofillService] = defineProxyService(
  "AutofillService",
  () => new AutofillService(),
);
