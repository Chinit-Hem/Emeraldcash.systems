/**
 * Parallel Data Fetching Utilities
 * 
 * Provides utilities for fetching multiple data sources concurrently
 * to minimize total loading time.
 */

interface FetchConfig<T> {
  key: string;
  fetcher: () => Promise<T>;
  priority?: "high" | "normal" | "low";
}

interface FetchResult<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

type FetchResults<T extends Record<string, unknown>> = {
  [K in keyof T]: FetchResult<T[K]>;
};

/**
 * Fetch multiple data sources in parallel with priority handling
 */
export async function parallelFetch<T extends Record<string, unknown>>(
  configs: { [K in keyof T]: FetchConfig<T[K]> }
): Promise<FetchResults<T>> {
  const entries = Object.entries(configs) as [keyof T, FetchConfig<T[keyof T]>][];

  // Sort by priority: high first, then normal, then low
  const sortedEntries = entries.sort((a, b) => {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    return priorityOrder[a[1].priority || "normal"] - priorityOrder[b[1].priority || "normal"];
  });

  // Create fetch promises
  const promises = sortedEntries.map(async ([key, config]) => {
    try {
      const data = await config.fetcher();
      return {
        key,
        result: { data, error: null, loading: false } as FetchResult<T[keyof T]>,
      };
    } catch (error) {
      return {
        key,
        result: {
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
          loading: false,
        } as FetchResult<T[keyof T]>,
      };
    }
  });

  // Execute all fetches in parallel
  const results = await Promise.all(promises);

  // Reconstruct the result object
  const fetchResults = {} as FetchResults<T>;
  results.forEach(({ key, result }) => {
    fetchResults[key] = result as FetchResults<T>[keyof T];
  });

  return fetchResults;
}

/**
 * Streaming fetch with progressive loading
 * Returns data as it becomes available
 */
export async function* streamingFetch<T extends Record<string, unknown>>(
  configs: { [K in keyof T]: FetchConfig<T[K]> }
): AsyncGenerator<{ key: keyof T; result: FetchResult<T[keyof T]> }, void, unknown> {
  const entries = Object.entries(configs) as [keyof T, FetchConfig<T[keyof T]>][];

  // Create a map of promises
  const promises = new Map(
    entries.map(([key, config]) => [
      key,
      config.fetcher().then(
        (data) => ({ key, result: { data, error: null, loading: false } }),
        (error) => ({
          key,
          result: {
            data: null,
            error: error instanceof Error ? error : new Error(String(error)),
            loading: false,
          },
        })
      ),
    ])
  );

  // Yield results as they complete
  while (promises.size > 0) {
    const raceResult = await Promise.race(promises.values());
    promises.delete(raceResult.key);
    yield raceResult as { key: keyof T; result: FetchResult<T[keyof T]> };
  }
}

/**
 * Create a cached fetcher with stale-while-revalidate strategy
 */
export function createCachedFetcher<T>(
  fetcher: () => Promise<T>,
  options: {
    cacheKey: string;
    ttl?: number; // Time to live in milliseconds
    staleWhileRevalidate?: boolean;
  }
) {
  const { cacheKey, ttl = 60000, staleWhileRevalidate = true } = options;

  return async (): Promise<T> => {
    // Check for cached data in memory
    const cached = getCacheItem<T>(cacheKey);
    
    if (cached) {
      const isStale = Date.now() - cached.timestamp > ttl;
      
      if (!isStale) {
        return cached.data;
      }
      
      // Return stale data while revalidating in background
      if (staleWhileRevalidate) {
        // Trigger background revalidation
        fetcher()
          .then((freshData) => {
            memoryCache.set(cacheKey, { data: freshData, timestamp: Date.now() });
          })
          .catch(() => {
            // Silently fail background revalidation
          });
        
        return cached.data;
      }
    }

    // Fetch fresh data
    const data = await fetcher();
    memoryCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  };
}

// Simple in-memory cache with typed getter
const memoryCache = new Map<string, { data: unknown; timestamp: number }>();

function getCacheItem<T>(key: string): { data: T; timestamp: number } | undefined {
  const cached = memoryCache.get(key);
  if (!cached) return undefined;
  return cached as { data: T; timestamp: number };
}

/**
 * Preload data for a route
 * Call this when hovering over a link or when a route is likely to be visited
 */
export function preloadData<T>(fetcher: () => Promise<T>): Promise<T> {
  return fetcher();
}

/**
 * Create a resource for Suspense integration
 */
export function createResource<T>(promise: Promise<T>) {
  let status: "pending" | "success" | "error" = "pending";
  let result: T;
  let error: Error;

  const suspender = promise.then(
    (data) => {
      status = "success";
      result = data;
    },
    (e) => {
      status = "error";
      error = e instanceof Error ? e : new Error(String(e));
    }
  );

  return {
    read(): T {
      switch (status) {
        case "pending":
          throw suspender;
        case "error":
          throw error;
        case "success":
          return result;
      }
    },
  };
}
