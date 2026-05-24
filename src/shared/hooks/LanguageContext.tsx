"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { translatePhrase, type Language } from "@/shared/utils/i18n";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  isKhmer: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_KEY = "vms.language";
const TRANSLATABLE_ATTRIBUTES = ["aria-label", "placeholder", "title", "alt"] as const;
type TranslatableAttribute = (typeof TRANSLATABLE_ATTRIBUTES)[number];

const originalTextValues = new WeakMap<Text, string>();
const originalAttributeValues = new WeakMap<Element, Partial<Record<TranslatableAttribute, string>>>();
const originalInputValues = new WeakMap<HTMLInputElement, string>();

const SKIP_TEXT_TRANSLATION_SELECTOR = [
  "script",
  "style",
  "code",
  "pre",
  "textarea",
  "[data-no-translate]",
  "[contenteditable='true']",
].join(",");

const SKIP_ATTRIBUTE_TRANSLATION_SELECTOR = [
  "script",
  "style",
  "code",
  "pre",
  "[data-no-translate]",
  "[contenteditable='true']",
].join(",");

function shouldSkipTextTranslation(element: Element | null): boolean {
  return Boolean(element?.closest(SKIP_TEXT_TRANSLATION_SELECTOR));
}

function shouldSkipAttributeTranslation(element: Element | null): boolean {
  return Boolean(element?.closest(SKIP_ATTRIBUTE_TRANSLATION_SELECTOR));
}

function containsKhmer(text: string): boolean {
  return /[\u1780-\u17FF]/.test(text);
}

function translateSourceForLanguage(source: string, language: Language): string {
  if (language === "en") {
    return containsKhmer(source) ? translatePhrase(source, "en") : source;
  }

  return translatePhrase(source, language);
}

function isKnownLanguageValue(value: string, source: string): boolean {
  return (
    value === source ||
    value === translateSourceForLanguage(source, "en") ||
    value === translateSourceForLanguage(source, "km")
  );
}

function resolveOriginalText(node: Text, value: string): string {
  const existing = originalTextValues.get(node);
  if (!existing) {
    originalTextValues.set(node, value);
    return value;
  }

  if (!isKnownLanguageValue(value, existing)) {
    originalTextValues.set(node, value);
    return value;
  }

  return existing;
}

function resolveOriginalAttribute(
  element: Element,
  attr: TranslatableAttribute,
  value: string
): string {
  const existingAttrs = originalAttributeValues.get(element) ?? {};
  const existing = existingAttrs[attr];
  if (!existing) {
    originalAttributeValues.set(element, { ...existingAttrs, [attr]: value });
    return value;
  }

  if (!isKnownLanguageValue(value, existing)) {
    originalAttributeValues.set(element, { ...existingAttrs, [attr]: value });
    return value;
  }

  return existing;
}

function resolveOriginalInputValue(element: HTMLInputElement, value: string): string {
  const existing = originalInputValues.get(element);
  if (!existing) {
    originalInputValues.set(element, value);
    return value;
  }

  if (!isKnownLanguageValue(value, existing)) {
    originalInputValues.set(element, value);
    return value;
  }

  return existing;
}

function translateTextNode(node: Text, language: Language) {
  const value = node.nodeValue;
  if (!value?.trim() || shouldSkipTextTranslation(node.parentElement)) return;

  const source = resolveOriginalText(node, value);
  const translated = translateSourceForLanguage(source, language);
  if (translated !== value) {
    node.nodeValue = translated;
  }
}

function translateInputValue(element: Element, language: Language) {
  if (!(element instanceof HTMLInputElement)) return;
  if (!["button", "submit", "reset"].includes(element.type)) return;

  const value = element.value;
  if (!value?.trim()) return;

  const source = resolveOriginalInputValue(element, value);
  const translated = translateSourceForLanguage(source, language);
  if (translated !== value) {
    element.value = translated;
  }
}

function translateElementAttributes(element: Element, language: Language) {
  if (shouldSkipAttributeTranslation(element)) return;

  for (const attr of TRANSLATABLE_ATTRIBUTES) {
    const value = element.getAttribute(attr);
    if (!value?.trim()) continue;

    const source = resolveOriginalAttribute(element, attr, value);
    const translated = translateSourceForLanguage(source, language);
    if (translated !== value) {
      element.setAttribute(attr, translated);
    }
  }

  translateInputValue(element, language);
}

function translateSubtree(root: ParentNode, language: Language) {
  if (root instanceof Element) {
    translateElementAttributes(root, language);
  }

  const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const textNode = node as Text;
      if (!textNode.nodeValue?.trim() || shouldSkipTextTranslation(textNode.parentElement)) {
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

  const attributeSelector = [
    ...TRANSLATABLE_ATTRIBUTES.map((attr) => `[${attr}]`),
    "input[type='button']",
    "input[type='submit']",
    "input[type='reset']",
  ].join(",");
  root.querySelectorAll?.(attributeSelector).forEach((element) => {
    translateElementAttributes(element, language);
  });
}

function useDocumentLanguage(language: Language) {
  useEffect(() => {
    const applyDocumentChrome = () => {
      document.documentElement.lang = language;
      document.documentElement.dir = "ltr";
      document.title = translatePhrase("Emerald Cash Systems", language);
    };

    const run = () => {
      applyDocumentChrome();
      translateSubtree(document.body, language);
    };
    run();
    const rafId = window.requestAnimationFrame(run);
    const titleRefreshIds = [window.setTimeout(run, 250), window.setTimeout(run, 1000)];

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
      titleRefreshIds.forEach((id) => window.clearTimeout(id));
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
