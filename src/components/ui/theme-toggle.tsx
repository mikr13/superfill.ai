import { TooltipTrigger } from "@radix-ui/react-tooltip";
import { Moon, Sun } from "lucide-react";
import { useHotkeys } from "react-hotkeys-hook";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent } from "./tooltip";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { setTheme, theme } = useTheme();

  const themeToSet = theme === "light" ? "dark" : "light";

  useHotkeys("d", () => {
    setTheme(themeToSet);
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          onClick={() => setTheme(themeToSet)}
          aria-pressed={theme === "dark"}
          aria-label="Toggle theme"
        >
          <Sun className="size-4 dark:hidden text-primary" />
          <Moon className="hidden size-4 dark:block text-primary" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        Toggle Theme <kbd>D</kbd>
      </TooltipContent>
    </Tooltip>
  );
}
