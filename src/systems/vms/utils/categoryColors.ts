/**
 * Centralized Category Color Palette
 * 
 * Standardized colors for vehicle categories across all charts and UI components.
 * 
 * @module categoryColors
 */

export const CATEGORY_COLORS = {
  Cars: "#10b981",      // Emerald/Green
  Motorcycles: "#3b82f6", // Blue
  TukTuks: "#f59e0b",   // Orange/Amber
} as const;

export const CATEGORY_COLOR_NAMES = {
  Cars: "emerald",
  Motorcycles: "blue", 
  TukTuks: "orange",
} as const;

export type CategoryColorKey = keyof typeof CATEGORY_COLORS;

/**
 * Get the hex color for a category
 */
export function getCategoryColor(category: string): string {
  const normalized = category.toLowerCase().trim();
  if (normalized.includes("car")) return CATEGORY_COLORS.Cars;
  if (normalized.includes("motor")) return CATEGORY_COLORS.Motorcycles;
  if (normalized.includes("tuk")) return CATEGORY_COLORS.TukTuks;
  return "#6b7280"; // Default gray
}

/**
 * Get the color name for StatCard component
 */
export function getCategoryColorName(category: string): "emerald" | "blue" | "orange" | "purple" {
  const normalized = category.toLowerCase().trim();
  if (normalized.includes("car")) return "emerald";
  if (normalized.includes("motor")) return "blue";
  if (normalized.includes("tuk")) return "orange";
  return "purple";
}
