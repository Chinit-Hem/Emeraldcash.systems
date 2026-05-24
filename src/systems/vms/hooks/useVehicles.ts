import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isApiError, isConfigError, isNetworkError, vehicleApi, type VehicleFilters } from "@/systems/vms/api/api";
import { isIOSSafariBrowser } from "@/shared/utils/platform";
import type { Vehicle, VehicleMeta } from "@/shared/types/types";
import { clearAllVehicleCache, getCacheAge, isCacheStale, onVehicleCacheUpdate, readVehicleCache, readVehicleMetaCache, writeVehicleCache } from "@/systems/vms/utils/vehicleCache";

// Retry configuration
const MAX_RETRIES = 3;

// Debounce delay for search queries (ms) - wait 500ms before fetching
const SEARCH_DEBOUNCE_MS = 500;
// Debounce delay for other filter changes (ms)
const FILTER_DEBOUNCE_MS = 150;

// Cache stale time - 10 minutes (600000ms)
const CACHE_STALE_TIME_MS = 10 * 60 * 1000;

interface UseVehiclesReturn {
  vehicles: Vehicle[];
  meta: VehicleMeta | null;
  loading: boolean;
  isFetching: boolean;
  error: string | null;
  refetch: (options?: { noCache?: boolean }) => Promise<void>;
  lastSyncTime: Date | null;
  isFiltering: boolean;
}


interface UseVehiclesOptions {
  /** Force fresh data fetch - only use true for manual refresh button */
  noCache?: boolean;
  filters?: VehicleFilters;
  /** Maximum number of vehicles to fetch (default: 100, use 0 or high number for all) */
  limit?: number;
  /** Auto-fetch on mount - default true */
  autoFetch?: boolean;
}

/**
 * Optimized useVehicles hook with proper caching and performance optimizations
 *
 * Key features:
 * - 10-minute stale time (tunable via CACHE_STALE_TIME_MS)
 * - noCache only used for manual refresh, not auto-fetch
 * - Memoized vehicle list to prevent unnecessary re-renders
 * - Stable callbacks to prevent useEffect re-runs
 *
 * Usage with Suspense (recommended for prefetch):
 * <Suspense fallback={<LoadingSkeleton />}>
 *   <VehiclesList />
 * </Suspense>
 */
