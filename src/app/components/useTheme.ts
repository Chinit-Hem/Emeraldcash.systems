"use client";

import { useCallback } from "react";

import { useTheme as useAppTheme, type ThemeMode } from "@/lib/theme-provider";

export type Theme = ThemeMode;

export function useTheme() {
  const { resolvedTheme, setThemeMode, toggleTheme } = useAppTheme();

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeMode(next);
    },
    [setThemeMode]
  );

  return { theme: resolvedTheme, setTheme, toggleTheme };
}
