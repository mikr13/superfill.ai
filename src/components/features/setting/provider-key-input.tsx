import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ProviderConfig } from "@/lib/providers/registry";
import { CheckCircle2, EyeIcon, EyeOffIcon } from "lucide-react";
import { useId } from "react";

interface ProviderKeyInputProps {
  providerId: string;
  config: ProviderConfig;
  value: string;
  onChange: (value: string) => void;
  showKey: boolean;
  onToggleShow: () => void;
  hasExistingKey: boolean;
}

export const ProviderKeyInput = ({
  config,
  value,
  onChange,
  showKey,
  onToggleShow,
  hasExistingKey,
}: ProviderKeyInputProps) => {
  const inputId = useId();

  if (!config.requiresApiKey) {
    return null;
  }

  return (
    <Field data-invalid={false}>
      <FieldLabel htmlFor={inputId}>{config.name} API Key</FieldLabel>
      <div className="relative">
        <Input
          id={inputId}
          type={showKey ? "text" : "password"}
          placeholder={
            hasExistingKey ? "••••••••••••••••" : config.keyPlaceholder
          }
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="absolute right-0 top-0 h-full flex items-center gap-1 pr-1">
          {hasExistingKey && !value && (
            <Badge variant="outline" className="gap-1 h-7">
              <CheckCircle2 className="size-3" />
              Set
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-full"
            onClick={onToggleShow}
          >
            {showKey ? (
              <EyeOffIcon className="size-4" />
            ) : (
              <EyeIcon className="size-4" />
            )}
          </Button>
        </div>
      </div>
      {hasExistingKey && !value ? (
        <FieldDescription>
          API key is already configured. Enter a new key to update it.
        </FieldDescription>
      ) : config.description ? (
        <FieldDescription>{config.description}</FieldDescription>
      ) : null}
    </Field>
  );
};
