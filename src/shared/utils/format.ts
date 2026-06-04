/**
 * Formatting utilities for Emerald Cash VMS
 * Currency, dates, and number formatting
 */

import { normalizeCambodiaTimeString } from "@/shared/utils/cambodiaTime";

/**
 * Format currency using Intl.NumberFormat
 * @param value - Number or string to format
 * @param currency - Currency code (default: USD)
 * @param locale - Locale for formatting
 */
export function formatCurrency(
  value: number | string | null | undefined,
  currency: string = "USD",
  locale: string = "en-US"
): string {
  if (value == null || value === "") return "—";

  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return "—";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `$${num.toLocaleString()}`;
  }
}

/**
 * Format number with commas
 * @param value - Number or string to format
 */
export function formatNumber(value: number | string | null | undefined): string {
  if (value == null || value === "") return "—";

  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";

  return num.toLocaleString();
}

/**
 * Format date to Cambodia timezone format: YYYY-MM-DD HH:mm:ss
 * @param value - Date value to format
 */
export function formatDateCambodia(value: unknown): string {
  if (!value) return "—";
  return normalizeCambodiaTimeString(value) || "—";
}

/**
 * Format vehicle time for display
 * Wrapper around formatDateCambodia with fallback
 */
export function formatVehicleTime(time: string | null | undefined): string {
  return formatDateCambodia(time);
}

/**
 * Format percentage value
 * @param value - Number between 0 and 1
 * @param decimals - Number of decimal places
 */
export function formatPercent(
  value: number | null | undefined,
  decimals: number = 0
): string {
  if (value == null || isNaN(value)) return "—";

  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Format file size in human-readable format
 * @param bytes - Size in bytes
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);

  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Capitalize first letter of each word
 * @param text - Text to capitalize
 */
export function capitalizeWords(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Format vehicle ID for display (truncate if too long)
 * @param id - Vehicle ID
 */
export function formatVehicleId(id: string | null | undefined): string {
  if (!id) return "—";
  if (id.startsWith("temp-")) return "Saving...";
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}...${id.slice(-4)}`;
}