export function useVehicles(options: UseVehiclesOptions = {}): UseVehiclesReturn {
  const {
    noCache: noCacheProp = false,
    filters,
    limit: customLimit,
    autoFetch = true
  } = options;

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [meta, setMeta] = useState<VehicleMeta | null>(null);
  const [loading, setLoading] = useState(autoFetch);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isFiltering, setIsFiltering] = useState(false);

  // Use ref to track retry attempts without triggering re-renders
  const retryCountRef = useRef(0);

  // Use ref for debounce timeout
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use ref for AbortController to cancel stale requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Use ref to track if we just updated the cache (to prevent infinite loops)
  const justUpdatedCacheRef = useRef(false);

  // Use ref to track if initial fetch has completed
  const hasInitialFetchRef = useRef(false);

  // Use ref to track the noCache option (stable reference)
  const noCacheRef = useRef(noCacheProp);

  // Update the ref when prop changes
  useEffect(() => {
    noCacheRef.current = noCacheProp;
  }, [noCacheProp]);

  // Memoized fetch function with stable dependencies
  const fetchVehicles = useCallback(async (fetchOptions?: {
    currentFilters?: VehicleFilters;
    forceNoCache?: boolean
  }) => {
    const { currentFilters, forceNoCache = false } = fetchOptions || {};

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    if (!hasInitialFetchRef.current) {
      setLoading(true);
    } else {
      setIsFetching(true);
    }
    setError(null);

    // Set filtering state if filters are active
    const hasActiveFilters = currentFilters && Object.keys(currentFilters).length > 0;
    setIsFiltering(!!hasActiveFilters);

    // Reset retry count on new fetch attempt
    retryCountRef.current = 0;

    const attemptFetch = async (): Promise<{ data: Vehicle[]; meta?: VehicleMeta | null }> => {
      try {
        // Only use noCache if explicitly forced (manual refresh) or prop is true
        // Do NOT auto-detect cache staleness here - that causes infinite loops
        const effectiveNoCache = forceNoCache || noCacheRef.current;

        const useLiteMode = isIOSSafariBrowser();
        // Use custom limit if provided, otherwise use default/lite mode limits
        const maxRows = customLimit || (useLiteMode ? 250 : undefined);

        // Check if request was aborted before making the API call
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Request cancelled');
        }

        const result = await vehicleApi.getVehicles(
          effectiveNoCache,
          {
            lite: useLiteMode,
            maxRows: maxRows,
            filters: currentFilters,
          }
        );

        // Validate that we actually got data
        if (!result.data || !Array.isArray(result.data)) {
          throw new Error("Invalid response: expected array of vehicles");
        }

        return result;

      } catch (err) {
        // Check if we should retry
        const isRetryable = isNetworkError(err) ||
          (err instanceof Error && err.name === 'AbortError') ||
          (isApiError(err) && err.status >= 500);

        const isLastAttempt = retryCountRef.current >= MAX_RETRIES;

        if (isRetryable && !isLastAttempt) {
          retryCountRef.current++;

          // No delay - immediate retry for maximum speed
          console.log(`[useVehicles] Retry ${retryCountRef.current}/${MAX_RETRIES}`);

          // Retry
          return attemptFetch();
        }

        // Not retryable or max retries reached - throw the error
        throw err;
      }
    };

    try {
      const result = await attemptFetch();

      setVehicles(result.data);
      // Ensure meta.total represents the FULL dataset count, not max ID
      setMeta(result.meta || null);
      setLastSyncTime(new Date());

      // Write to cache to update timestamp and prevent infinite stale loop
      // Set flag BEFORE writing cache to prevent listener from triggering refetch
      justUpdatedCacheRef.current = true;
      writeVehicleCache(result.data, result.meta || undefined);

      // Reset the flag after a short delay
      setTimeout(() => {
        justUpdatedCacheRef.current = false;
      }, 100);

      // Clear any previous error on success
      setError(null);

      // Reset retry count on success
      retryCountRef.current = 0;

      // Mark initial fetch as complete
      hasInitialFetchRef.current = true;

    } catch (err) {
      // Don't update state if request was cancelled
      if (err instanceof Error && err.message === 'Request cancelled') {
        return;
      }

      // Always set an error - never silently fail
      let errorMessage: string;

      // Use the actual error message for NetworkError/ConfigError to preserve details
      if (isNetworkError(err) || isConfigError(err)) {
        errorMessage = err.message;
      } else if (isApiError(err)) {
        errorMessage = err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        errorMessage = "Failed to fetch vehicles. Please check your connection and try again.";
      }

      // Add extra context for config errors
      if (isConfigError(err)) {
        errorMessage = `Configuration Error:\n\n${errorMessage}`;
      }

      // Add retry context for timeout errors
      if (isNetworkError(err) && retryCountRef.current > 0) {
        errorMessage = `${errorMessage}\n\n(Tried ${retryCountRef.current} times)`;
      }

      setError(errorMessage);

      // In development, log the full error details
      if (process.env.NODE_ENV === 'development') {
        console.error('[useVehicles] Error fetching vehicles after retries:', err);

        if (isApiError(err)) {
          console.error('[useVehicles] API Error:', {
            status: err.status,
            code: err.code,
            message: err.message
          });
        }
      }


      // Clear vehicles on error to prevent showing stale/incorrect data
      setVehicles([]);
      setMeta(null);

    } finally {
      setLoading(false); // Always set loading to false after any fetch attempt completes.
      setIsFetching(false);
      setIsFiltering(false);
    }
    // Only depend on customLimit - noCache is handled via ref
  }, [customLimit]);

  // Check cache on mount - only clear if truly expired (5+ minutes old)
  // This prevents the cache-invalidation-storm while ensuring data freshness
  useEffect(() => {
    if (typeof window === 'undefined') return;

    console.log('[useVehicles] Component mounted, checking cache...');
    const cacheAge = getCacheAge();
    if (cacheAge !== null) {
      console.log(`[useVehicles] Current cache age: ${cacheAge}ms`);

      // Only clear cache if it's truly expired (older than 5 minutes)
      // This prevents aggressive cache clearing on every mount
      if (cacheAge > CACHE_STALE_TIME_MS) {
        console.log(`[useVehicles] Cache is ${Math.round(cacheAge / 1000)}s old (expired), clearing...`);
        clearAllVehicleCache();
      } else {
        console.log(`[useVehicles] Cache is fresh (${Math.round(cacheAge / 1000)}s), keeping...`);
      }
    }
  }, []); // Empty dependency array - only run on mount

  // Use ref to track current vehicles for comparison without causing re-renders
  const vehiclesRef = useRef(vehicles);
  vehiclesRef.current = vehicles;

  // Use ref to track current filters for the callback functions
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Initial fetch on mount only - filters are accessed via ref
  useEffect(() => {
    if (!autoFetch) return;

    // Clear any existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Determine debounce delay based on filter type
    // Search queries get longer debounce (500ms) to avoid excessive API calls while typing
    // Other filter changes get shorter debounce (150ms) for responsiveness
    const currentFilters = filtersRef.current;
    const hasSearchQuery = currentFilters?.search && currentFilters.search.trim().length > 0;
    const debounceMs = hasSearchQuery ? SEARCH_DEBOUNCE_MS : FILTER_DEBOUNCE_MS;

    debounceTimeoutRef.current = setTimeout(() => {
      fetchVehicles({ currentFilters: filtersRef.current });
    }, debounceMs);

    // Cleanup timeout and abort controller on unmount or filter change
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }; // End of cleanup
  }, [autoFetch, fetchVehicles, filters]); // Depend on filters to re-trigger fetch when filters change

  // Listen for cache updates from other components (e.g., after adding a vehicle)
  // This effect runs ONCE on mount and stays active - no dependency changes
  useEffect(() => {
    const unsubscribe = onVehicleCacheUpdate((updatedVehicles) => {
      // Skip refetch if we just updated the cache ourselves (prevents infinite loop)
      if (justUpdatedCacheRef.current) {
        console.log('[useVehicles] Skipping cache update - we just updated it');
        return;
      }

      // Use ref to get current vehicles without causing dependency changes
      const currentVehicles = vehiclesRef.current;

      // Only update if the data is actually different
      const currentIds = new Set(currentVehicles.map(v => v.VehicleId));
      const updatedIds = new Set(updatedVehicles.map(v => v.VehicleId));

      const hasChanges = updatedVehicles.length !== currentVehicles.length ||
        updatedVehicles.some(v => !currentIds.has(v.VehicleId)) ||
        currentVehicles.some(v => !updatedIds.has(v.VehicleId));
      // This is a loop.
      if (!hasChanges) {
        console.log('[useVehicles] Cache updated but data unchanged, skipping refetch');
        return;
      }

      console.log('[useVehicles] Cache updated by another component, refetching...');
      // Refetch when cache is updated by another component
      // Use ref to get current filters
      fetchVehicles({ currentFilters: filtersRef.current });
    });

    return unsubscribe;
    // EMPTY DEPENDENCY ARRAY - this effect runs once on mount and stays active
    // Using refs to access current values without causing re-renders
  }, [fetchVehicles]);

  // Memoized vehicles list to prevent unnecessary re-renders
  const memoizedVehicles = useMemo(() => vehicles, [vehicles]);

  // Memoized meta to prevent unnecessary re-renders
  const memoizedMeta = useMemo(() => meta, [meta]);

  // Stable refetch function that can be called with options
  const refetch = useCallback(async (options?: { noCache?: boolean }) => {
    const forceNoCache = options?.noCache ?? true; // Default to true for manual refresh
    await fetchVehicles({ currentFilters: filters, forceNoCache });
  }, [fetchVehicles, filters]);

  return {
    vehicles: memoizedVehicles,
    meta: memoizedMeta,
    loading,
    isFetching,
    error,
    refetch,
    lastSyncTime,
    isFiltering,
  };

}

/**
 * Hook to check if vehicle cache is stale (for external use)
 */
export function useVehicleCacheStatus(): { isStale: boolean; age: number | null } {
  const [status, setStatus] = useState({ isStale: false, age: null as number | null });

  useEffect(() => {
    const checkStatus = () => {
      setStatus({
        isStale: isCacheStale(),
        age: getCacheAge()
      });
    };

    checkStatus();

    // Check every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return status;
}

/**
 * Hook to read vehicles from cache without fetching (for instant navigation)
 */
export function useCachedVehicles(): { vehicles: Vehicle[] | null; meta: VehicleMeta | null } {
  const [cached, setCached] = useState<{ vehicles: Vehicle[] | null; meta: VehicleMeta | null }>({
    vehicles: null,
    meta: null
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const vehicles = readVehicleCache();
    const meta = readVehicleMetaCache();
    setCached({ vehicles, meta });

    // Listen for cache updates
    const unsubscribe = onVehicleCacheUpdate((newVehicles) => {
      const newMeta = readVehicleMetaCache();
      setCached({ vehicles: newVehicles, meta: newMeta });
    });

    return unsubscribe;
  }, []);

  return cached;
}
