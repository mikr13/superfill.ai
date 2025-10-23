import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { setTheme, theme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(className, "group")}
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      aria-pressed={theme === "dark"}
      aria-label="Toggle theme"
    >
      <Sun className="size-4 dark:hidden text-primary group-hover:text-[#D97757] dark:group-hover:text-[#D97757]" />
      <Moon className="hidden size-4 dark:block text-primary group-hover:text-[#D97757] dark:group-hover:text-[#D97757]" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
