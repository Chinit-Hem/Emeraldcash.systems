"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { translatePhrase, type Language } from "./i18n";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  isKhmer: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_KEY = "vms.language";
const TRANSLATABLE_ATTRIBUTES = ["aria-label", "placeholder", "title", "alt"] as const;
const SKIP_TRANSLATION_SELECTOR = [
  "script",
  "style",
  "code",
  "pre",
  "textarea",
  "[data-no-translate]",
  "[contenteditable='true']",
].join(",");

function shouldSkipTranslation(element: Element | null): boolean {
  return Boolean(element?.closest(SKIP_TRANSLATION_SELECTOR));
}

function translateTextNode(node: Text, language: Language) {
  const value = node.nodeValue;
  if (!value?.trim() || shouldSkipTranslation(node.parentElement)) return;

  const translated = translatePhrase(value, language);
  if (translated !== value) {
    node.nodeValue = translated;
  }
}

function translateElementAttributes(element: Element, language: Language) {
  if (shouldSkipTranslation(element)) return;

  for (const attr of TRANSLATABLE_ATTRIBUTES) {
    const value = element.getAttribute(attr);
    if (!value?.trim()) continue;

    const translated = translatePhrase(value, language);
    if (translated !== value) {
      element.setAttribute(attr, translated);
    }
  }
}

function translateSubtree(root: ParentNode, language: Language) {
  if (root instanceof Element) {
    translateElementAttributes(root, language);
  }

  const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const textNode = node as Text;
      if (!textNode.nodeValue?.trim() || shouldSkipTranslation(textNode.parentElement)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  while (textWalker.nextNode()) {
    textNodes.push(textWalker.currentNode as Text);
  }
  textNodes.forEach((node) => translateTextNode(node, language));

  const attributeSelector = TRANSLATABLE_ATTRIBUTES.map((attr) => `[${attr}]`).join(",");
  root.querySelectorAll?.(attributeSelector).forEach((element) => {
    translateElementAttributes(element, language);
  });
}

function useDocumentLanguage(language: Language) {
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = "ltr";

    const run = () => translateSubtree(document.body, language);
    run();
    const rafId = window.requestAnimationFrame(run);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData" && mutation.target.nodeType === Node.TEXT_NODE) {
          translateTextNode(mutation.target as Text, language);
          continue;
        }

        if (mutation.type === "attributes" && mutation.target instanceof Element) {
          translateElementAttributes(mutation.target, language);
          continue;
        }

        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            translateTextNode(node as Text, language);
          } else if (node instanceof Element) {
            translateSubtree(node, language);
          }
        });
      }
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
      childList: true,
      characterData: true,
      subtree: true,
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [language]);
}

function useBrowserDialogLanguage(language: Language) {
  useEffect(() => {
    const originalAlert = window.alert;
    const originalConfirm = window.confirm;

    window.alert = (message?: unknown) => {
      originalAlert(typeof message === "string" ? translatePhrase(message, language) : message);
    };

    window.confirm = (message?: string) => {
      return originalConfirm(typeof message === "string" ? translatePhrase(message, language) : message);
    };

    return () => {
      window.alert = originalAlert;
      window.confirm = originalConfirm;
    };
  }, [language]);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  useDocumentLanguage(language);
  useBrowserDialogLanguage(language);

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const saved = localStorage.getItem(LANGUAGE_KEY) as Language | null;
        if (saved && (saved === "en" || saved === "km")) {
          setLanguageState(saved);
        }
      } catch {
        // Ignore storage access errors in restricted browser modes.
      }
    });
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_KEY, lang);
    } catch {
      // Ignore storage access errors; in-memory language state still updates.
    }
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
