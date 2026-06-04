/**
 * Cambodia Market Price Library
 *
 * @module market-price
 * Fetches and calculates market prices from Cambodian marketplaces
 * for vehicles (cars, motorcycles, tuk-tuks).
 *
 * Features:
 * - Web scraping from Khmer24 and other Cambodian marketplaces
 * - Price extraction with outlier removal
 * - Robust statistics (median, percentiles, IQR-based confidence)
 * - Caching strategy (in-memory + optional persistent storage)
 * - Manual price override support
 * - CSV/JSON import for bulk price data
 */

// In-memory cache (1 hour TTL)
import { globalLogger } from "@/lib/logger";
const memoryCache = new Map<string, CacheEntry>();
const pendingFetches = new Map<string, Promise<MarketPriceResult>>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MARKET_PRICE_FETCH_TIMEOUT_MS = 8000;
const MAX_MARKET_PRICE_CACHE_ENTRIES = 250;

interface CacheEntry {
  data: Omit<MarketPriceResult, "fetchedAt" | "cacheHit" | "cachedUntil">;
  timestamp: number;
}

interface MarketPriceInput {
  category: string;
  brand: string;
  model: string;
  year?: number | null;
  condition?: string;
}

interface MarketPriceResultCore {
  prices: number[];
  priceLow: number | null;
  priceMedian: number | null;
  priceHigh: number | null;
  sources: string[];
  sampleCount: number;
  confidence: "High" | "Medium" | "Low" | "Unknown";
  // Enhanced statistics
  variance?: number | null;
  stdDev?: number | null;
  priceRange?: { min: number | null; max: number | null };
  dataQuality?: "Excellent" | "Good" | "Fair" | "Poor" | "Manual";
}

interface MarketPriceResult extends MarketPriceResultCore {
  fetchedAt: string;
  cacheHit: boolean;
  cachedUntil?: string;
}

// Manual override storage (in-memory)
const manualOverrides = new Map<string, ManualPriceEntry>();
interface ManualPriceEntry {
  priceLow: number;
  priceMedian: number;
  priceHigh: number;
  source: string;
  samples: number;
  confidence: "High" | "Medium" | "Low";
  updatedAt: string;
  updatedBy?: string;
}

/**
 * Generate cache key from input
 */
export function getCacheKey(input: MarketPriceInput): string {
  const key = [
    input.category.toLowerCase(),
    input.brand.toLowerCase(),
    input.model.toLowerCase(),
    input.year?.toString() || "any",
    (input.condition || "any").toLowerCase(),
  ].join(":");
  return `marketprice:${key}`;
}

/**
 * Check if cache is valid
 */
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

/**
 * Get cached result if available
 */
export function getCachedPrice(input: MarketPriceInput): MarketPriceResult | null {
  const key = getCacheKey(input);
  const entry = memoryCache.get(key);

  if (entry && isCacheValid(entry)) {
    return {
      ...entry.data,
      fetchedAt: new Date(entry.timestamp).toISOString(),
      cacheHit: true,
      cachedUntil: new Date(entry.timestamp + CACHE_TTL_MS).toISOString(),
    };
  }

  return null;
}

