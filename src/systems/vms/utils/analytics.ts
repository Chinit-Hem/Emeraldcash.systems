import type { Vehicle } from "@/shared/types/types";

export type CategoryLabel = "Cars" | "Motorcycles" | "TukTuks" | "Other";
export type ConditionLabel = "New" | "Used" | "Other";

export type PieDatum = { name: string; value: number; color: string };
export type BarDatum = { name: string; value: number };

export type MarketPriceStats = {
  count: number;
  sum: number;
  avg: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
};

export function normalizeCategoryLabel(value: unknown): CategoryLabel {
  const raw = String(value ?? "").trim().replace(/\s+/g, ' ').replace(/\+/g, ' ').toLowerCase();
  if (!raw) return "Other";
  if (raw.includes("car")) return "Cars";
  if (raw.includes("motor")) return "Motorcycles";
  if (raw.includes("tuk")) return "TukTuks";
  return "Other";
}

export function normalizeConditionLabel(value: unknown): ConditionLabel {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "Other";
  if (raw === "new") return "New";
  if (raw === "used") return "Used";
  return "Other";
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function monthKeyFromYMD(year: number, month: number) {
  return `${year}-${pad2(month)}`;
}

function parseVehicleDateKey(rawValue: unknown): { dateKey: string; monthKey: string } | null {
  const raw = String(rawValue ?? "").trim();
  if (!raw) return null;

  // Supported:
  // - YYYY-MM-DD HH:mm:ss
  // - YYYY-MM-DDTHH:mm:ss
  // - MM/DD/YYYY HH:mm:ss
  let match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    const year = Number.parseInt(match[1] ?? "", 10);
    const month = Number.parseInt(match[2] ?? "", 10);
    const day = Number.parseInt(match[3] ?? "", 10);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    const dateKey = `${year}-${pad2(month)}-${pad2(day)}`;
    return { dateKey, monthKey: monthKeyFromYMD(year, month) };
  }

  match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const month = Number.parseInt(match[1] ?? "", 10);
    const day = Number.parseInt(match[2] ?? "", 10);
    const year = Number.parseInt(match[3] ?? "", 10);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    const dateKey = `${year}-${pad2(month)}-${pad2(day)}`;
    return { dateKey, monthKey: monthKeyFromYMD(year, month) };
  }

  return null;
}

function monthRange(start: string, end: string): string[] {
  // month keys: YYYY-MM
  const parse = (m: string) => {
    const match = m.match(/^(\d{4})-(\d{2})$/);
    if (!match) return null;
    const year = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
    return { year, month };
  };

  const a = parse(start);
  const b = parse(end);
  if (!a || !b) return [];

  const out: string[] = [];
  let year = a.year;
  let month = a.month;
  while (year < b.year || (year === b.year && month <= b.month)) {
    out.push(monthKeyFromYMD(year, month));
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
    if (out.length > 240) break; // safety: 20y
  }
  return out;
}

export function buildVehiclesByCategory(vehicles: Vehicle[]): PieDatum[] {
  const counts: Record<CategoryLabel, number> = {
    Cars: 0,
    Motorcycles: 0,
    TukTuks: 0,
    Other: 0,
  };

  for (const v of vehicles) counts[normalizeCategoryLabel(v.Category)] += 1;

  const colors: Record<CategoryLabel, string> = {
    Cars: "var(--ec-chart-emerald)",
    Motorcycles: "var(--ec-chart-emerald-soft)",
    TukTuks: "var(--ec-chart-red-soft)",
    Other: "var(--ec-chart-neutral)",
  };

  return (Object.keys(counts) as CategoryLabel[])
    .filter((key) => counts[key] > 0)
    .map((key) => ({ name: key, value: counts[key], color: colors[key] }));
}

export function buildVehiclesByBrand(vehicles: Vehicle[], top = 12): BarDatum[] {
  const counts = new Map<string, number>();

  for (const v of vehicles) {
    const brand = String(v.Brand ?? "").trim();
    if (!brand) continue;
    counts.set(brand, (counts.get(brand) ?? 0) + 1);
  }

  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const topEntries = sorted.slice(0, Math.max(1, top));
  const restCount = sorted.slice(topEntries.length).reduce((sum, [, c]) => sum + c, 0);

  const data = topEntries.map(([name, value]) => ({ name, value }));
  if (restCount > 0) data.push({ name: "Other", value: restCount });
  return data;
}

export function buildNewVsUsed(vehicles: Vehicle[]): PieDatum[] {
  const counts: Record<ConditionLabel, number> = { New: 0, Used: 0, Other: 0 };
  for (const v of vehicles) counts[normalizeConditionLabel(v.Condition)] += 1;

  const colors: Record<ConditionLabel, string> = {
    New: "var(--ec-chart-emerald)",
    Used: "var(--ec-chart-red)",
    Other: "var(--ec-chart-neutral)",
  };

  return (Object.keys(counts) as ConditionLabel[])
    .filter((key) => counts[key] > 0)
    .map((key) => ({ name: key, value: counts[key], color: colors[key] }));
}

