import { useId } from "react";
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
import { SliderWithInput } from "@/components/ui/slider-with-input";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/stores/settings";

export const AutofillSettings = () => {
  const autofillEnabledId = useId();
  const confidenceThresholdId = useId();

  const autoFillEnabled = useSettingsStore((state) => state.autoFillEnabled);
  const confidenceThreshold = useSettingsStore(
    (state) => state.confidenceThreshold,
  );

  const setAutoFillEnabled = useSettingsStore(
    (state) => state.setAutoFillEnabled,
  );
  const setConfidenceThreshold = useSettingsStore(
    (state) => state.setConfidenceThreshold,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Autofill Settings</CardTitle>
        <CardDescription>Control how autofill behaves</CardDescription>
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
              Minimum confidence score required for autofill suggestions
              (currently: {confidenceThreshold.toFixed(2)})
            </FieldDescription>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
};