function rememberMarketPrice(key: string, data: MarketPriceResultCore) {
  if (memoryCache.size >= MAX_MARKET_PRICE_CACHE_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }

  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Clear memory cache
 */
export function clearMarketPriceCache(): void {
  memoryCache.clear();
}

/**
 * Clear specific cache entry
 */
export function clearCacheEntry(input: MarketPriceInput): boolean {
  const key = getCacheKey(input);
  return memoryCache.delete(key);
}

/**
 * Fetch market prices from external sources
 */
export async function fetchMarketPrices(input: MarketPriceInput): Promise<MarketPriceResult> {
  // Check manual override first
  const overrideKey = getCacheKey(input);
  const manualEntry = manualOverrides.get(overrideKey);
  if (manualEntry) {
    return {
      prices: [],
      priceLow: manualEntry.priceLow,
      priceMedian: manualEntry.priceMedian,
      priceHigh: manualEntry.priceHigh,
      sources: [manualEntry.source],
      sampleCount: manualEntry.samples,
      confidence: manualEntry.confidence,
      fetchedAt: manualEntry.updatedAt,
      cacheHit: false,
      variance: null,
      stdDev: null,
      priceRange: { min: manualEntry.priceLow, max: manualEntry.priceHigh },
      dataQuality: "Manual",
    };
  }

  // Check cache first
  const cached = getCachedPrice(input);
  if (cached) {
    return cached;
  }

  const pendingFetch = pendingFetches.get(overrideKey);
  if (pendingFetch) {
    return pendingFetch;
  }

  const fetchPromise = (async () => {
    // Fetch from external sources
    const results = await fetchFromKhmer24(input);

    // Calculate price ranges
    const result = calculatePriceRanges(results);

    // Cache the result (without metadata fields)
    rememberMarketPrice(overrideKey, result);

    return {
      ...result,
      fetchedAt: new Date().toISOString(),
      cacheHit: false,
    };
  })();

  pendingFetches.set(overrideKey, fetchPromise);

  try {
    return await fetchPromise;
  } finally {
    pendingFetches.delete(overrideKey);
  }
}

/**
 * Set manual price override
 */
export function setManualPriceOverride(
  input: MarketPriceInput,
  override: {
    priceLow: number;
    priceMedian: number;
    priceHigh: number;
    source: string;
    samples?: number;
    confidence?: "High" | "Medium" | "Low";
    updatedBy?: string;
  }
): void {
  const key = getCacheKey(input);
  manualOverrides.set(key, {
    priceLow: override.priceLow,
    priceMedian: override.priceMedian,
    priceHigh: override.priceHigh,
    source: override.source || "Manual Entry",
    samples: override.samples || 0,
    confidence: override.confidence || "Medium",
    updatedAt: new Date().toISOString(),
    updatedBy: override.updatedBy,
  });

  // Clear cache entry so new override is used
  memoryCache.delete(key);
}

/**
 * Remove manual price override
 */
export function removeManualPriceOverride(input: MarketPriceInput): boolean {
  const key = getCacheKey(input);
  return manualOverrides.delete(key);
}

/**
 * Get manual price override if exists
 */
export function getManualPriceOverride(input: MarketPriceInput): ManualPriceEntry | null {
  const key = getCacheKey(input);
  return manualOverrides.get(key) || null;
}

/**
 * Import prices from CSV format
 * CSV format: brand,model,year,priceLow,priceMedian,priceHigh,source,confidence
 */
export function importPricesFromCSV(csvContent: string): { success: number; failed: number; errors: string[] } {
  const lines = csvContent.trim().split('\n');
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  // Skip header if present
  const startIndex = lines[0].toLowerCase().includes('brand') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle both comma and tab-separated values
    const parts = line.includes('\t') ? line.split('\t') : line.split(',');

    if (parts.length < 4) {
      errors.push(`Line ${i + 1}: Insufficient columns`);
      failed++;
      continue;
    }

    try {
      const category = (parts[0] || "").trim();
      const brand = (parts[1] || "").trim();
      const model = (parts[2] || "").trim();
      const year = parts[3] ? parseInt(parts[3].trim(), 10) : null;
      const priceLow = parts[4] ? parseFloat(parts[4].replace(/[$,]/g, '')) : null;
      const priceMedian = parts[5] ? parseFloat(parts[5].replace(/[$,]/g, '')) : null;
      const priceHigh = parts[6] ? parseFloat(parts[6].replace(/[$,]/g, '')) : null;
      const source = parts[7]?.trim() || "CSV Import";
      const confidence = (parts[8]?.trim() as "High" | "Medium" | "Low") || "Medium";

      if (!category || !brand || !model || priceMedian === null) {
        errors.push(`Line ${i + 1}: Missing required fields`);
        failed++;
        continue;
      }

      setManualPriceOverride(
        { category, brand, model, year: year || undefined },
        {
          priceLow: priceLow ?? priceMedian * 0.9,
          priceMedian,
          priceHigh: priceHigh ?? priceMedian * 1.1,
          source,
          samples: 0,
          confidence,
        }
      );
      success++;
    } catch (err) {
      errors.push(`Line ${i + 1}: ${err instanceof Error ? err.message : "Unknown error"}`);
      failed++;
    }
  }

  return { success, failed, errors };
}

/**
 * Import prices from JSON format
 * JSON format: Array of { category, brand, model, year?, priceLow, priceMedian, priceHigh, source?, confidence? }
 */
