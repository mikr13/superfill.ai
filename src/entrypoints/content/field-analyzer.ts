import type {
  DetectedField,
  FieldMetadata,
  FieldPurpose,
  FieldType,
  FormFieldElement,
} from "@/types/autofill";

export class FieldAnalyzer {
  private labelCache = new WeakMap<Element, string | null>();

  analyzeField(field: DetectedField): FieldMetadata {
    const element = field.element;

    const basicAttrs = this.extractBasicAttributes(element);
    const labels = this.extractLabels(element);
    const fieldType = this.classifyFieldType(element);

    const metadata: Omit<FieldMetadata, "fieldPurpose"> = {
      ...basicAttrs,
      ...labels,
      fieldType,
      rect: element.getBoundingClientRect(),
      currentValue: this.getCurrentValue(element),
    };

    return {
      ...metadata,
      fieldPurpose: this.inferFieldPurpose(metadata, fieldType),
    };
  }

  private extractBasicAttributes(element: FormFieldElement) {
    return {
      id: element.getAttribute("id") || null,
      name: element.getAttribute("name") || null,
      className: element.getAttribute("class") || null,
      type: element.getAttribute("type") || element.tagName.toLowerCase(),
      placeholder: element.getAttribute("placeholder") || null,
      autocomplete: element.getAttribute("autocomplete") || null,
      required: element.hasAttribute("required"),
      disabled: element.hasAttribute("disabled"),
      readonly: element.hasAttribute("readonly"),
      maxLength:
        element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement
          ? element.maxLength > 0
            ? element.maxLength
            : null
          : null,
    };
  }

  private extractLabels(element: FormFieldElement) {
    return {
      labelTag: this.findExplicitLabel(element),
      labelData: element.getAttribute("data-label") || null,
      labelAria: this.findAriaLabel(element),
      labelLeft: this.findPositionalLabel(element, "left"),
      labelRight: this.findPositionalLabel(element, "right"),
      labelTop: this.findPositionalLabel(element, "top"),
      helperText: this.findHelperText(element),
    };
  }

  private findExplicitLabel(element: FormFieldElement): string | null {
    if (element.id) {
      const label = document.querySelector<HTMLLabelElement>(
        `label[for="${element.id}"]`,
      );
      if (label) {
        return this.cleanText(label.textContent || "");
      }
    }

    const parentLabel = element.closest("label");
    if (parentLabel) {
      const clone = parentLabel.cloneNode(true) as HTMLLabelElement;
      const inputs = clone.querySelectorAll("input, select, textarea");
      for (const input of Array.from(inputs)) {
        input.remove();
      }
      return this.cleanText(clone.textContent || "");
    }

    return null;
  }

  private findAriaLabel(element: FormFieldElement): string | null {
    const ariaLabel = element.getAttribute("aria-label");
    if (ariaLabel) {
      return this.cleanText(ariaLabel);
    }

    const ariaLabelledBy = element.getAttribute("aria-labelledby");
    if (ariaLabelledBy) {
      const labelElement = document.getElementById(ariaLabelledBy);
      if (labelElement) {
        return this.cleanText(labelElement.textContent || "");
      }
    }

    return null;
  }

