"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Language } from "./i18n";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  isKhmer: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_KEY = "vms.language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Defer state updates to avoid cascading render warning
    Promise.resolve().then(() => {
      setMounted(true);
      const saved = localStorage.getItem(LANGUAGE_KEY) as Language | null;
      if (saved && (saved === "en" || saved === "km")) {
        setLanguageState(saved);
        // Sync HTML lang attribute for Khmer font CSS targeting
        document.documentElement.lang = saved;
      }
    });
    // Ensure LTR direction is always set (Khmer is left-to-right)
    document.documentElement.dir = "ltr";
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_KEY, lang);
    document.documentElement.lang = lang;
    // Keep LTR for both English and Khmer (Khmer is left-to-right)
    document.documentElement.dir = "ltr";
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "en" ? "km" : "en");
  }, [language, setLanguage]);

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        isKhmer: language === "km",
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
