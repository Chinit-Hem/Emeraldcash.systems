import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs = 200): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), Math.max(0, delayMs));
    return () => window.clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