  private findPositionalLabel(
    element: FormFieldElement,
    direction: "left" | "right" | "top",
  ): string | null {
    if (this.labelCache.has(element)) {
      return this.labelCache.get(element) || null;
    }

    const rect = element.getBoundingClientRect();
    const threshold = direction === "top" ? 100 : 200;
    const candidates: Array<{ element: Element; distance: number }> = [];

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const text = node.textContent?.trim();
          if (!text || text.length < 2) return NodeFilter.FILTER_REJECT;

          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;

          const tagName = parent.tagName.toLowerCase();
          if (
            [
              "script",
              "style",
              "noscript",
              "input",
              "textarea",
              "select",
              "button",
              "a",
            ].includes(tagName)
          ) {
            return NodeFilter.FILTER_REJECT;
          }

          if (direction === "top") {
            let ancestor: HTMLElement | null = parent;
            let depth = 0;
            while (ancestor && depth < 3) {
              const ancestorTag = ancestor.tagName.toLowerCase();
              if (["button", "a"].includes(ancestorTag)) {
                return NodeFilter.FILTER_REJECT;
              }
              if (
                ancestor.className &&
                typeof ancestor.className === "string" &&
                /\b(btn|button|cta|action)\b/i.test(ancestor.className)
              ) {
                return NodeFilter.FILTER_REJECT;
              }
              ancestor = ancestor.parentElement;
              depth++;
            }

            if (text.length < 3) return NodeFilter.FILTER_REJECT;

            if (/^(or|and|with|continue|sign|login|register)$/i.test(text)) {
              return NodeFilter.FILTER_REJECT;
            }
          }

          return NodeFilter.FILTER_ACCEPT;
        },
      },
    );

    let node: Node | null = walker.nextNode();
    while (node && candidates.length < 20) {
      const parent = node.parentElement;
      if (!parent) {
        node = walker.nextNode();
        continue;
      }

      const parentRect = parent.getBoundingClientRect();
      const distance = this.calculateDistance(rect, parentRect, direction);

      if (distance !== null && distance < threshold) {
        candidates.push({ element: parent, distance });
      }

      node = walker.nextNode();
    }

    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((a, b) => a.distance - b.distance);
    const label = this.cleanText(candidates[0].element.textContent || "");

    this.labelCache.set(element, label);
    return label;
  }

  private calculateDistance(
    fieldRect: DOMRect,
    labelRect: DOMRect,
    direction: "left" | "right" | "top",
  ): number | null {
    const verticalOverlap =
      Math.max(
        0,
        Math.min(fieldRect.bottom, labelRect.bottom) -
        Math.max(fieldRect.top, labelRect.top),
      ) > 0;

    switch (direction) {
      case "left":
        if (!verticalOverlap || labelRect.right > fieldRect.left) return null;
        return fieldRect.left - labelRect.right;

      case "right":
        if (!verticalOverlap || labelRect.left < fieldRect.right) return null;
        return labelRect.left - fieldRect.right;

      case "top": {
        if (labelRect.bottom > fieldRect.top) return null;

        const horizontalOverlap =
          Math.min(fieldRect.right, labelRect.right) >
          Math.max(fieldRect.left, labelRect.left);

        if (!horizontalOverlap) {
          const horizontalDistance = Math.min(
            Math.abs(fieldRect.left - labelRect.right),
            Math.abs(labelRect.left - fieldRect.right),
          );
          if (horizontalDistance > 50) return null;
        }

        return fieldRect.top - labelRect.bottom;
      }

      default:
        return null;
    }
  }

  private findHelperText(element: FormFieldElement): string | null {
    const describedBy = element.getAttribute("aria-describedby");
    if (describedBy) {
      const helperElement = document.getElementById(describedBy);
      if (helperElement) {
        return this.cleanText(helperElement.textContent || "");
      }
    }

    const parent = element.parentElement;
    if (parent) {
      const helper = parent.querySelector(
        '[class*="help"], [class*="hint"], [class*="description"]',
      );
      if (helper && helper !== element) {
        return this.cleanText(helper.textContent || "");
      }
    }

    return null;
  }

  private getCurrentValue(element: FormFieldElement): string {
    if (element instanceof HTMLSelectElement) {
      return element.value || "";
    }
    if (element instanceof HTMLInputElement) {
      if (element.type === "checkbox" || element.type === "radio") {
        return element.checked ? element.value || "on" : "";
      }
      return element.value || "";
    }
    if (element instanceof HTMLTextAreaElement) {
      return element.value || "";
    }
    return "";
  }

  private classifyFieldType(element: FormFieldElement): FieldType {
    if (element instanceof HTMLTextAreaElement) {
      return "textarea";
    }

    if (element instanceof HTMLSelectElement) {
      return "select";
    }

    if (element instanceof HTMLInputElement) {
      const type = element.type.toLowerCase();

      const typeMap: Record<string, FieldType> = {
        email: "email",
        tel: "tel",
        url: "url",
        password: "password",
        number: "number",
        date: "date",
        checkbox: "checkbox",
        radio: "radio",
      };

      return typeMap[type] || "text";
    }

    return "text";
  }

  private inferFieldPurpose(
    metadata: Omit<FieldMetadata, "fieldPurpose">,
    fieldType: FieldType,
  ): FieldPurpose {
    if (fieldType === "email") return "email";
    if (fieldType === "tel") return "phone";

    const autocomplete = metadata.autocomplete?.toLowerCase();
    if (autocomplete) {
      const autocompleteMap: Record<string, FieldPurpose> = {
        name: "name",
        "given-name": "name",
        "family-name": "name",
        email: "email",
        tel: "phone",
        "street-address": "address",
        "address-line1": "address",
        "address-line2": "address",
        city: "city",
        state: "state",
        "postal-code": "zip",
        country: "country",
        organization: "company",
        "job-title": "title",
      };

      const purpose = autocompleteMap[autocomplete];
      if (purpose) return purpose;
    }

    const allText = [
      metadata.labelTag,
      metadata.labelAria,
      metadata.labelData,
      metadata.labelLeft,
      metadata.labelRight,
      metadata.labelTop,
      metadata.placeholder,
      metadata.name,
      metadata.id,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const patterns: Array<{ regex: RegExp; purpose: FieldPurpose }> = [
      { regex: /\b(email|e-mail|mail)\b/i, purpose: "email" },
      {
        regex: /\b(phone|tel|telephone|mobile|cell)\b/i,
        purpose: "phone",
      },
      {
        regex:
          /\b(name|full[\s-]?name|first[\s-]?name|last[\s-]?name|given[\s-]?name|family[\s-]?name)\b/i,
        purpose: "name",
      },
      {
        regex: /\b(address|street|addr|location|residence)\b/i,
        purpose: "address",
      },
      { regex: /\b(city|town)\b/i, purpose: "city" },
      { regex: /\b(state|province|region)\b/i, purpose: "state" },
      {
        regex: /\b(zip|postal[\s-]?code|postcode)\b/i,
        purpose: "zip",
      },
      { regex: /\b(country|nation)\b/i, purpose: "country" },
      {
        regex: /\b(company|organization|employer|business)\b/i,
        purpose: "company",
      },
      {
        regex: /\b(title|position|job[\s-]?title|role)\b/i,
        purpose: "title",
      },
    ];

    for (const { regex, purpose } of patterns) {
      if (regex.test(allText)) {
        return purpose;
      }
    }

    return "unknown";
  }

  private cleanText(text: string): string | null {
    const cleaned = text
      .replace(/[\n\r\t]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return cleaned.length > 0 && cleaned.length < 200 ? cleaned : null;
  }
}
