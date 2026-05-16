/**
 * useVehiclesNeon - Simplified SWR-based data fetching
 *
 * Neon-style serverless data flow:
 * - No complex localStorage caching
 * - SWR for automatic revalidation
 * - Optimistic updates
 * - Simple, clean API
 * - Mutation detection for cache invalidation
 *
 * @module useVehiclesNeon
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR, { mutate } from "swr";
import type { Vehicle, VehicleMeta } from "./types";
import {
  getCacheStatus,
  onVehicleCacheUpdate
} from "./vehicleCache";

// ============================================================================
// Types
// ============================================================================

interface VehiclesResponse {
  success: boolean;
  data: Vehicle[];
  meta: {
    total: number;
    returned: number;
    limit: number;
    cursor?: string;
    nextCursor?: string;
    hasMore: boolean;
    durationMs: number;
    requestId: string;
    countsByCategory?: VehicleMeta["countsByCategory"];
    countsByCondition?: VehicleMeta["countsByCondition"];
  };
}

interface UseVehiclesOptions {
  /** Cursor for pagination */
  cursor?: string;
  /** Number of items to fetch */
  limit?: number;
  /** Category filter */
  category?: string;
  /** Brand filter */
  brand?: string;
  /** Search term */
  search?: string;
  /** Auto-refresh interval in ms (default: 30000) */
  refreshInterval?: number;
}

interface UseVehiclesReturn {
  vehicles: Vehicle[];
  meta: VehicleMeta | null;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  nextCursor?: string;
  loadMore: () => void;
  refresh: () => Promise<void>;
  isValidating: boolean;
}

// ============================================================================
// Fetcher
// ============================================================================

/**
 * SWR fetcher for vehicles API
 */
async function fetcher(url: string): Promise<VehiclesResponse> {
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "API returned unsuccessful response");
  }

  return data;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Simplified vehicles hook using SWR
 *
 * Features:
 * - Automatic caching and revalidation
 * - Optimistic updates
 * - Pagination support
 * - Error retry
 * - Real-time updates
 */
export function useVehiclesNeon(options: UseVehiclesOptions = {}): UseVehiclesReturn {
  const {
    cursor,
limit = 500, // Increased for dashboard pagination fix (total 1218 vehicles)
    category,
    brand,
    search,
    refreshInterval = 0,
  } = options;

  // Build query string
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    // Always set the limit if provided, let the API handle defaults/max
    if (limit) params.set("limit", String(limit));

    if (category && category !== "All") params.set("category", category);
    if (brand && brand !== "All") params.set("brand", brand);
    if (search) params.set("search", search);
    return params.toString();
  }, [cursor, limit, category, brand, search]);

  // SWR key
  const key = `/api/vehicles/edge?${queryString}`;

  // Track if we should force refresh due to mutation
  const [, setForceRefreshKey] = useState(0);
  const lastMutationTimeRef = useRef<number | null>(null);

  // Check for mutations on mount and periodically
  useEffect(() => {
    // Check initial cache status
    const checkMutation = () => {
      const status = getCacheStatus();
      if (status.lastMutation && status.lastMutation !== lastMutationTimeRef.current) {
        console.log("[useVehiclesNeon] Mutation detected, forcing refresh");
        lastMutationTimeRef.current = status.lastMutation;
        setForceRefreshKey(prev => prev + 1);
      }
    };

    // Check immediately
    checkMutation();

    // Check occasionally as a fallback; direct cache update events handle the
    // common case immediately without a tight background polling loop.
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      checkMutation();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Listen for cache update events from other components
  useEffect(() => {
    const unsubscribe = onVehicleCacheUpdate(() => {
      // Any cache update/invalidation should trigger immediate revalidation.
      console.log("[useVehiclesNeon] Cache update detected, forcing refresh");
      setForceRefreshKey(prev => prev + 1);
    });
    return unsubscribe;
  }, []);

  // Use SWR for data fetching
  const { data, error, isLoading, isValidating, mutate: revalidate } = useSWR(
    key,
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // Standard deduping
      errorRetryCount: 3,
      revalidateIfStale: true,
    }
  );

  // Transform response to legacy format
  const vehicles = useMemo(() => {
    if (!data?.data) return [];
    return data.data;
  }, [data]);

  // Build meta object
  const meta = useMemo((): VehicleMeta | null => {
    if (!data?.meta) return null;

    return {
      ...data.meta,
      // Ensure countsByCategory and countsByCondition are always present, even if empty
      countsByCategory: data.meta.countsByCategory || {},
      countsByCondition: data.meta.countsByCondition || {},
    };
  }, [data]);

  // Load more function
  const loadMore = useCallback(() => {
    if (data?.meta?.hasMore && data?.meta?.nextCursor) {
      // This would be used with a cursor-based pagination UI
      // For now, just trigger a refresh
      revalidate();
    }
  }, [data, revalidate]);

  // Manual refresh
  const refresh = useCallback(async () => {
    await revalidate();
  }, [revalidate]);

  return {
    vehicles,
    meta,
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : String(error)) : null,
    hasMore: data?.meta?.hasMore ?? false,
    nextCursor: data?.meta?.nextCursor,
    loadMore,
    refresh,
    isValidating,
  };
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new vehicle with optimistic update
 */
