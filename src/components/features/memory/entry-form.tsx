import { useForm, useStore } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { InputBadge } from "@/components/ui/input-badge";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { getCategorizationService } from "@/lib/ai/categorization-service";
import { allowedCategories } from "@/lib/copies";
import { createLogger } from "@/lib/logger";
import { keyVault } from "@/lib/security/key-vault";
import { store } from "@/lib/storage";
import { useMemoryStore } from "@/stores/memory";
import type { MemoryEntry } from "@/types/memory";

const logger = createLogger("component:entry-form");

const entryFormSchema = z.object({
  question: z.string(),
  answer: z.string().min(1, "Answer is required"),
  tags: z.array(z.string()),
  category: z.string().min(1, "Category is required"),
});

interface EntryFormProps {
  mode: "create" | "edit";
  initialData?: MemoryEntry;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EntryForm({
  mode,
  initialData,
  onSuccess,
  onCancel,
}: EntryFormProps) {
  const { addEntry, updateEntry, entries } = useMemoryStore();
  const existingTags = [...new Set(entries.flatMap((e) => e.tags))];

  const categorizationService = getCategorizationService();

  const form = useForm({
    defaultValues: {
      question: initialData?.question || "",
      answer: initialData?.answer || "",
      tags: initialData?.tags || [],
      category: initialData?.category || "",
    },
    validators: {
      onSubmit: entryFormSchema,
    },
    onSubmit: ({ value }) => {
      toast.promise(
        async () => {
          try {
            if (mode === "edit" && initialData) {
              await updateEntry(initialData.id, {
                question: value.question,
                answer: value.answer,
                tags: value.tags,
                category: value.category,
              });
            } else {
              await addEntry({
                question: value.question,
                answer: value.answer,
                tags: value.tags,
                category: value.category,
                confidence: 1.0,
              });
            }

            onSuccess?.();
            form.reset();
          } catch (error) {
            logger.error("Failed to save entry:", error);
            throw error;
          }
        },
        {
          loading: mode === "edit" ? "Updating memory..." : "Saving memory...",
          success:
            mode === "edit"
              ? "Memory updated successfully!"
              : "Memory saved successfully!",
          error: "Failed to save memory.",
        },
      );
    },
  });
  const answer = useStore(form.store, (state) => state.values.answer);
  const question = useStore(form.store, (state) => state.values.question);

  const [debouncedAnswer] = useDebounce(answer, 500);
  const [debouncedQuestion] = useDebounce(question, 500);

  const analysisQuery = useQuery({
    queryKey: ["analyze", debouncedAnswer, debouncedQuestion],
    queryFn: async () => {
      const userSettings = await store.userSettings.getValue();
      const apiKey = await keyVault.getKey(userSettings.selectedProvider);

      return categorizationService.analyze(
        debouncedAnswer,
        debouncedQuestion,
        apiKey || undefined,
      );
    },
    enabled: !!debouncedAnswer && mode === "create",
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const isAiProcessing = analysisQuery.isLoading;

  useEffect(() => {
    if (mode === "create" && debouncedAnswer && analysisQuery.data) {
      const currentCategory = form.getFieldValue("category");
      const currentTags = form.getFieldValue("tags");

      if (!currentCategory && analysisQuery.data.category) {
        form.setFieldValue("category", analysisQuery.data.category);
      }

      if (
        currentTags.length === 0 &&
        analysisQuery.data.tags &&
        analysisQuery.data.tags.length > 0
      ) {
        form.setFieldValue("tags", analysisQuery.data.tags);
      }
    }
  }, [analysisQuery.data, debouncedAnswer, mode, form]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        form.handleSubmit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [form, onCancel]);

  const handleCancel = () => {
    form.reset();
    onCancel?.();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-2"
    >
      <FieldGroup className="gap-2">
        <form.Field name="question">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  Question (Optional)
                </FieldLabel>
                <Textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="What information does this answer?"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="answer">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Answer *</FieldLabel>
                <Textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="Your information (e.g., email, phone, address)"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        {isAiProcessing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            <span>AI is analyzing your answer...</span>
          </div>
        )}

        <form.Field name="tags">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Tags</FieldLabel>
                <InputBadge
                  id={field.name}
                  value={field.state.value}
                  onChange={(value) => field.handleChange(value)}
                  placeholder="Add tags (press Enter, comma, or semicolon)"
                />
                {existingTags.length > 0 && (
                  <FieldDescription>
                    Existing tags: {existingTags.join(", ")}
                  </FieldDescription>
                )}
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="category">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            const categoryOptions: ComboboxOption[] = allowedCategories.map(
              (cat) => ({
                value: cat,
                label: cat.charAt(0).toUpperCase() + cat.slice(1),
              }),
            );

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Category *</FieldLabel>
                <Combobox
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onValueChange={field.handleChange}
                  options={categoryOptions}
                  placeholder="Select a category"
                  searchPlaceholder="Search categories..."
                  emptyText="No category found."
                  aria-invalid={isInvalid}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>
      </FieldGroup>

      <Field orientation="horizontal">
        <form.Subscribe selector={(state) => [state.isSubmitting]}>
          {([isSubmitting]) => (
            <Button
              type="submit"
              disabled={isSubmitting || isAiProcessing}
              className="flex-1"
            >
              {isSubmitting && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              {mode === "edit" ? "Update" : "Save"}
            </Button>
          )}
        </form.Subscribe>
        <Button type="reset" variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
      </Field>
    </form>
  );
}
