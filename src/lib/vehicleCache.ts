import type { Vehicle, VehicleMeta } from "@/lib/types";

const CACHE_KEY = "vms-vehicles";
// Renamed to avoid conflict with `_cache.ts`'s `meta` property in CacheEntry
const META_KEY = "vms-vehicles-meta";
const CACHE_VERSION_KEY = "vms-vehicles-version";
const CACHE_TIMESTAMP_KEY = "vms-vehicles-timestamp";
const LAST_MUTATION_KEY = "vms-vehicles-last-mutation";
const CURRENT_CACHE_VERSION = "5"; // Increment when cache format changes
const UPDATE_EVENT = "vms-vehicles-updated";
const CACHE_STALE_MS = 5 * 60 * 1000; // 5 minutes stale time - prevents cache-invalidation-storm
const MAX_CACHE_AGE_MS = 10 * 60 * 1000; // 10 minutes max cache age - allows longer cache lifetime

export function readVehicleCache(): Vehicle[] | null {
  if (typeof window === "undefined") return null;
  try {
    // Check cache version first
    const cacheVersion = localStorage.getItem(CACHE_VERSION_KEY);
    if (cacheVersion !== CURRENT_CACHE_VERSION) {
      // Clear old cache
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(META_KEY);
      localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
      // Cache logging removed for production
      return null;
    }

    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return Array.isArray(parsed) ? (parsed as Vehicle[]) : null;
  } catch {
    return null;
  }
}

export function readVehicleMetaCache(): VehicleMeta | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(META_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return parsed as VehicleMeta;
  } catch {
    return null;
  }
}

export function writeVehicleCache(vehicles: Vehicle[], meta?: VehicleMeta) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(vehicles));
    if (meta) {
      localStorage.setItem(META_KEY, JSON.stringify(meta));
    }
    localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
  } catch {
    // ignore cache write errors
  }
  try {
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: vehicles }));
  } catch {
    // ignore event errors
  }
}

export function onVehicleCacheUpdate(handler: (vehicles: Vehicle[]) => void) {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<Vehicle[]>;
    if (Array.isArray(customEvent.detail)) {
      handler(customEvent.detail);
    }
  };
  window.addEventListener(UPDATE_EVENT, listener as EventListener);
  return () => window.removeEventListener(UPDATE_EVENT, listener as EventListener);
}

export async function refreshVehicleCache(): Promise<Vehicle[] | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/vehicles?noCache=1", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    if (!data?.ok || !Array.isArray(data?.data)) return null;
    const vehicles = data.data as Vehicle[];
    const meta = data.meta as VehicleMeta | undefined;
    writeVehicleCache(vehicles, meta);
    // Update cache timestamp
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    return vehicles;
  } catch {
    return null;
  }
}

/**
 * Get the timestamp of the last mutation (create, update, delete)
 */