export function importPricesFromJSON(jsonContent: string): { success: number; failed: number; errors: string[] } {
  let data: unknown;
  try {
    data = JSON.parse(jsonContent);
  } catch (err) {
    return { success: 0, failed: 1, errors: [`Invalid JSON: ${err instanceof Error ? err.message : "Unknown error"}`] };
  }

  if (!Array.isArray(data)) {
    return { success: 0, failed: 1, errors: ["JSON must be an array of price entries"] };
  }

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < data.length; i++) {
    const item = data[i] as Record<string, unknown>;

    try {
      const category = String(item.category || "").trim();
      const brand = String(item.brand || "").trim();
      const model = String(item.model || "").trim();
      const year = item.year ? parseInt(String(item.year), 10) : null;
      const priceLow = typeof item.priceLow === "number" ? item.priceLow : null;
      const priceMedian = typeof item.priceMedian === "number" ? item.priceMedian : null;
      const priceHigh = typeof item.priceHigh === "number" ? item.priceHigh : null;
      const source = String(item.source || "JSON Import").trim();
      const confidence = (item.confidence as "High" | "Medium" | "Low") || "Medium";

      if (!category || !brand || !model || priceMedian === null) {
        errors.push(`Item ${i + 1}: Missing required fields`);
        failed++;
        continue;
      }

      setManualPriceOverride(
        { category, brand, model, year: year || undefined },
        {
          priceLow: priceLow ?? priceMedian * 0.9,
          priceMedian,
          priceHigh: priceHigh ?? priceMedian * 1.1,
          source,
          samples: 0,
          confidence,
        }
      );
      success++;
    } catch (err) {
      errors.push(`Item ${i + 1}: ${err instanceof Error ? err.message : "Unknown error"}`);
      failed++;
    }
  }

  return { success, failed, errors };
}

/**
 * Export prices to JSON format
 */
export function exportPricesToJSON(inputs: MarketPriceInput[]): string {
  const entries: Array<{
    category: string;
    brand: string;
    model: string;
    year: number | null;
    priceLow: number;
    priceMedian: number;
    priceHigh: number;
    source: string;
    confidence: string;
    updatedAt: string;
  }> = [];

  for (const input of inputs) {
    const key = getCacheKey(input);
    const manual = manualOverrides.get(key);
    const cached = memoryCache.get(key);

    if (manual) {
      entries.push({
        category: input.category,
        brand: input.brand,
        model: input.model,
        year: input.year || null,
        priceLow: manual.priceLow,
        priceMedian: manual.priceMedian,
        priceHigh: manual.priceHigh,
        source: manual.source,
        confidence: manual.confidence,
        updatedAt: manual.updatedAt,
      });
    } else if (cached && isCacheValid(cached)) {
      const data = cached.data;
      entries.push({
        category: input.category,
        brand: input.brand,
        model: input.model,
        year: input.year || null,
        priceLow: data.priceLow ?? 0,
        priceMedian: data.priceMedian ?? 0,
        priceHigh: data.priceHigh ?? 0,
        source: data.sources[0] || "Unknown",
        confidence: data.confidence,
        updatedAt: new Date(cached.timestamp).toISOString(),
      });
    }
  }

  return JSON.stringify(entries, null, 2);
}

/**
 * Fetch prices from Khmer24
 */
async function fetchFromKhmer24(input: MarketPriceInput): Promise<{ price: number; source: string }[]> {
  const results: { price: number; source: string }[] = [];
  let requestUrl = "";

  try {
    // Build search URL for Khmer24
    const searchQuery = buildKhmer24Query(input);
    const url = `https://www.khmer24.com/en/search/?q=${encodeURIComponent(searchQuery)}`;
    requestUrl = url;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "VMS-MarketPriceBot/1.0 (Educational)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(MARKET_PRICE_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      if (process.env.NODE_ENV === 'development') {
        globalLogger.warn("[MarketPrice] Khmer24 fetch failed", { status: response.status, statusText: response.statusText, url });
      }
      return results;
    }

    const html = await response.text();

    // Parse prices from HTML (simplified - in production, use proper HTML parser)
    const pricePattern = /\$\s*([\d,]+)/g;
    const matches = [...html.matchAll(pricePattern)];

    for (const match of matches) {
      const priceStr = match[1].replace(/,/g, "");
      const price = parseFloat(priceStr);

      // Filter reasonable prices (USD)
      if (price >= 100 && price <= 500000) {
        results.push({
          price,
          source: "khmer24.com",
        });
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      globalLogger.error(
        "[MarketPrice] Khmer24 fetch error",
        error instanceof Error ? error : { error: String(error) },
        { url: requestUrl }
      );
    }
  }

  return results;
}

