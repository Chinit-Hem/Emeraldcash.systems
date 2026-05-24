import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ui = {
  surface: {
    cardSoft: "bg-white/80 dark:bg-gray-800/80 border border-white/20 dark:border-gray-700/50 shadow-md backdrop-blur-xl",
  },
  text: {
    label: "text-sm font-medium text-[var(--text-secondary)]",
    helper: "text-xs text-[var(--text-secondary)]/80",
    title: "font-semibold text-[var(--text-primary)]",
    danger: "text-xs text-red-600 dark:text-red-400",
  },
  input: {
    base: "w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--accent-green)]",
    withIcon: "pl-10",
    withRightElement: "pr-10",
    error: "border-red-500 focus-visible:ring-red-500",
  },
  button: {
    base: "inline-flex select-none justify-center rounded-xl text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-green)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    size: {
      sm: "h-9 px-3 py-1.5",
      md: "h-10 px-4 py-2",
      lg: "h-12 px-8 py-3",
    },
    primary: "bg-[var(--accent-green)] text-[var(--bg-elevated)] hover:bg-[var(--accent-green-hover)] active:bg-[var(--accent-green-active)]",
    secondary: "border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-[var(--text-primary)]",
    danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  },
} as const;
