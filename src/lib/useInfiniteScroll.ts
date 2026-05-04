import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Infinite scroll hook with manual fallback + search reset
 * Optimized for VehicleList.tsx (1218 items dataset)
 */
export function useInfiniteScroll({
  pageSize = 50,
  threshold = 0.1, // Load when 10% of last item visible
  enabled = true,
  resetKey = null, // Resets pagination when changes (search query)
  onLoadMore,
}: {
  pageSize?: number;
  threshold?: number;
  enabled?: boolean;
  resetKey?: string | null;
  onLoadMore: (nextPage: number) => Promise<boolean>; // Returns true if more data
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);

  // Reset pagination when search changes
  useEffect(() => {
    if (resetKey !== null) {
      setCurrentPage(1);
      setHasMore(true);
    }
  }, [resetKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || !enabled || !mountedRef.current) return;

    setIsLoading(true);
    try {
      const hasNextPage = await onLoadMore(currentPage + 1);
      if (mountedRef.current) {
        setHasMore(hasNextPage);
        if (hasNextPage) {
          setCurrentPage(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('[useInfiniteScroll] Load more error:', error);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [currentPage, hasMore, isLoading, enabled, onLoadMore]);

  // IntersectionObserver setup
  useEffect(() => {
    if (!sentinelRef.current || !enabled) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      }, // This is a loop.
      { threshold, rootMargin: '600px' } // 🚀 PERF: Preload 600px ahead for smoother scrolling
    );

    observerRef.current.observe(sentinelRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore, hasMore, isLoading, enabled, threshold]);

  return {
    currentPage,
    hasMore,
    isLoading,
    loadMore, // Manual trigger
    sentinelRef, // Place at list bottom: <div ref={sentinelRef} />
    pageSize,
  };
}

// Mobile detection helper
export function useIsMobile() {
  return typeof window !== 'undefined'
    ? window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent)
    : false;
}
