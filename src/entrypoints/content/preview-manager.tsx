import { createRoot, type Root } from "react-dom/client";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import {
  createShadowRootUi,
  type ShadowRootContentScriptUi,
} from "wxt/utils/content-script-ui/shadow-root";
import type {
  DetectedField,
  DetectedFieldSnapshot,
  DetectedForm,
  DetectedFormSnapshot,
  FieldMapping,
  FieldOpId,
  FormOpId,
  PreviewFieldData,
  PreviewSidebarPayload,
} from "../../types/autofill";
import { AutofillPreview } from "./components/autofill-preview";

const HOST_ID = "superfill-autofill-preview";
const HIGHLIGHT_CLASS = "superfill-autofill-highlight";
const HIGHLIGHT_DARK_CLASS = "superfill-autofill-highlight-dark";
const HIGHLIGHT_STYLE_ID = "superfill-autofill-highlight-style";

const ensureHighlightStyle = () => {
  if (document.getElementById(HIGHLIGHT_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = HIGHLIGHT_STYLE_ID;
  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      outline: 2px solid #2563eb;
      outline-offset: 2px;
      transition: outline 180ms ease, outline-offset 180ms ease;
    }
    .${HIGHLIGHT_CLASS}.${HIGHLIGHT_DARK_CLASS} {
      outline-color: #38bdf8;
    }
  `;
  document.head.append(style);
};

const getPrimaryLabel = (
  metadata: DetectedFieldSnapshot["metadata"],
): string => {
  const candidates = [
    metadata.labelTag,
    metadata.labelAria,
    metadata.labelData,
    metadata.labelTop,
    metadata.labelLeft,
    metadata.labelRight,
    metadata.placeholder,
    metadata.name,
    metadata.id,
  ];

  for (const candidate of candidates) {
    if (candidate && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return metadata.type;
};

const buildPreviewFields = (
  form: DetectedFormSnapshot,
  mappingLookup: Map<string, FieldMapping>,
): PreviewFieldData[] =>
  form.fields.map(
    (field: DetectedFormSnapshot["fields"][number]): PreviewFieldData => {
      const mapping =
        mappingLookup.get(field.opid) ??
        ({
          fieldOpid: field.opid,
          memoryId: null,
          value: null,
          confidence: 0,
          reasoning: "No suggestion generated",
          alternativeMatches: [],
          autoFill: false,
        } satisfies FieldMapping);

      return {
        fieldOpid: field.opid,
        formOpid: field.formOpid,
        metadata: field.metadata,
        mapping,
        primaryLabel: getPrimaryLabel(field.metadata),
      };
    },
  );

type PreviewSidebarManagerOptions = {
  ctx: ContentScriptContext;
  getFieldMetadata: (fieldOpid: FieldOpId) => DetectedField | null;
  getFormMetadata: (formOpid: FormOpId) => DetectedForm | null;
};

type PreviewShowParams = {
  payload: PreviewSidebarPayload;
};

export type PreviewRenderData = {
  forms: Array<{
    snapshot: DetectedFormSnapshot;
    fields: PreviewFieldData[];
  }>;
  summary: {
    totalFields: number;
    matchedFields: number;
    processingTime?: number;
  };
};

type MountedRoot = Root;

export class PreviewSidebarManager {
  private readonly options: PreviewSidebarManagerOptions;
  private ui: ShadowRootContentScriptUi<MountedRoot> | null = null;
  private reactRoot: Root | null = null;
  private hostElement: HTMLElement | null = null;
  private highlightedElement: HTMLElement | null = null;
  private mappingLookup: Map<string, FieldMapping> = new Map();

  constructor(options: PreviewSidebarManagerOptions) {
    this.options = options;
    ensureHighlightStyle();
  }

  async show({ payload }: PreviewShowParams) {
    const renderData = this.buildRenderData(payload);
    if (!renderData) {
      return;
    }

    const ui = await this.ensureUi();
    ui.mount();

    const root = ui.mounted ?? this.reactRoot;
    if (!root) {
      return;
    }

    this.reactRoot = root;
    this.syncTheme();

    root.render(
      <AutofillPreview
        data={renderData}
        onClose={() => this.destroy()}
        onFill={(selected: FieldOpId[]) => this.handleFill(selected)}
        onHighlight={(fieldOpid: FieldOpId) => this.highlightField(fieldOpid)}
        onUnhighlight={() => this.clearHighlight()}
      />,
    );
  }

  destroy() {
    this.clearHighlight();

    if (this.ui) {
      this.ui.remove();
    }

    this.mappingLookup.clear();
  }

  private handleFill(selectedFieldOpids: FieldOpId[]) {
    for (const fieldOpid of selectedFieldOpids) {
      const detected = this.options.getFieldMetadata(fieldOpid);
      if (!detected) {
        continue;
      }

      const mapping = this.mappingLookup.get(fieldOpid);
      if (!mapping || !mapping.value) {
        continue;
      }

      this.applyValueToElement(detected.element, mapping.value);
    }

    this.destroy();
  }

  private applyValueToElement(
    element: DetectedField["element"],
    value: string,
  ) {
    if (element instanceof HTMLInputElement) {
      element.focus({ preventScroll: true });

      if (element.type === "checkbox" || element.type === "radio") {
        element.checked = value === "true" || value === "on" || value === "1";
      } else {
        element.value = value;
      }

      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    if (element instanceof HTMLTextAreaElement) {
      element.focus({ preventScroll: true });
      element.value = value;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    if (element instanceof HTMLSelectElement) {
      const normalizedValue = value.toLowerCase();
      let matched = false;

      for (const option of Array.from(element.options)) {
        if (
          option.value.toLowerCase() === normalizedValue ||
          option.text.toLowerCase() === normalizedValue
        ) {
          option.selected = true;
          matched = true;
          break;
        }
      }

      if (!matched) {
        element.value = value;
      }

      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  private highlightField(fieldOpid: FieldOpId) {
    const detected = this.options.getFieldMetadata(fieldOpid);
    if (!detected) {
      return;
    }

    this.clearHighlight();

    const element = detected.element as HTMLElement;
    if (!element) {
      return;
    }

    if (document.documentElement.classList.contains("dark")) {
      element.classList.add(HIGHLIGHT_DARK_CLASS);
    }

    element.classList.add(HIGHLIGHT_CLASS);
    this.highlightedElement = element;
  }

  private clearHighlight() {
    if (!this.highlightedElement) {
      return;
    }

    this.highlightedElement.classList.remove(
      HIGHLIGHT_CLASS,
      HIGHLIGHT_DARK_CLASS,
    );
    this.highlightedElement = null;
  }

  private syncTheme() {
    if (!this.hostElement) {
      return;
    }

    const docElement = document.documentElement;

    if (docElement.classList.contains("dark")) {
      this.hostElement.classList.add("dark");
    } else {
      this.hostElement.classList.remove("dark");
    }
  }

  private async ensureUi(): Promise<ShadowRootContentScriptUi<MountedRoot>> {
    if (this.ui) {
      return this.ui;
    }

    this.ui = await createShadowRootUi<MountedRoot>(this.options.ctx, {
      name: "superfill-preview-ui",
      position: "overlay",
      anchor: "body",
      onMount: (uiContainer, _shadow, host) => {
        host.id = HOST_ID;

        // Explicitly set positioning styles to override WXT defaults
        host.style.cssText = `
          position: fixed !important;
          top: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          left: auto !important;
          width: clamp(320px, 28vw, 420px) !important;
          height: 100vh !important;
          max-height: 100vh !important;
          z-index: 2147483647 !important;
          overflow: visible !important;
          display: block !important;
          pointer-events: none !important;
        `;

        // Clear container
        uiContainer.innerHTML = "";

        const mountPoint = document.createElement("div");
        mountPoint.id = "superfill-autofill-preview-root";
        mountPoint.style.cssText = `
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        `;
        uiContainer.append(mountPoint);

        const root = createRoot(mountPoint);

        this.reactRoot = root;
        this.hostElement = host;
        this.syncTheme();

        return root;
      },
      onRemove: (mounted) => {
        mounted?.unmount();
        this.reactRoot = null;
        this.hostElement = null;
      },
    });

    return this.ui;
  }

  private buildRenderData(
    payload: PreviewSidebarPayload,
  ): PreviewRenderData | null {
    if (!payload.forms.length) {
      return null;
    }

    this.mappingLookup = new Map(
      payload.mappings.map((mapping: FieldMapping) => [
        mapping.fieldOpid,
        mapping,
      ]),
    );

    const forms = payload.forms.map((form: DetectedFormSnapshot) => ({
      snapshot: form,
      fields: buildPreviewFields(form, this.mappingLookup),
    }));

    const totalFields = payload.forms.reduce(
      (sum: number, form: DetectedFormSnapshot) => sum + form.fields.length,
      0,
    );

    const matchedFields = payload.mappings.filter(
      (mapping: FieldMapping) => mapping.memoryId !== null,
    ).length;

    return {
      forms,
      summary: {
        totalFields,
        matchedFields,
        processingTime: payload.processingTime,
      },
    };
  }
}
