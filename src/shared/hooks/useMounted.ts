"use client";

import { useSyncExternalStore } from "react";

/**
 * Custom hook to check if component is mounted
 * Uses useSyncExternalStore to avoid setState in useEffect
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {}, // No-op subscription
    () => true, // Client-side: always mounted
    () => false // Server-side: not mounted
  );
}