export function getLastMutationTime(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(LAST_MUTATION_KEY);
    if (!stored) return null;
    const parsed = parseInt(stored, 10);
    return isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

/**
 * Record a mutation to invalidate cache
 */
export function recordMutation(): void {
  if (typeof window === "undefined") return;
  try {
    const now = Date.now();
    localStorage.setItem(LAST_MUTATION_KEY, now.toString());
    // Mutation logging removed for production
  } catch {
    // ignore errors
  }
}

/**
 * Get the timestamp of when cache was last updated
 */
export function getCacheTimestamp(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!stored) return null;
    const parsed = parseInt(stored, 10);
    return isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

/**
 * Check if the cache is stale based on:
 * 1. Time since last cache update
 * 2. Whether a mutation occurred after the cache was written
 */
export function isCacheStale(): boolean {
  if (typeof window === "undefined") return true;

  const cacheTime = getCacheTimestamp();
  const mutationTime = getLastMutationTime();

  // If no cache timestamp, it's stale
  if (!cacheTime) return true;

  // If mutation occurred after cache was written, it's stale
  if (mutationTime && mutationTime > cacheTime) {
    // Cache logging removed for production
    return true;
  }

  // Check if cache is older than stale threshold
  const age = Date.now() - cacheTime;
  if (age > CACHE_STALE_MS) {
    // Cache logging removed for production
    return true;
  }

  return false;
}

/**
 * Determine if cache should be used based on staleness and noCache flag
 * @param noCache - If true, always fetch fresh data
 * @returns true if cache is usable, false if fresh data should be fetched
 */
export function shouldUseCache(noCache = false): boolean {
  // If explicitly requesting no cache, don't use it
  if (noCache) return false;

  // If cache is stale, don't use it
  if (isCacheStale()) return false;

  // Otherwise, cache is usable
  return true;
}

/**
 * Clear all vehicle cache data including mutation tracking
 */
export function clearAllVehicleCache(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(META_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    localStorage.removeItem(LAST_MUTATION_KEY);
    // Cache logging removed for production
  } catch {
    // ignore errors
  }
}

/**
 * Get the age of the cache in milliseconds
 * @returns Cache age in ms, or null if no cache exists
 */
export function getCacheAge(): number | null {
  if (typeof window === "undefined") return null;
  const cacheTime = getCacheTimestamp();
  if (!cacheTime) return null;
  return Date.now() - cacheTime;
}

/**
 * Check if cache is extremely old (over 5 minutes)
 * This helps detect the "482643290 ms" type issues
 */
export function isCacheExtremelyStale(): boolean {
  const age = getCacheAge();
  if (age === null) return true;
  return age > MAX_CACHE_AGE_MS;
}

/**
 * Clear cache on mount - should be called when app initializes
 * This prevents showing stale data from previous sessions
 *
 * NOTE: This function is now less aggressive to prevent cache-invalidation-storm.
 * Cache is only cleared if it's truly expired (10+ minutes old) or if a mutation occurred.
 */
export function clearCacheOnMount(): void {
  if (typeof window === "undefined") return;

  const cacheAge = getCacheAge();

  // Cache logging removed for production

  // Only clear if cache is truly expired (10+ minutes) - prevents cache-invalidation-storm
  if (cacheAge !== null && cacheAge > MAX_CACHE_AGE_MS) {
    clearAllVehicleCache();
    return;
  }

  // Only clear if cache is stale due to mutation or version mismatch
  // Don't clear just because cache is "stale" by time - that causes the storm
  const mutationTime = getLastMutationTime();
  const cacheTime = getCacheTimestamp();
  if (mutationTime && cacheTime && mutationTime > cacheTime) {
    clearAllVehicleCache();
  }
}

/**
 * Invalidate all cache layers - call this after any mutation (create, update, delete)
 * This ensures data consistency across all components
 */
export function invalidateAllCaches(): void {
  if (typeof window === "undefined") return;

  try {
    // 1. Clear all vehicle cache data
    clearAllVehicleCache();

    // 2. Record mutation timestamp (for other tabs/components)
    recordMutation();

    // 3. Dispatch cache update event to notify all listeners.
    // Use an empty array payload so existing array-based listeners still fire.
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: [] }));

    // 4. Clear any SWR cache keys (if using SWR)
    try {
      const swrCachePrefix = "swr-";
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith(swrCachePrefix) || key.includes("vehicles"))) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // Ignore SWR cache clearing errors
    }

    // Cache logging removed for production
  } catch (error) {
    // Error logging removed for production
    void error; // Mark error as used to prevent unused variable warning
  }
}

/**
 * Get cache status for debugging/monitoring
 */
export function getCacheStatus(): {
  hasCache: boolean;
  cacheAge: number | null;
  isStale: boolean;
  lastMutation: number | null;
  version: string | null;
} {
  if (typeof window === "undefined") {
    return {
      hasCache: false,
      cacheAge: null,
      isStale: true,
      lastMutation: null,
      version: null,
    };
  }

  const cacheAge = getCacheAge();
  const lastMutation = getLastMutationTime();
  const cacheTime = getCacheTimestamp();
  const version = localStorage.getItem(CACHE_VERSION_KEY);

  // Check if stale due to mutation
  const isStaleByMutation = lastMutation && cacheTime && lastMutation > cacheTime;
  const isStaleByAge = cacheAge === null || cacheAge > CACHE_STALE_MS;

  return {
    hasCache: localStorage.getItem(CACHE_KEY) !== null,
    cacheAge,
    isStale: isStaleByMutation || isStaleByAge,
    lastMutation,
    version,
  };
}
