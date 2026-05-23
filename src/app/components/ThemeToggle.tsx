"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/lib/theme-provider";
import { cn } from "@/lib/ui";

const themeOptions = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
] as const;

/**
 * ThemeToggle Component
 *
 * App-controlled light/dark selector. It never follows the device color scheme.
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { mode, setThemeMode } = useTheme();

  return (
    <div
      className={cn(
        "inline-flex max-w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg-muted)] p-1 shadow-[var(--shadow-soft)]",
        className
      )}
      role="radiogroup"
      aria-label="Theme mode"
    >
      {themeOptions.map(({ value, label, Icon }) => {
        const selected = mode === value;

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setThemeMode(value)}
            className={cn(
              "inline-flex h-9 min-w-20 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-all duration-200 sm:flex-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-green)]",
              selected
                ? "bg-[var(--bg-elevated)] text-[var(--accent-green)] shadow-[var(--shadow-soft)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
