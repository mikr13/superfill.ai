import { useForm, useStore } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { InputBadge } from "@/components/ui/input-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useMemoryStore } from "@/stores/memory";
import type { MemoryEntry } from "@/types/memory";

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

const categorizeAnswer = async (answer: string): Promise<string> => {
  const lower = answer.toLowerCase();
  let category = "general";

  if (lower.includes("email") || lower.includes("@")) category = "contact";
  if (lower.includes("phone") || lower.includes("mobile")) category = "contact";
  if (
    lower.includes("address") ||
    lower.includes("street") ||
    lower.includes("city")
  )
    category = "location";
  if (
    lower.includes("birthday") ||
    lower.includes("born") ||
    lower.includes("date of birth")
  )
    category = "personal";
  if (
    lower.includes("company") ||
    lower.includes("employer") ||
    lower.includes("job")
  )
    category = "work";
  if (
    lower.includes("education") ||
    lower.includes("university") ||
    lower.includes("degree")
  )
    category = "education";
  if (lower.includes("name")) category = "personal";

  return new Promise((resolve) => setTimeout(() => resolve(category), 2000));
};

const generateTags = async (
  answer: string,
  question?: string,
): Promise<string[]> => {
  const tags: string[] = [];
  const text = `${question || ""} ${answer}`.toLowerCase();

  const tagMap = {
    email: ["email", "contact"],
    phone: ["phone", "contact"],
    address: ["address", "location"],
    work: ["work", "employment"],
    education: ["education", "academic"],
    personal: ["personal", "info"],
    name: ["name", "personal"],
    date: ["date", "time"],
  };

  for (const [key, tagValues] of Object.entries(tagMap)) {
    if (text.includes(key)) {
      tags.push(...tagValues);
    }
  }

  return new Promise((resolve) =>
    setTimeout(() => resolve([...new Set(tags)]), 1200),
  );
};

export function EntryForm({
  mode,
  initialData,
  onSuccess,
  onCancel,
}: EntryFormProps) {
  const { addEntry, updateEntry, entries } = useMemoryStore();
  const existingCategories = [...new Set(entries.map((e) => e.category))];
  const existingTags = [...new Set(entries.flatMap((e) => e.tags))];

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
    onSubmit: async ({ value }) => {
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
      } catch (error) {
        console.error("Failed to save entry:", error);
      }
    },
  });
  const answer = useStore(form.store, (state) => state.values.answer);
  const question = useStore(form.store, (state) => state.values.question);

  const categoryQuery = useQuery({
    queryKey: ["categorize", answer],
    queryFn: () => categorizeAnswer(answer),
    enabled: !!answer && mode === "create",
    staleTime: 1000 * 60 * 5,
  });

  const tagsQuery = useQuery({
    queryKey: ["generateTags", answer, question],
    queryFn: () => generateTags(answer, question),
    enabled: !!answer && mode === "create",
    staleTime: 1000 * 60 * 5,
  });

  const isAiProcessing = categoryQuery.isLoading || tagsQuery.isLoading;

  useEffect(() => {
    if (mode === "create" && answer) {
      const currentCategory = form.getFieldValue("category");
      const currentTags = form.getFieldValue("tags");

      if (!currentCategory && categoryQuery.data) {
        form.setFieldValue("category", categoryQuery.data);
      }

      if (
        currentTags.length === 0 &&
        tagsQuery.data &&
        tagsQuery.data.length > 0
      ) {
        form.setFieldValue("tags", tagsQuery.data);
      }
    }
  }, [categoryQuery.data, tagsQuery.data, answer, mode, form]);

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

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <FieldGroup>
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
            <Spinner className="h-4 w-4" />
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

            const allCategories = [
              ...new Set([
                ...existingCategories,
                "personal",
                "contact",
                "work",
                "education",
                "location",
                "general",
              ]),
            ];

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Category *</FieldLabel>
                <Select
                  name={field.name}
                  value={field.state.value}
                  onValueChange={field.handleChange}
                >
                  <SelectTrigger
                    id={field.name}
                    aria-invalid={isInvalid}
                    className="w-full"
                  >
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>
      </FieldGroup>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <form.Subscribe selector={(state) => [state.isSubmitting]}>
          {([isSubmitting]) => (
            <Button type="submit" disabled={isSubmitting || isAiProcessing}>
              {isSubmitting && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              {mode === "edit" ? "Update" : "Save"}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
