/**
 * Safe Date Parsing Utility
 * 
 * Safari is strict about date formats and crashes on invalid dates.
 * This utility provides safe date parsing that returns null for invalid dates
 * instead of throwing errors or returning "Invalid Date".
 * 
 * @module safeDate
 */

import { parseISO, isValid, format } from 'date-fns';

// Re-export parseISO for direct use
export { parseISO };

/**
 * Get current date as ISO string safely
 * This is safe for Safari as it doesn't parse any input strings
 * 
 * @returns ISO string of current date/time
 */
export function safeNowISO(): string {
  return new Date().toISOString();
}

/**
 * Get current year safely
 * This is safe for Safari as it doesn't parse any input strings
 * 
 * @returns Current year as number
 */
export function safeGetCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Safely parse a date string or value
 * Returns null if the date is invalid or cannot be parsed
 * 
 * @param value - The value to parse (string, Date, number, or unknown)
 * @returns Date object or null if invalid
 */
export function safeParseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // If already a Date object, validate it
  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  // Convert to string for parsing
  const dateString = String(value).trim();
  
  if (!dateString || dateString === 'null' || dateString === 'undefined') {
    return null;
  }

  try {
    // Try ISO format first (most reliable)
    const parsed = parseISO(dateString);
    
    if (isValid(parsed)) {
      return parsed;
    }

    // Fallback: try native Date parsing for other formats
    const nativeDate = new Date(dateString);
    if (isValid(nativeDate)) {
      return nativeDate;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Format a date safely for display
 * Returns fallback string if date is invalid
 * 
 * @param value - The date value to format
 * @param formatString - date-fns format string (default: 'PPP' = Apr 29, 2025)
 * @param fallback - String to return if date is invalid (default: 'N/A')
 * @returns Formatted date string or fallback
 */
export function safeFormatDate(
  value: unknown,
  formatString: string = 'PPP',
  fallback: string = 'N/A'
): string {
  const date = safeParseDate(value);
  
  if (!date) {
    return fallback;
  }

  try {
    return format(date, formatString);
  } catch {
    return fallback;
  }
}

/**
 * Format a date to locale string safely
 * Returns fallback string if date is invalid
 * 
 * @param value - The date value to format
 * @param fallback - String to return if date is invalid (default: 'N/A')
 * @returns Locale formatted date string or fallback
 */
export function safeToLocaleDateString(
  value: unknown,
  fallback: string = 'N/A'
): string {
  const date = safeParseDate(value);
  
  if (!date) {
    return fallback;
  }

  try {
    return date.toLocaleDateString();
  } catch {
    return fallback;
  }
}

/**
 * Format a date to locale string with time safely
 * Returns fallback string if date is invalid
 * 
 * @param value - The date value to format
 * @param fallback - String to return if date is invalid (default: 'N/A')
 * @returns Locale formatted date/time string or fallback
 */
export function safeToLocaleString(
  value: unknown,
  fallback: string = 'N/A'
): string {
  const date = safeParseDate(value);
  
  if (!date) {
    return fallback;
  }

  try {
    return date.toLocaleString();
  } catch {
    return fallback;
  }
}

/**
 * Get year from date safely
 * Returns null if date is invalid
 * 
 * @param value - The date value
 * @returns Year number or null
 */
export function safeGetYear(value: unknown): number | null {
  const date = safeParseDate(value);
  return date ? date.getFullYear() : null;
}

/**
 * Get month from date safely (0-11)
 * Returns null if date is invalid
 * 
 * @param value - The date value
 * @returns Month number (0-11) or null
 */
export function safeGetMonth(value: unknown): number | null {
  const date = safeParseDate(value);
  return date ? date.getMonth() : null;
}

/**
 * Create a month key (YYYY-MM) from date safely
 * Returns null if date is invalid
 * 
 * @param value - The date value
 * @returns Month key string (YYYY-MM) or null
 */
export function safeGetMonthKey(value: unknown): string | null {
  const date = safeParseDate(value);
  
  if (!date) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