/**
 * Build Khmer24 search query
 */
function buildKhmer24Query(input: MarketPriceInput): string {
  const parts: string[] = [input.brand, input.model];

  if (input.year) {
    parts.push(input.year.toString());
  }

  if (input.category === "Cars") {
    parts.push("car", "vehicle");
  } else if (input.category === "Motorcycles") {
    parts.push("motorcycle", "bike");
  } else if (input.category === "TukTuks" || input.category === "Tuk Tuk") {
    parts.push("tuk", "tuktuk", "remork");
  }

  return parts.join(" ");
}

/**
 * Calculate price ranges from collected data
 */
function calculatePriceRanges(
  priceData: { price: number; source: string }[]
): MarketPriceResultCore {
  if (priceData.length === 0) {
    return {
      prices: [],
      priceLow: null,
      priceMedian: null,
      priceHigh: null,
      sources: [],
      sampleCount: 0,
      confidence: "Unknown",
      variance: null,
      stdDev: null,
      priceRange: { min: null, max: null },
      dataQuality: "Poor",
    };
  }

  // Extract unique sources
  const sources = [...new Set(priceData.map((p) => p.source))];

  // Sort prices for percentile calculation
  const prices = priceData.map((p) => p.price).sort((a, b) => a - b);

  // Remove outliers using IQR method
  const cleanedPrices = removeOutliers(prices);

  // Calculate percentiles
  const sampleCount = cleanedPrices.length;

  let priceLow: number | null = null;
  let priceMedian: number | null = null;
  let priceHigh: number | null = null;

  if (sampleCount > 0) {
    priceLow = Math.round(percentile(cleanedPrices, 25));
    priceMedian = Math.round(percentile(cleanedPrices, 50));
    priceHigh = Math.round(percentile(cleanedPrices, 75));
  }

  // Calculate variance and standard deviation
  const variance = calculateVariance(cleanedPrices);
  const stdDev = variance !== null ? Math.sqrt(variance) : null;

  // Determine confidence based on sample count
  let confidence: "High" | "Medium" | "Low" | "Unknown";
  if (sampleCount >= 20) {
    confidence = "High";
  } else if (sampleCount >= 10) {
    confidence = "Medium";
  } else if (sampleCount >= 1) {
    confidence = "Low";
  } else {
    confidence = "Unknown";
  }

  // Determine data quality based on coefficient of variation (CV)
  let dataQuality: "Excellent" | "Good" | "Fair" | "Poor";
  if (priceMedian !== null && stdDev !== null) {
    const cv = stdDev / priceMedian; // Coefficient of variation
    if (cv < 0.1) {
      dataQuality = "Excellent"; // CV < 10%
    } else if (cv < 0.2) {
      dataQuality = "Good"; // CV < 20%
    } else if (cv < 0.35) {
      dataQuality = "Fair"; // CV < 35%
    } else {
      dataQuality = "Poor"; // CV >= 35%
    }
  } else if (sampleCount >= 10) {
    dataQuality = "Good";
  } else if (sampleCount >= 5) {
    dataQuality = "Fair";
  } else {
    dataQuality = "Poor";
  }

  return {
    prices: cleanedPrices,
    priceLow,
    priceMedian,
    priceHigh,
    sources,
    sampleCount,
    confidence,
    variance,
    stdDev,
    priceRange: { min: cleanedPrices[0] ?? null, max: cleanedPrices[cleanedPrices.length - 1] ?? null },
    dataQuality,
  };
}

/**
 * Calculate variance of prices
 */
function calculateVariance(prices: number[]): number | null {
  if (prices.length < 2) return null;

  // Optimized single-pass variance calculation with Bessel's correction (n-1)
  let sum = 0;
  let sumSq = 0;
  for (const x of prices) {
    sum += x;
    sumSq += x * x;
  }
  const n = prices.length;
  return (sumSq - (sum * sum) / n) / (n - 1);
}

/**
 * Remove outliers using IQR method
 */
function removeOutliers(prices: number[]): number[] {
  if (prices.length < 4) {
    return prices; // Not enough data for outlier detection
  }

  const q1 = percentile(prices, 25);
  const q3 = percentile(prices, 75);
  const iqr = q3 - q1;

  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  return prices.filter((price) => price >= lowerBound && price <= upperBound);
}

/**
 * Calculate percentile
 */
