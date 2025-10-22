import type { EncryptedKey } from "@/types/settings";

const apiKeys = storage.defineItem<Record<string, EncryptedKey>>(
  "local:security:api-keys",
  {
    fallback: {},
    version: 1,
  },
);

export const securityStorage = {
  apiKeys,
};
