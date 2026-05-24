import type { Vehicle } from "@/shared/types/types";
import type { VehicleFilters } from "@/systems/vms/services/VehicleService";

interface CacheEntry {
  ts: number;
  data: Vehicle[];
  meta?: unknown;
  filters?: string; // JSON stringified filters for debugging
}

const MAX_CACHE_SIZE = 20; // Increased capacity
const DEFAULT_TTL_MS = 300000; // 5 minutes default

class VehiclesLRUCache {
  private cache = new Map<string, CacheEntry>();
  private stats = { hits: 0, misses: 0, evictions: 0, size: 0 };

  set(key: string, data: Vehicle[], meta?: unknown, filters?: VehicleFilters): void {
    // Evict LRU if full
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        this.stats.evictions++;
      }
    }

    const entry: CacheEntry = {
      ts: Date.now(),
      data,
      meta,
      filters: filters ? JSON.stringify(filters) : undefined
    };

    this.cache.set(key, entry);
    this.stats.size = this.cache.size;
  }

  get(key: string): { data: Vehicle[], meta?: unknown } | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const ttlMs = Number(process.env.VEHICLES_CACHE_TTL_MS) || DEFAULT_TTL_MS;
    if (Date.now() - entry.ts >= ttlMs) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Move to end (LRU update)
    const { data, meta } = entry;
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.stats.hits++;
    return { data, meta }; // Return meta
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0, size: 0 };
  }

  invalidate(key: string): void {
    this.cache.delete(key);
    this.stats.misses++;
    console.log(`[LRU Cache] Invalidated key: ${key}`);
  }

  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  getSize(): number {
    return this.cache.size;
  }
}

export const vehiclesCache = new VehiclesLRUCache();

// Legacy API compatibility
export function getCachedVehicles(filters?: VehicleFilters): { data: Vehicle[], meta?: unknown } | null {
  const key = filters ? `vehicles:${JSON.stringify(filters)}` : 'vehicles:all';
  return vehiclesCache.get(key);
}

export function setCachedVehicles(data: Vehicle[], meta?: unknown, filters?: VehicleFilters): void {
  const key = filters ? `vehicles:${JSON.stringify(filters)}` : 'vehicles:all';
  vehiclesCache.set(key, data, meta, filters);
}

export function clearCachedVehicles(): void {
  vehiclesCache.clear();
}

// Stats export for monitoring
export function getCacheStats() {
  return vehiclesCache.getStats();
}

export function getCacheSize() {
  return vehiclesCache.getSize();
}
