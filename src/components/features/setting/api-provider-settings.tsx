import { CheckCircle2, EyeIcon, EyeOffIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getProviderOptions, type ProviderOption } from "@/lib/providers";
import { useSettingsStore } from "@/stores/settings";

export const ApiProviderSettings = () => {
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [providerOptions, setProviderOptions] = useState<ProviderOption[]>([]);
  const [hasOpenaiKey, setHasOpenaiKey] = useState(false);
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false);

  const openaiKeyId = useId();
  const anthropicKeyId = useId();
  const providerComboboxId = useId();

  const selectedProvider = useSettingsStore((state) => state.selectedProvider);
  const setSelectedProvider = useSettingsStore(
    (state) => state.setSelectedProvider,
  );
  const setApiKey = useSettingsStore((state) => state.setApiKey);
  const getApiKey = useSettingsStore((state) => state.getApiKey);

  useEffect(() => {
    const loadProviders = async () => {
      const options = await getProviderOptions();
      setProviderOptions(options);

      const [openaiKeyExists, anthropicKeyExists] = await Promise.all([
        getApiKey("openai"),
        getApiKey("anthropic"),
      ]);

      setHasOpenaiKey(openaiKeyExists !== null);
      setHasAnthropicKey(anthropicKeyExists !== null);
    };
    loadProviders();
  }, [getApiKey]);

  const handleSaveApiKeys = async () => {
    try {
      if (openaiKey) {
        await setApiKey("openai", openaiKey);
        toast.success("OpenAI API key saved successfully");
        setHasOpenaiKey(true);
      }
      if (anthropicKey) {
        await setApiKey("anthropic", anthropicKey);
        toast.success("Anthropic API key saved successfully");
        setHasAnthropicKey(true);
      }

      if (!openaiKey && !anthropicKey) {
        toast.error("Please enter at least one API key");
        return;
      }

      if (openaiKey && !anthropicKey) {
        await setSelectedProvider("openai");
      } else if (anthropicKey && !openaiKey) {
        await setSelectedProvider("anthropic");
      }

      setOpenaiKey("");
      setAnthropicKey("");

      const options = await getProviderOptions();
      setProviderOptions(options);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save API keys",
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Provider</CardTitle>
        <CardDescription>Configure your AI provider API keys</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field data-invalid={false}>
            <FieldLabel htmlFor={openaiKeyId}>OpenAI API Key</FieldLabel>
            <div className="relative">
              <Input
                id={openaiKeyId}
                type={showOpenaiKey ? "text" : "password"}
                placeholder={hasOpenaiKey ? "••••••••••••••••" : "sk-..."}
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
              />
              <div className="absolute right-0 top-0 h-full flex items-center gap-1 pr-1">
                {hasOpenaiKey && !openaiKey && (
                  <Badge variant="outline" className="gap-1 h-7">
                    <CheckCircle2 className="size-3" />
                    Set
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-full"
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                >
                  {showOpenaiKey ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </Button>
              </div>
            </div>
            {hasOpenaiKey && !openaiKey && (
              <FieldDescription>
                API key is already configured. Enter a new key to update it.
              </FieldDescription>
            )}
          </Field>

          <Field data-invalid={false}>
            <FieldLabel htmlFor={anthropicKeyId}>Anthropic API Key</FieldLabel>
            <div className="relative">
              <Input
                id={anthropicKeyId}
                type={showAnthropicKey ? "text" : "password"}
                placeholder={
                  hasAnthropicKey ? "••••••••••••••••" : "sk-ant-..."
                }
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
              />
              <div className="absolute right-0 top-0 h-full flex items-center gap-1 pr-1">
                {hasAnthropicKey && !anthropicKey && (
                  <Badge variant="outline" className="gap-1 h-7">
                    <CheckCircle2 className="size-3" />
                    Set
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-full"
                  onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                >
                  {showAnthropicKey ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </Button>
              </div>
            </div>
            {hasAnthropicKey && !anthropicKey && (
              <FieldDescription>
                API key is already configured. Enter a new key to update it.
              </FieldDescription>
            )}
          </Field>

          <Button onClick={handleSaveApiKeys} className="w-full">
            Save API Keys
          </Button>

          <Field data-invalid={false}>
            <FieldLabel htmlFor={providerComboboxId}>
              Current Provider
            </FieldLabel>
            <Combobox
              id={providerComboboxId}
              value={selectedProvider}
              onValueChange={async (value) => {
                await setSelectedProvider(value as "openai" | "anthropic");
              }}
              options={providerOptions.map((p) => ({
                value: p.value,
                label: p.label,
                disabled: !p.available,
                badge: !p.available ? (
                  <Badge variant="secondary" className="ml-auto">
                    No API Key
                  </Badge>
                ) : undefined,
              }))}
              placeholder="Select provider..."
              searchPlaceholder="Search provider..."
              emptyText="No provider found."
              disabled={providerOptions.filter((p) => p.available).length === 0}
            />
            <FieldDescription>
              {providerOptions.filter((p) => p.available).length === 0
                ? "Please add at least one API key to select a provider"
                : "Choose which AI provider to use for form filling"}
            </FieldDescription>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
};
