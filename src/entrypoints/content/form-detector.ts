import type {
  DetectedField,
  DetectedForm,
  FieldMetadata,
  FieldOpId,
  FormFieldElement,
  FormOpId,
} from "@/types/autofill";

export class FormDetector {
  private formOpidCounter = 0;
  private fieldOpidCounter = 0;
  private shadowRootFields: DetectedField[] = [];

  private ignoredTypes = new Set([
    "hidden",
    "submit",
    "reset",
    "button",
    "image",
    "file",
  ]);

  detectAll(): DetectedForm[] {
    const forms: DetectedForm[] = [];
    this.shadowRootFields = [];

    const formElements = this.findFormElements();

    for (const formElement of formElements) {
      const formOpid = `__form__${this.formOpidCounter++}` as FormOpId;
      const fields = this.findFieldsInForm(formElement);

      forms.push({
        opid: formOpid,
        element: formElement,
        action: formElement.action || "",
        method: formElement.method || "get",
        name: formElement.name || formElement.id || "",
        fields: fields.map((f) => ({
          ...f,
          formOpid,
        })),
      });
    }

    const standaloneFields = this.findStandaloneFields(formElements);
    const allStandaloneFields = [...standaloneFields, ...this.shadowRootFields];

    if (allStandaloneFields.length > 0) {
      forms.push({
        opid: "__form__standalone" as FormOpId,
        element: null,
        action: "",
        method: "",
        name: "Standalone Fields",
        fields: allStandaloneFields.map((f) => ({
          ...f,
          formOpid: "__form__standalone" as FormOpId,
        })),
      });
    }

    return forms;
  }

  private findFormElements(): HTMLFormElement[] {
    const forms: HTMLFormElement[] = [];
    const walker = this.createTreeWalker(
      document.documentElement,
      (node) => node.nodeName === "FORM",
    );

    let node: Node | null = walker.nextNode();
    while (node) {
      forms.push(node as HTMLFormElement);
      node = walker.nextNode();
    }

    return forms;
  }

  private findFieldsInForm(form: HTMLFormElement): DetectedField[] {
    const fields: DetectedField[] = [];

    for (const element of Array.from(form.elements)) {
      if (this.isValidField(element as HTMLElement)) {
        fields.push(this.createDetectedField(element as FormFieldElement));
      }
    }

    return fields;
  }

  private findStandaloneFields(
    existingForms: HTMLFormElement[],
  ): DetectedField[] {
    const fields: DetectedField[] = [];
    const walker = this.createTreeWalker(document.documentElement, (node) =>
      this.isFieldElement(node),
    );

    let node: Node | null = walker.nextNode();
    while (node) {
      const element = node as FormFieldElement;

      if (!element.form && !this.isInsideForm(element, existingForms)) {
        if (this.isValidField(element)) {
          fields.push(this.createDetectedField(element));
        }
      }

      node = walker.nextNode();
    }

    return fields;
  }

  private createTreeWalker(
    root: Node,
    acceptNode: (node: Node) => boolean,
  ): TreeWalker {
    return document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (node) => {
        const element = node as Element;
        if (element.shadowRoot) {
          this.traverseShadowRoot(element.shadowRoot);
        }

        return acceptNode(node)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    });
  }

  private traverseShadowRoot(shadowRoot: ShadowRoot) {
    const walker = document.createTreeWalker(
      shadowRoot,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          const element = node as Element;

          if (element.shadowRoot) {
            this.traverseShadowRoot(element.shadowRoot);
          }

          return this.isFieldElement(node)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
        },
      },
    );

    let node: Node | null = walker.nextNode();
    while (node) {
      const element = node as FormFieldElement;

      if (this.isValidField(element)) {
        this.shadowRootFields.push(this.createDetectedField(element));
      }

      node = walker.nextNode();
    }
  }

  private isValidField(element: HTMLElement): boolean {
    if (element.hasAttribute("data-bwignore")) {
      return false;
    }

    if (
      element.offsetParent === null &&
      element.getAttribute("type") !== "hidden"
    ) {
      return false;
    }

    if (element instanceof HTMLInputElement) {
      if (this.ignoredTypes.has(element.type)) {
        return false;
      }
    }

    return true;
  }

  private isFieldElement(node: Node): boolean {
    if (!(node instanceof HTMLElement)) return false;

    const tagName = node.tagName.toLowerCase();
    return (
      tagName === "input" || tagName === "textarea" || tagName === "select"
    );
  }

  private isInsideForm(element: Element, forms: HTMLFormElement[]): boolean {
    return forms.some((form) => form.contains(element));
  }

  private createDetectedField(element: FormFieldElement): DetectedField {
    const opid = `__${this.fieldOpidCounter++}` as FieldOpId;

    return {
      opid,
      element,
      metadata: {} as FieldMetadata, // TODO: will be filled by FieldAnalyzer in TASK-018
      formOpid: "" as FormOpId, // Placeholder, will be set by caller
    };
  }
}