function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;

  const index = (p / 100) * (sortedArr.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sortedArr[lower];
  }

  const weight = index - lower;
  return sortedArr[lower] * (1 - weight) + sortedArr[upper] * weight;
}

/**
 * Format price for display
 */
export function formatMarketPrice(price: number | null): string {
  if (price == null) return "-";
  return `$${price.toLocaleString()}`;
}

/**
 * Get confidence color for UI
 */
export function getConfidenceColor(confidence: MarketPriceResult["confidence"]): string {
  switch (confidence) {
    case "High":
      return "text-green-600 bg-green-100";
    case "Medium":
      return "text-yellow-600 bg-yellow-100";
    case "Low":
      return "text-orange-600 bg-orange-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
}

/**
 * Get confidence label
 */
export function getConfidenceLabel(confidence: MarketPriceResult["confidence"]): string {
  switch (confidence) {
    case "High":
      return "High Confidence";
    case "Medium":
      return "Medium Confidence";
    case "Low":
      return "Low Confidence";
    default:
      return "No Data";
  }
}

/**
 * Get data quality color for UI
 */
export function getDataQualityColor(quality: MarketPriceResultCore["dataQuality"]): string {
  switch (quality) {
    case "Excellent":
      return "text-emerald-600 bg-emerald-100";
    case "Good":
      return "text-green-600 bg-green-100";
    case "Fair":
      return "text-yellow-600 bg-yellow-100";
    case "Poor":
      return "text-red-600 bg-red-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
}

/**
 * Get data quality label
 */
export function getDataQualityLabel(quality: MarketPriceResultCore["dataQuality"]): string {
  switch (quality) {
    case "Excellent":
      return "Excellent Quality";
    case "Good":
      return "Good Quality";
    case "Fair":
      return "Fair Quality";
    case "Poor":
      return "Poor Quality";
    default:
      return "Unknown Quality";
  }
}

/**
 * Get confidence score (0-100) for numerical display
 */
export function getConfidenceScore(confidence: MarketPriceResult["confidence"]): number {
  switch (confidence) {
    case "High":
      return 90;
    case "Medium":
      return 60;
    case "Low":
      return 30;
    default:
      return 0;
  }
}

/**
 * Estimate price using rule-based approach (fallback)
 */
export function estimatePriceRuleBased(
  brand: string,
  model: string,
  year: number | null,
  category: string
): MarketPriceResult {
  // Base prices by category (USD)
  const basePrices: Record<string, number> = {
    "Cars": 25000,
    "Motorcycles": 1500,
    "TukTuks": 3500,
    "Tuk Tuk": 3500,
  };

  const basePrice = basePrices[category] || 25000;

  // Brand multipliers - cars
  const carBrandMultipliers: Record<string, number> = {
    // Luxury brands
    "Mercedes-Benz": 2.5,
    "BMW": 2.2,
    "Audi": 2.0,
    "Lexus": 1.8,
    // Premium brands
    "Toyota": 1.2,
    "Mazda": 1.0,
    "Nissan": 0.95,
    // Economy brands
    "Hyundai": 0.8,
    "Kia": 0.75,
    "Chevrolet": 0.7,
    "Ford": 0.65,
  };

  // Brand multipliers - motorcycles
  const motoBrandMultipliers: Record<string, number> = {
    "Honda": 1.2,
    "Yamaha": 1.1,
    "Kawasaki": 1.3,
    "Suzuki": 0.9,
    "Sym": 0.7,
    "Other": 1.0,
  };

  // Select appropriate multiplier map
  const isMotorcycle = category === "Motorcycles";
  const multipliers = isMotorcycle ? motoBrandMultipliers : carBrandMultipliers;

  const multiplier = multipliers[brand] || multipliers["Other"] || 1.0;

  // Year depreciation
  let yearMultiplier = 1.0;
  if (year) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - year;
    // Depreciate 10% per year, max 70%
    yearMultiplier = Math.max(0.3, 1 - (age * 0.1));
  }

  const estimatedPrice = Math.round(basePrice * multiplier * yearMultiplier);

  return {
    prices: [],
    priceLow: Math.round(estimatedPrice * 0.9),
    priceMedian: estimatedPrice,
    priceHigh: Math.round(estimatedPrice * 1.1),
    sources: ["estimated"],
    sampleCount: 0,
    confidence: "Low",
    fetchedAt: new Date().toISOString(),
    cacheHit: false,
  };
}