export async function createVehicleOptimistic(
  vehicleData: Partial<Vehicle>,
  onSuccess?: (vehicle: Vehicle) => void
): Promise<void> {
  // Optimistically update the cache
  const tempId = `temp-${Date.now()}`;
  const optimisticVehicle: Vehicle = {
    VehicleId: tempId,
    Category: vehicleData.Category || "Other",
    Brand: vehicleData.Brand || "",
    Model: vehicleData.Model || "",
    Year: vehicleData.Year || null,
    Plate: vehicleData.Plate || "",
    PriceNew: vehicleData.PriceNew || 0,
    Price40: vehicleData.Price40 || 0,
    Price70: vehicleData.Price70 || 0,
    TaxType: vehicleData.TaxType || "",
    Condition: vehicleData.Condition || "",
    BodyType: vehicleData.BodyType || "",
    Color: vehicleData.Color || "",
    Image: vehicleData.Image || "",
    Time: new Date().toISOString(),
  };

  // Mutate all vehicle list caches optimistically
  mutate(
    (key) => typeof key === "string" && key.startsWith("/api/vehicles"),
    (current: VehiclesResponse | undefined) => {
      if (!current) return current;
      return {
        ...current,
        data: [optimisticVehicle, ...current.data],
        meta: {
          ...current.meta,
          total: current.meta.total + 1,
          returned: current.meta.returned + 1,
        },
      };
    },
    { revalidate: false }
  );

  try {
    // Make the actual API call
    const response = await fetch("/api/vehicles", { // Corrected endpoint
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vehicleData),
    });

    if (!response.ok) {
      throw new Error("Failed to create vehicle");
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to create vehicle");
    }

    // Replace optimistic vehicle with real one
    mutate(
      (key) => typeof key === "string" && key.startsWith("/api/vehicles"),
      (current: VehiclesResponse | undefined) => {
        if (!current) return current;
        return {
          ...current,
          data: current.data.map((v) =>
            v.VehicleId === tempId ? result.data : v
          ),
        };
      },
      { revalidate: false }
    );

    onSuccess?.(result.data);
  } catch (error) {
    // Rollback optimistic update
    mutate(
      (key) => typeof key === "string" && key.startsWith("/api/vehicles"),
      (current: VehiclesResponse | undefined) => {
        if (!current) return current;
        return {
          ...current,
          data: current.data.filter((v) => v.VehicleId !== tempId),
          meta: {
            ...current.meta,
            total: current.meta.total - 1,
            returned: current.meta.returned - 1,
          },
        };
      },
      { revalidate: true }
    );

    throw error;
  }
}

// ============================================================================
// Stats Hook
// ============================================================================

interface VehicleStats {
  total: number;
  byCategory: {
    Cars: number;
    Motorcycles: number;
    TukTuks: number;
  };
  byCondition: {
    New: number;
    Used: number;
  };
  noImageCount: number;
  avgPrice: number;
}

/**
 * Stats response type
 */
interface StatsResponse {
  success: boolean;
  data: VehicleStats;
  meta: {
    durationMs: number;
    requestId: string;
  };
}

/**
 * Fetcher for stats endpoint
 */
async function statsFetcher(url: string): Promise<StatsResponse> {
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "API returned unsuccessful response");
  }

  return data;
}

/**
 * Hook to fetch vehicle statistics
 */
export function useVehicleStats(refreshInterval = 120000): {
  stats: VehicleStats | undefined;
  loading: boolean;
  error: string | null;
} {
  const { data, error, isLoading, mutate: revalidate } = useSWR<StatsResponse>(
    "/api/vehicles/stats",
    statsFetcher,
    {
      refreshInterval,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000,
    }
  );

  // Revalidate stats immediately when vehicle cache is invalidated by mutations.
  useEffect(() => {
    const unsubscribe = onVehicleCacheUpdate(() => {
      void revalidate();
    });
    return unsubscribe;
  }, [revalidate]);

  return {
    stats: data?.data,
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : String(error)) : null,
  };
}

export default useVehiclesNeon;
