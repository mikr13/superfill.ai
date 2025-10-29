import type { AIProvider } from "@/lib/providers/registry";
import type { Theme } from "./theme";
import type { Trigger } from "./trigger";

export interface EncryptedKey {
  encrypted: string;
  salt: string;
}

export interface UserSettings {
  selectedProvider: AIProvider;
  autoFillEnabled: boolean;
  confidenceThreshold: number;
}

export interface AllSettings {
  theme: Theme;
  trigger: Trigger;
  userSettings: UserSettings;
}
