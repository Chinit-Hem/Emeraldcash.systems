import { derivePrices } from "@/systems/vms/utils/pricing";
import type { Vehicle } from "@/shared/types/types";

function toStringValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  // Handle arrays - take first element if array (Google Sheets sometimes returns arrays)
  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    const first = value[0];
    if (typeof first === "string") return first;
    if (first == null) return "";
    return String(first);
  }
  return String(value);
}

export function parseImageDataUrl(
  value: unknown
): { mimeType: string; base64Data: string } | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("data:")) return null;

  const match = trimmed.match(/^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=]+)$/i);
  if (!match) return null;

  const mimeType = match[1]?.toLowerCase() ?? "";
  const base64Data = match[2] ?? "";
  if (!mimeType || !base64Data) return null;

  return { mimeType, base64Data };
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  // Handle arrays - take first element if array (Google Sheets sometimes returns arrays)
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return toNumberOrNull(value[0]);
  }
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.replaceAll(",", "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function pick(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined) return value;
  }

  const normalizeKey = (value: string) => value.toLowerCase().replace(/\s+/g, "");
  const normalizedRow = new Map<string, unknown>();
  for (const [key, value] of Object.entries(row)) {
    const normalized = normalizeKey(key);
    if (!normalized || normalizedRow.has(normalized)) continue;
    normalizedRow.set(normalized, value);
  }

  for (const key of keys) {
    const normalized = normalizeKey(key);
    const value = normalizedRow.get(normalized);
    if (value !== undefined) return value;
  }

  return undefined;
}

function normalizeCategoryFromSheet(value: unknown): string {
  const raw = toStringValue(value).trim();
  const normalized = raw.toLowerCase();
  if (!normalized) return "";

  if (normalized === "car" || normalized === "cars") return "Cars";
  if (normalized === "motorcycle" || normalized === "motorcycles") return "Motorcycles";
  if (normalized === "tuktuk" || normalized === "tuk tuk" || normalized === "tuk-tuk") return "Tuk Tuk";

  return raw;
}

// Function removed - was not used

// Apps Script URL builder
export function appsScriptUrl(baseUrl: string, action?: string): string {
  const url = new URL(baseUrl);
  if (action) {
    url.searchParams.set("action", action);
  }
  return url.toString();
}

// Apps Script fetch helper with timeout
interface FetchAppsScriptOptions extends RequestInit {
  timeoutMs?: number;
}

export async function fetchAppsScript(
  url: string,
  options: FetchAppsScriptOptions = {}
): Promise<Response> {
  const { timeoutMs = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export function toVehicle(row: Record<string, unknown>): Vehicle {
  const vehicleId = toStringValue(pick(row, ["VehicleId", "VehicleID", "Id", "id"]));

  const categoryRaw = pick(row, ["Category"]);
  const category = normalizeCategoryFromSheet(categoryRaw);

  const brand = toStringValue(pick(row, ["Brand"]));
  const model = toStringValue(pick(row, ["Model"]));
  const plate = toStringValue(pick(row, ["Plate", "PlateNumber", "Plate Number"]));

  const year = toNumberOrNull(pick(row, ["Year"]));
  const priceNew = toNumberOrNull(pick(row, ["PriceNew", "Market Price", "Price New", "Price (New)"]));
  const price40 = toNumberOrNull(
    pick(row, ["Price40", "D.O.C.40%", "D.O.C.1 40%", "Price 40%", "Price 40", "Price40%"])
  );
  const price70 = toNumberOrNull(
    pick(row, ["Price70", "Vehicles70%", "Vehicle 70%", "Vihicle 70%", "Price 70%", "Price 70", "Price70%"])
  );
  const derived = derivePrices(priceNew);

  const taxType = toStringValue(pick(row, ["TaxType", "Tax Type"]));
  const condition = toStringValue(pick(row, ["Condition"]));
  const bodyType = toStringValue(pick(row, ["BodyType", "Body Type"]));
  const color = toStringValue(pick(row, ["Color"]));
  const image = toStringValue(pick(row, ["Image", "ImageURL", "Image URL"]));
  const time = toStringValue(pick(row, ["Time", "Added Time"]));

  // Market price fields
  const marketPriceLow = toNumberOrNull(pick(row, ["MARKET_PRICE_LOW", "MarketPriceLow", "marketPriceLow"]));
  const marketPriceMedian = toNumberOrNull(pick(row, ["MARKET_PRICE_MEDIAN", "MarketPriceMedian", "marketPriceMedian"]));
  const marketPriceHigh = toNumberOrNull(pick(row, ["MARKET_PRICE_HIGH", "MarketPriceHigh", "marketPriceHigh"]));
  const marketPriceSource = toStringValue(pick(row, ["MARKET_PRICE_SOURCE", "MarketPriceSource", "marketPriceSource"]));
  const marketPriceSamples = toNumberOrNull(pick(row, ["MARKET_PRICE_SAMPLES", "MarketPriceSamples", "marketPriceSamples"]));
  const marketPriceConfidence = toStringValue(pick(row, ["MARKET_PRICE_CONFIDENCE", "MarketPriceConfidence", "marketPriceConfidence"]));
  const marketPriceUpdatedAt = toStringValue(pick(row, ["MARKET_PRICE_UPDATED_AT", "MarketPriceUpdatedAt", "marketPriceUpdatedAt"]));

  return {
    VehicleId: vehicleId,
    Category: category,
    Brand: brand,
    Model: model,
    Year: year,
    Plate: plate,
    PriceNew: priceNew,
    Price40: price40 ?? derived.Price40,
    Price70: price70 ?? derived.Price70,
    TaxType: taxType,
    Condition: condition,
    BodyType: bodyType,
    Color: color,
    Image: image,
    Time: time,
    // Market price fields
    MarketPriceLow: marketPriceLow,
    MarketPriceMedian: marketPriceMedian,
    MarketPriceHigh: marketPriceHigh,
    MarketPriceSource: marketPriceSource || null,
    MarketPriceSamples: marketPriceSamples,
    MarketPriceConfidence: (marketPriceConfidence as "High" | "Medium" | "Low") || null,
    MarketPriceUpdatedAt: marketPriceUpdatedAt || null,
  };
}

