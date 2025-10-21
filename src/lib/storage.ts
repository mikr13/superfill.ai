import { Theme } from "@/types/theme";

const theme = storage.defineItem<Theme>("local:vite-ui-theme", {
  defaultValue: Theme.DEFAULT,
  fallback: Theme.DEFAULT,
  version: 1,
});

export const store = {
  theme,
};
