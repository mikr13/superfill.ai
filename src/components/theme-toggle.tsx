import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { setTheme, theme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      aria-pressed={theme === "dark"}
      aria-label="Toggle theme"
    >
      <Sun className="size-4 dark:hidden text-primary" />
      <Moon className="hidden size-4 dark:block text-primary" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
