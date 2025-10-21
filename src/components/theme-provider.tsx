import { createContext, useContext, useEffect, useState } from "react";
import { APP_NAME } from "@/constants";
import { store } from "@/lib/storage";
import { Theme } from "@/types/theme";

type ThemeProviderProps = {
  children: React.ReactNode;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: Theme.DEFAULT,
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => Theme.DEFAULT);

  useEffect(() => {
    store.theme.getValue().then(setTheme);
    const unwatch = store.theme.watch(setTheme);
    return () => unwatch();
  }, []);

  useEffect(() => {
    const host = document.querySelector(APP_NAME);
    const shadowRoot = host?.shadowRoot;
    const root =
      shadowRoot?.querySelector("html") || window.document.documentElement;

    if (!root) return;

    root.classList.remove("light", "dark");

    if (theme === Theme.DEFAULT) {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? Theme.DARK
        : Theme.LIGHT;

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      store.theme.setValue(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
