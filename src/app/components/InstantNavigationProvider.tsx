"use client";

import React, { createContext, useContext, useCallback, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

interface InstantNavigationContextType {
  prefetchRoute: (href: string, priority?: "high" | "normal" | "low") => void;
  navigateInstant: (href: string) => void;
  isPrefetching: boolean;
  prefetchQueue: string[];
}

const InstantNavigationContext = createContext<InstantNavigationContextType | null>(null);

// Priority-based prefetch queue
type PrefetchTask = {
  href: string;
  priority: number;
  timestamp: number;
};

const priorityWeights = {
  high: 1,
  normal: 2,
  low: 3,
} as const;

/**
 * InstantNavigationProvider - Advanced route prefetching for 0s navigation
 *
 * Features:
 * - Priority-based prefetch queue (high/normal/low)
 * - Viewport-aware prefetching (prefetches visible links first)
 * - Instant navigation with preloaded data
 * - Smart cache management
 * - Intersection Observer for automatic prefetching
 */
export function InstantNavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const prefetchQueueRef = useRef<PrefetchTask[]>([]);
  const prefetchedRoutes = useRef<Set<string>>(new Set());
  const isProcessing = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Process prefetch queue
  const processQueue = useCallback(() => {
    if (isProcessing.current || prefetchQueueRef.current.length === 0) return;

    isProcessing.current = true;

    // Sort by priority and timestamp
    const sorted = [...prefetchQueueRef.current].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.timestamp - b.timestamp;
    });

    // Process in batches to avoid blocking
    const batch = sorted.slice(0, 3);

    batch.forEach(task => {
      if (!prefetchedRoutes.current.has(task.href)) {
        router.prefetch(task.href);
        prefetchedRoutes.current.add(task.href);
      }
    });

    // Remove processed items
    prefetchQueueRef.current = sorted.slice(3);

    // Schedule next batch
    if (prefetchQueueRef.current.length > 0) {
      setTimeout(() => {
        isProcessing.current = false;
        processQueue();
      }, 100);
    } else {
      isProcessing.current = false;
    }
  }, [router]);

  // Prefetch a route with priority
  const prefetchRoute = useCallback((href: string, priority: "high" | "normal" | "low" = "normal") => {
    // Don't prefetch current page
    if (href === pathname) return;

    // Don't prefetch if already done
    if (prefetchedRoutes.current.has(href)) return;

    // Don't add duplicates
    if (prefetchQueueRef.current.some(t => t.href === href)) return;

    const task: PrefetchTask = {
      href,
      priority: priorityWeights[priority],
      timestamp: Date.now(),
    };

    prefetchQueueRef.current.push(task);

    // Use requestIdleCallback for non-critical prefetching
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      window.requestIdleCallback(() => processQueue(), { timeout: 2000 });
    } else {
      setTimeout(processQueue, 50);
    }
  }, [pathname, processQueue]);

  // Instant navigation with guaranteed prefetch
  const navigateInstant = useCallback((href: string) => {
    // Ensure prefetch happens immediately
    if (!prefetchedRoutes.current.has(href)) {
      router.prefetch(href);
      prefetchedRoutes.current.add(href);
    }

    // Small delay to ensure prefetch completes
    requestAnimationFrame(() => {
      router.push(href);
    });
  }, [router]);

  // Setup lightweight Intersection Observer for automatic prefetching.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const observedLinks = new Set<Element>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const link = entry.target as HTMLAnchorElement;
            const href = link.getAttribute("href");
            if (href && href.startsWith("/") && !href.startsWith("//")) {
              prefetchRoute(href, "normal");
            }
          }
        });
      },
      {
        rootMargin: "50px",
        threshold: 0,
      }
    );

    const observeLinks = () => {
      const links = document.querySelectorAll('a[href^="/"]:not([href^="//"])');
      links.forEach(link => {
        if (observedLinks.has(link)) return;
        observedLinks.add(link);
        observerRef.current?.observe(link);
      });
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(observeLinks, { timeout: 1500 });
    } else {
      setTimeout(observeLinks, 500);
    }

    return () => {
      observerRef.current?.disconnect();
      observedLinks.clear();
    };
  }, [pathname, prefetchRoute]);

  return (
    <InstantNavigationContext.Provider
      value={{
        prefetchRoute,
        navigateInstant,
        isPrefetching: isProcessing.current,
        prefetchQueue: prefetchQueueRef.current.map((task) => task.href),
      }}
    >
      {children}
    </InstantNavigationContext.Provider>
  );
}

/**
 * Hook to use instant navigation
 */
export function useInstantNavigation() {
  const context = useContext(InstantNavigationContext);

  if (!context) {
    // Return default implementation if not in provider
    return {
      prefetchRoute: () => {},
      navigateInstant: (href: string) => {
        if (typeof window !== "undefined") {
          window.location.href = href;
        }
      },
      isPrefetching: false,
    };
  }

  return context;
}

/**
 * Link component with instant navigation
 */
interface InstantLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  prefetch?: boolean;
}

export function InstantLink({
  href,
  children,
  prefetch = true,
  onMouseEnter,
  onClick,
  ...props
}: InstantLinkProps) {
  const { prefetchRoute, navigateInstant } = useInstantNavigation();

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (prefetch) {
      prefetchRoute(href);
    }
    onMouseEnter?.(e);
  }, [href, prefetch, prefetchRoute, onMouseEnter]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigateInstant(href);
    onClick?.(e);
  }, [href, navigateInstant, onClick]);

  return (
    <a
      href={href}
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      {...props}
    >
      {children}
    </a>
  );
}

export default InstantNavigationProvider;
