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

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const saved = localStorage.getItem(LANGUAGE_KEY) as Language | null;
        if (saved && (saved === "en" || saved === "km")) {
          setLanguageState(saved);
          document.documentElement.lang = saved;
        }
      } catch {
        // Ignore storage access errors in restricted browser modes.
      }
    });

    document.documentElement.dir = "ltr";
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_KEY, lang);
    } catch {
      // Ignore storage access errors; in-memory language state still updates.
    }
    document.documentElement.lang = lang;
    document.documentElement.dir = "ltr";
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "en" ? "km" : "en");
  }, [language, setLanguage]);

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
