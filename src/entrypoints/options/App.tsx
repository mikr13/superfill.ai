import { EntryForm } from "@/components/features/memory/entry-form";
import { EntryList } from "@/components/features/memory/entry-list";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SliderWithInput } from "@/components/ui/slider-with-input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APP_NAME } from "@/constants";
import { useInitializeMemory } from "@/hooks/use-memory";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMemoryStore } from "@/stores/memory";
import { useSettingsStore } from "@/stores/settings";
import { Trigger } from "@/types/trigger";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

export const App = () => {
  useInitializeMemory();
  const isMobile = useIsMobile();
  const entries = useMemoryStore((state) => state.entries);
  const [activeTab, setActiveTab] = useState("settings");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);

  const triggerId = useId();
  const openaiKeyId = useId();
  const anthropicKeyId = useId();
  const autofillEnabledId = useId();
  const confidenceThresholdId = useId();

  const trigger = useSettingsStore((state) => state.trigger);
  const selectedProvider = useSettingsStore((state) => state.selectedProvider);
  const autoFillEnabled = useSettingsStore((state) => state.autoFillEnabled);
  const confidenceThreshold = useSettingsStore(
    (state) => state.confidenceThreshold,
  );

  const setTrigger = useSettingsStore((state) => state.setTrigger);
  const setSelectedProvider = useSettingsStore(
    (state) => state.setSelectedProvider,
  );
  const setAutoFillEnabled = useSettingsStore(
    (state) => state.setAutoFillEnabled,
  );
  const setConfidenceThreshold = useSettingsStore(
    (state) => state.setConfidenceThreshold,
  );
  const setApiKey = useSettingsStore((state) => state.setApiKey);

  const handleSaveApiKeys = async () => {
    try {
      if (openaiKey) {
        await setApiKey("openai", openaiKey);
        toast.success("OpenAI API key saved successfully");
      }
      if (anthropicKey) {
        await setApiKey("anthropic", anthropicKey);
        toast.success("Anthropic API key saved successfully");
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
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save API keys",
      );
    }
  };

  const handleEdit = (entryId: string) => {
    setEditingEntryId(entryId);
  };

  const handleDelete = () => {
    setEditingEntryId(null);
  };

  const handleDuplicate = (entryId: string) => {
    const entry = entries.find((e) => e.id === entryId);
    if (entry) {
      setEditingEntryId(entryId);
    }
  };

  const handleFormSuccess = () => {
    setEditingEntryId(null);
  };

  const handleCancelEdit = () => {
    setEditingEntryId(null);
  };

  return (
    <section
      className="relative w-full h-screen flex flex-col overflow-hidden"
      aria-label="Options page"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-2">
          <div className="text-2xl">🤖</div>
          <h1 className="text-xl font-bold text-primary">{APP_NAME}</h1>
          <Badge variant="outline">Options</Badge>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="h-full flex flex-col gap-0"
        >
          <TabsList className="w-full rounded-none border-b">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="memory">Memory</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="flex-1 overflow-auto p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Fill Trigger</CardTitle>
                  <CardDescription>
                    Choose how the autofill feature is triggered
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Field data-invalid={false}>
                    <FieldLabel htmlFor={triggerId}>
                      Trigger Mode{" "}
                      <Badge variant="secondary">Coming Soon</Badge>
                    </FieldLabel>
                    <Select
                      value={trigger}
                      onValueChange={(value) => setTrigger(value as Trigger)}
                      disabled
                    >
                      <SelectTrigger id={triggerId}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={Trigger.POPUP}>
                          Popup (Default)
                        </SelectItem>
                        <SelectItem value={Trigger.CONTENT}>
                          In-Page Content
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      Currently only popup mode is supported
                    </FieldDescription>
                  </Field>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>AI Provider</CardTitle>
                  <CardDescription>
                    Configure your AI provider API keys
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field data-invalid={false}>
                      <FieldLabel htmlFor={openaiKeyId}>
                        OpenAI API Key
                      </FieldLabel>
                      <div className="relative">
                        <Input
                          id={openaiKeyId}
                          type={showOpenaiKey ? "text" : "password"}
                          placeholder="sk-..."
                          value={openaiKey}
                          onChange={(e) => setOpenaiKey(e.target.value)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                        >
                          {showOpenaiKey ? (
                            <EyeOffIcon className="size-4" />
                          ) : (
                            <EyeIcon className="size-4" />
                          )}
                        </Button>
                      </div>
                    </Field>

                    <Field data-invalid={false}>
                      <FieldLabel htmlFor={anthropicKeyId}>
                        Anthropic API Key
                      </FieldLabel>
                      <div className="relative">
                        <Input
                          id={anthropicKeyId}
                          type={showAnthropicKey ? "text" : "password"}
                          placeholder="sk-ant-..."
                          value={anthropicKey}
                          onChange={(e) => setAnthropicKey(e.target.value)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                        >
                          {showAnthropicKey ? (
                            <EyeOffIcon className="size-4" />
                          ) : (
                            <EyeIcon className="size-4" />
                          )}
                        </Button>
                      </div>
                    </Field>

                    <Button onClick={handleSaveApiKeys} className="w-full">
                      Save API Keys
                    </Button>

                    {selectedProvider && (
                      <div className="text-sm text-muted-foreground">
                        Current provider:{" "}
                        <span className="font-medium capitalize">
                          {selectedProvider}
                        </span>
                      </div>
                    )}
                  </FieldGroup>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Autofill Settings</CardTitle>
                  <CardDescription>
                    Control how autofill behaves
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field orientation="horizontal" data-invalid={false}>
                      <FieldContent>
                        <FieldLabel htmlFor={autofillEnabledId}>
                          Enable Autofill
                        </FieldLabel>
                        <FieldDescription>
                          Automatically fill forms with your stored memories
                        </FieldDescription>
                      </FieldContent>
                      <Switch
                        id={autofillEnabledId}
                        checked={autoFillEnabled}
                        onCheckedChange={setAutoFillEnabled}
                      />
                    </Field>

                    <Field data-invalid={false}>
                      <SliderWithInput
                        id={confidenceThresholdId}
                        label="Confidence Threshold"
                        min={0}
                        max={1}
                        step={0.05}
                        value={confidenceThreshold}
                        onChange={setConfidenceThreshold}
                      />
                      <FieldDescription>
                        Minimum confidence score required for autofill
                        suggestions (currently: {confidenceThreshold.toFixed(2)}
                        )
                      </FieldDescription>
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="memory" className="flex-1 overflow-hidden p-0">
            <ResizablePanelGroup
              direction={isMobile ? "vertical" : "horizontal"}
              className="h-full"
            >
              <ResizablePanel defaultSize={50} minSize={30}>
                <div className="h-full overflow-auto p-4">
                  <EntryList
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                  />
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={50} minSize={30}>
                <div className="h-full overflow-auto p-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {editingEntryId ? "Edit Memory" : "Add New Memory"}
                      </CardTitle>
                      <CardDescription>
                        {editingEntryId
                          ? "Update an existing memory entry"
                          : "Create a new memory entry"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <EntryForm
                        mode={editingEntryId ? "edit" : "create"}
                        initialData={
                          editingEntryId
                            ? entries.find((e) => e.id === editingEntryId)
                            : undefined
                        }
                        onSuccess={handleFormSuccess}
                        onCancel={editingEntryId ? handleCancelEdit : undefined}
                      />
                    </CardContent>
                  </Card>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </TabsContent>
        </Tabs>
      </main>
    </section>
  );
};
