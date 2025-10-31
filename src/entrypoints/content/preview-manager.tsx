import { createRoot, type Root } from "react-dom/client";
import previewStylesRaw from "../../styles/autofill-preview.css?inline";
// Import styles as processed strings
import globalStylesRaw from "../../styles/globals.css?inline";
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
  getFieldMetadata: (fieldOpid: FieldOpId) => DetectedField | null;
  getFormMetadata: (formOpid: FormOpId) => DetectedForm | null;
  destroyCallback?: () => void;
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

export class PreviewSidebarManager {
  private readonly options: PreviewSidebarManagerOptions;
  private container: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private mountPoint: HTMLDivElement | null = null;
  private reactRoot: Root | null = null;
  private highlightedElement: HTMLElement | null = null;
  private mappingLookup: Map<string, FieldMapping> = new Map();

  constructor(options: PreviewSidebarManagerOptions) {
    this.options = options;
    ensureHighlightStyle();
  }

  show({ payload }: PreviewShowParams) {
    const renderData = this.buildRenderData(payload);
    if (!renderData) {
      return;
    }

    this.ensureMount();
    this.syncTheme();

    this.reactRoot?.render(
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

    this.reactRoot?.unmount();
    this.reactRoot = null;

    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = "";
      this.shadowRoot = null;
    }

    this.mountPoint = null;

    if (this.container) {
      this.container.remove();
      this.container = null;
    }

    this.mappingLookup.clear();

    if (this.options.destroyCallback) {
      this.options.destroyCallback();
    }
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

  private ensureMount() {
    if (
      this.container &&
      this.shadowRoot &&
      this.mountPoint &&
      this.reactRoot
    ) {
      return;
    }

    this.container = document.createElement("div");
    this.container.id = HOST_ID;
    document.body.append(this.container);

    this.shadowRoot = this.container.attachShadow({ mode: "open" });

    this.mountPoint = document.createElement("div");
    this.mountPoint.id = "superfill-autofill-preview-root";
    this.shadowRoot.append(this.mountPoint);

    this.injectStyles();

    this.reactRoot = createRoot(this.mountPoint);
  }

  private injectStyles() {
    if (!this.shadowRoot) {
      return;
    }

    const combinedStyles = `${globalStylesRaw}\n${previewStylesRaw}`;

    if ("adoptedStyleSheets" in Document.prototype) {
      try {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(combinedStyles);
        this.shadowRoot.adoptedStyleSheets = [sheet];
        return;
      } catch (error) {
        console.warn(
          "Failed to use adoptedStyleSheets, falling back to <style> tag",
          error,
        );
      }
    }

    const style = document.createElement("style");
    style.textContent = combinedStyles;
    this.shadowRoot.append(style);
  }

  private syncTheme() {
    if (!this.container) {
      return;
    }

    const docElement = document.documentElement;

    if (docElement.classList.contains("dark")) {
      this.container.classList.add("dark");
    } else {
      this.container.classList.remove("dark");
    }
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
