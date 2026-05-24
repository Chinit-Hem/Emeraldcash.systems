/**
 * Date formatting utilities for Emerald Cash VMS
 * Supports both ISO and custom formats like "12/18/2025 13:38:58"
 */

export type DateFormat = "compact" | "full" | "iso";

/**
 * Parse various date formats into a Date object
 * Supports:
 * - ISO 8601: "2025-12-18T13:38:58.000Z"
 * - US format: "12/18/2025 13:38:58"
 * - Cambodia format: "18/12/2025 13:38:58"
 */
export function parseDate(value: unknown): Date | null {
  if (value == null) return null;
  
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // Try ISO format first
  if (raw.includes("T") || raw.endsWith("Z")) {
    const iso = new Date(raw);
    if (!isNaN(iso.getTime())) return iso;
  }

  // Try US format: MM/DD/YYYY HH:MM:SS
  const usMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (usMatch) {
    const [, month, day, year, hour, minute, second] = usMatch;
    const date = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
    if (!isNaN(date.getTime())) return date;
  }

  // Try Cambodia format: DD/MM/YYYY HH:MM:SS
  const khMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (khMatch) {
    const [, day, month, year, hour, minute, second] = khMatch;
    const date = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
    if (!isNaN(date.getTime())) return date;
  }

  // Fallback to generic Date parsing
  const fallback = new Date(raw);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Format a date for display
 * @param value - Date value to format
 * @param format - Format style: "compact" for mobile, "full" for desktop
 * @param locale - User's locale (defaults to browser locale)
 */
export function formatDate(
  value: unknown,
  format: DateFormat = "full",
  locale: string = typeof navigator !== "undefined" ? navigator.language : "en-US"
): string {
  const date = parseDate(value);
  if (!date) return "Invalid date";

  const options: Intl.DateTimeFormatOptions = 
    format === "compact"
      ? {
          day: "numeric",
          month: "short",
          year: "2-digit",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }
      : {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        };

  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    // Fallback for invalid locales
    return new Intl.DateTimeFormat("en-US", options).format(date);
  }
}

/**
 * Format date with "Updated:" prefix
 * Responsive format based on screen size
 */
export function formatLastUpdated(
  value: unknown,
  isMobile: boolean = false,
  locale?: string
): string {
  const formatted = formatDate(value, isMobile ? "compact" : "full", locale);
  if (formatted === "Invalid date") return "";
  
  return isMobile 
    ? `Updated: ${formatted}`
    : `Last updated: ${formatted}`;
}

/**
 * Get relative time (e.g., "2 hours ago", "just now")
 */
export function getRelativeTime(value: unknown, locale?: string): string {
  const date = parseDate(value);
  if (!date) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  const rtf = new Intl.RelativeTimeFormat(locale || navigator.language || "en", {
    numeric: "auto",
  });

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return rtf.format(-diffMin, "minute");
  if (diffHour < 24) return rtf.format(-diffHour, "hour");
  if (diffDay < 30) return rtf.format(-diffDay, "day");

  return formatDate(value, "compact", locale);
}

/**
 * Check if screen width is mobile (< 640px)
 * This is a utility function, NOT a React hook
 * Use only in client components or inside useEffect
 */
export function checkIsMobile(): boolean {
  if (typeof window === "undefined") return false;
  
  // Check if screen width is less than 640px (sm breakpoint)
  return window.innerWidth < 640;
}

/**
 * Format date with automatic mobile/desktop detection
 * Note: This should only be called from client components
 */
export function formatDateResponsive(
  value: unknown,
  locale?: string
): { compact: string; full: string; display: string; isMobile: boolean } {
  const isMobile = typeof window !== "undefined" ? window.innerWidth < 640 : false;
  
  return {
    compact: formatDate(value, "compact", locale),
    full: formatDate(value, "full", locale),
    display: formatDate(value, isMobile ? "compact" : "full", locale),
    isMobile,
  };
}
