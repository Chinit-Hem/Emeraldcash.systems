"use client";

import { useSyncExternalStore } from "react";

import { isStandaloneAppDisplay } from "@/shared/utils/platform";

const displayModeQueries = [
  "(display-mode: standalone)",
  "(display-mode: fullscreen)",
  "(display-mode: minimal-ui)",
];

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const mediaQueries = displayModeQueries.map((query) => window.matchMedia(query));

  mediaQueries.forEach((mediaQuery) => {
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", callback);
      return;
    }

    mediaQuery.addListener?.(callback);
  });

  window.addEventListener("focus", callback);
  window.addEventListener("pageshow", callback);
  document.addEventListener("visibilitychange", callback);

  return () => {
    mediaQueries.forEach((mediaQuery) => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", callback);
        return;
      }

      mediaQuery.removeListener?.(callback);
    });
    window.removeEventListener("focus", callback);
    window.removeEventListener("pageshow", callback);
    document.removeEventListener("visibilitychange", callback);
  };
}

export function useStandaloneDisplayMode() {
  return useSyncExternalStore(subscribe, isStandaloneAppDisplay, () => false);
}
