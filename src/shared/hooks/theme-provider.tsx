"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ResolvedTheme = "light" | "dark";
export type ThemeMode = ResolvedTheme;

const THEME_MODE_KEY = "vms.theme-mode";
const LEGACY_THEME_KEYS = ["theme", "vms.theme"] as const;
const DEFAULT_THEME: ThemeMode = "light";
const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: "#ecfdf5",
  dark: "#020617",
};

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (mode: ThemeMode) => void;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark";
}

function readStoredThemeMode(): ThemeMode | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(THEME_MODE_KEY);
    if (isThemeMode(stored)) {
      return stored;
    }

    for (const legacyKey of LEGACY_THEME_KEYS) {
      const legacy = localStorage.getItem(legacyKey);
      if (isThemeMode(legacy)) {
        return legacy;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function persistThemeMode(mode: ThemeMode): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(THEME_MODE_KEY, mode);
    for (const legacyKey of LEGACY_THEME_KEYS) {
      localStorage.setItem(legacyKey, mode);
    }
  } catch {
    // Ignore storage exceptions (private mode / storage quotas).
  }
}

function applyTheme(resolvedTheme: ResolvedTheme, mode: ThemeMode): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolvedTheme);
  root.dataset.theme = resolvedTheme;
  root.dataset.themeMode = mode;
  root.style.colorScheme = resolvedTheme;

  let themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!themeColorMeta) {
    themeColorMeta = document.createElement("meta");
    themeColorMeta.name = "theme-color";
    document.head.appendChild(themeColorMeta);
  }
  themeColorMeta.content = THEME_COLORS[resolvedTheme];
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof document !== "undefined") {
      const modeFromDataset = document.documentElement.dataset.themeMode;
      if (isThemeMode(modeFromDataset)) {
        return modeFromDataset;
      }
    }

    if (typeof window === "undefined") {
      return DEFAULT_THEME;
    }

    return readStoredThemeMode() ?? DEFAULT_THEME;
  });

  const resolvedTheme = mode;

  useEffect(() => {
    applyTheme(resolvedTheme, mode);
  }, [resolvedTheme, mode]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      const key = event.key;
      if (!key) return;

      if (key !== THEME_MODE_KEY && !LEGACY_THEME_KEYS.includes(key as (typeof LEGACY_THEME_KEYS)[number])) {
        return;
      }

      setMode(readStoredThemeMode() ?? DEFAULT_THEME);
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setThemeMode = useCallback((nextMode: ThemeMode) => {
    setMode(nextMode);
    persistThemeMode(nextMode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setThemeMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedTheme,
      setThemeMode,
      setTheme: setThemeMode,
      toggleTheme,
    }),
    [mode, resolvedTheme, setThemeMode, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