export function marketPriceStats(vehicles: Vehicle[]): MarketPriceStats {
  const prices: number[] = [];
  for (const v of vehicles) {
    const p = v.PriceNew;
    if (typeof p === "number" && Number.isFinite(p)) prices.push(p);
  }

  prices.sort((a, b) => a - b);

  const count = prices.length;
  const sum = prices.reduce((acc, n) => acc + n, 0);
  const avg = count > 0 ? sum / count : null;
  const min = count > 0 ? prices[0] : null;
  const max = count > 0 ? prices[count - 1] : null;

  let median: number | null = null;
  if (count > 0) {
    const mid = Math.floor(count / 2);
    median = count % 2 === 1 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
  }

  return { count, sum, avg, median, min, max };
}

export function buildPriceDistribution(vehicles: Vehicle[]): BarDatum[] {
  const prices: number[] = [];
  for (const v of vehicles) {
    const p = v.PriceNew;
    if (typeof p === "number" && Number.isFinite(p)) prices.push(p);
  }
  if (prices.length === 0) return [];

  const max = Math.max(...prices);
  const step =
    max <= 5000 ? 500 :
    max <= 20000 ? 2000 :
    max <= 60000 ? 5000 :
    10000;

  const buckets = new Map<number, number>();
  for (const price of prices) {
    const bucketStart = Math.floor(price / step) * step;
    buckets.set(bucketStart, (buckets.get(bucketStart) ?? 0) + 1);
  }

  const sorted = Array.from(buckets.entries()).sort((a, b) => a[0] - b[0]);
  return sorted.map(([start, count]) => ({
    name: `$${start.toLocaleString()}+`,
    value: count,
  }));
}

export function buildMonthlyAdded(vehicles: Vehicle[]): BarDatum[] {
  const monthCounts = new Map<string, number>();

  for (const v of vehicles) {
    const parsed = parseVehicleDateKey(v.Time);
    if (!parsed) continue;
    monthCounts.set(parsed.monthKey, (monthCounts.get(parsed.monthKey) ?? 0) + 1);
  }

  const keys = Array.from(monthCounts.keys()).sort();
  if (keys.length === 0) return [];

  const range = monthRange(keys[0], keys[keys.length - 1]);
  return range.map((month) => ({ name: month, value: monthCounts.get(month) ?? 0 }));
}

// ============================================================================
// Shared Vehicle Meta Computation - Eliminates duplicate code across components
// ============================================================================

import type { VehicleMeta } from "@/shared/types/types";

/**
 * Compute vehicle metadata from an array of vehicles
 * Defensive programming: handles undefined/null inputs safely
 *
 * This function consolidates the duplicate computeVehicleMeta logic from:
 * - VehiclesClient.tsx
 * - DashboardClient.tsx (via aggregatedStats)
 *
 * @param vehicles - Array of vehicles (or undefined/null)
 * @returns VehicleMeta object with computed statistics
 */
export function computeVehicleMeta(vehicles: Vehicle[] | undefined | null): VehicleMeta {
  // Safe default return for undefined/null input
  const safeVehicles = vehicles ?? [];

  const stats = {
    total: safeVehicles.length,
    cars: 0,
    motorcycles: 0,
    tuktuks: 0,
    new: 0,
    used: 0,
    noImage: 0,
    totalPrice: 0,
    priceCount: 0,
  };

  for (const v of safeVehicles) {
    const cat = normalizeCategoryLabel(v?.Category);
    if (cat === "Cars") stats.cars++;
    else if (cat === "Motorcycles") stats.motorcycles++;
    else if (cat === "TukTuks") stats.tuktuks++;

    const cond = normalizeConditionLabel(v?.Condition);
    if (cond === "New") stats.new++;
    else if (cond === "Used") stats.used++;

    if (!v?.Image || v.Image.trim() === '') stats.noImage++;
    if (v?.PriceNew != null && v.PriceNew > 0) {
      stats.totalPrice += v.PriceNew;
      stats.priceCount++;
    }
  }

  return {
    total: stats.total,
    countsByCategory: {
      Cars: stats.cars,
      Motorcycles: stats.motorcycles,
      TukTuks: stats.tuktuks,
    },
    avgPrice: stats.priceCount > 0 ? stats.totalPrice / stats.priceCount : 0,
    noImageCount: stats.noImage,
    countsByCondition: {
      New: stats.new,
      Used: stats.used,
    },
  };
}

/**
 * Filter brands to exclude invalid/placeholder values
 * Shared constant to ensure consistency across components
 */
export const INVALID_BRANDS = ['DIRECT_DB', 'TEST', 'UNKNOWN', 'N/A', 'NULL', 'NONE', ''];

/**
 * Compute brand statistics from vehicles
 * Filters out invalid brands and returns top N brands
 */
export function computeBrandStats(
  vehicles: Vehicle[] | undefined | null,
  options?: { top?: number; exclude?: string[] }
): { name: string; value: number }[] {
  const safeVehicles = vehicles ?? [];
  const top = options?.top ?? 10;
  const exclude = options?.exclude ?? INVALID_BRANDS;

  const counts = new Map<string, number>();

  for (const v of safeVehicles) {
    const brand = String(v?.Brand ?? "").trim().toUpperCase();
    if (!brand || exclude.includes(brand)) continue;
    counts.set(brand, (counts.get(brand) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, top);
}
