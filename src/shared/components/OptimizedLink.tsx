"use client";

import React, { useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface OptimizedLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean;
  priority?: "high" | "normal" | "low";
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  onPointerDown?: () => void;
  deferNavigation?: boolean;
}

/**
 * OptimizedLink - Smart link component with instant navigation
 *
 * Features:
 * - Prefetches on hover (instant navigation feel)
 * - Priority-based prefetching
 * - Preloads critical routes on mount
 * - Uses next/link for automatic optimization
 */
export function OptimizedLink({
  href,
  children,
  className = "",
  prefetch = true,
  priority = "normal",
  onClick,
  onPointerDown,
  deferNavigation = false,
}: OptimizedLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const linkRef = useRef<HTMLAnchorElement>(null);
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasPrefetched = useRef(false);

  // Immediate prefetch on hover for instant navigation
  const handleMouseEnter = useCallback(() => {
    if (!prefetch || hasPrefetched.current) return;
    if (href === pathname || href === "#") return;

    // High priority: prefetch immediately
    // Normal priority: prefetch after 50ms (to avoid unnecessary prefetches on quick hovers)
    // Low priority: prefetch after 100ms
    const delay = priority === "high" ? 0 : priority === "normal" ? 50 : 100;

    prefetchTimeoutRef.current = setTimeout(() => {
      if (!hasPrefetched.current) {
        router.prefetch(href);
        hasPrefetched.current = true;
      }
    }, delay);
  }, [href, pathname, prefetch, priority, router]);

  const handleMouseLeave = useCallback(() => {
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
      prefetchTimeoutRef.current = null;
    }
  }, []);

// Preload high priority routes on mount with iOS safe fallback
  useEffect(() => {
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (priority === "high" && prefetch && !hasPrefetched.current) {
      if (href === pathname || href === "#") return;
      
      // Safe prefetch with fallback for iOS Safari
      if (isIOS) {
        globalThis.setTimeout(() => router.prefetch(href), 100);
      } else {
        router.prefetch(href);
      }
      hasPrefetched.current = true;
    }
  }, [href, pathname, prefetch, priority, router]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
    };
  }, []);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);

      if (!deferNavigation || href === pathname || href === "#") return;
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      event.preventDefault();
      router.prefetch(href);
      window.requestAnimationFrame(() => {
        router.push(href);
      });
    },
    [deferNavigation, href, onClick, pathname, router]
  );

  const handlePointerDown = useCallback(
    () => {
      onPointerDown?.();
    },
    [onPointerDown]
  );

  return (
    <Link
      ref={linkRef}
      href={href}
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      prefetch={false} // We handle prefetching manually for better control
    >
      {children}
    </Link>
  );
}

/**
 * OptimizedNavLink - Navigation link with active state styling
 */
interface OptimizedNavLinkProps extends OptimizedLinkProps {
  isActive?: boolean;
  activeClassName?: string;
}

export function OptimizedNavLink({
  isActive,
  activeClassName = "active",
  className = "",
  ...props
}: OptimizedNavLinkProps) {
  const combinedClassName = `${className} ${isActive ? activeClassName : ""}`.trim();

  return (
    <OptimizedLink
      {...props}
      className={combinedClassName}
      priority={isActive ? "high" : "normal"}
    />
  );
}

/**
 * PrefetchProvider - Component that prefetches critical routes on mount
 */
const CRITICAL_ROUTES = ["/", "/vehicles", "/lms", "/settings"];

export function PrefetchProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hasPrefetched = useRef(false);

useEffect(() => {
    if (hasPrefetched.current) return;
    hasPrefetched.current = true;
    
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

    // Prefetch critical routes after initial render - iOS safe
    const prefetchCritical = () => {
      CRITICAL_ROUTES.forEach((route, index) => {
        // Stagger prefetches to avoid network congestion - longer delay for iOS
        setTimeout(() => {
          router.prefetch(route);
        }, index * (isIOS ? 150 : 100));
      });
    };

    // Use setTimeout for iOS to avoid potential issues with requestIdleCallback
    if (isIOS) {
      setTimeout(prefetchCritical, 500);
    } else if ("requestIdleCallback" in window) {
      try {
        window.requestIdleCallback(prefetchCritical, { timeout: 2000 });
      } catch {
        setTimeout(prefetchCritical, 1000);
      }
    } else {
      setTimeout(prefetchCritical, 1000);
    }
  }, [router]);

  return <>{children}</>;
}
