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
  onClick?: () => void;
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

  // Preload high priority routes on mount
  useEffect(() => {
    if (priority === "high" && prefetch && !hasPrefetched.current) {
      if (href === pathname || href === "#") return;
      router.prefetch(href);
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
    () => {
      onClick?.();
    },
    [onClick]
  );

  return (
    <Link
      ref={linkRef}
      href={href}
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
const CRITICAL_ROUTES = ["/", "/vehicles", "/settings"];

export function PrefetchProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hasPrefetched = useRef(false);

  useEffect(() => {
    if (hasPrefetched.current) return;
    hasPrefetched.current = true;

    // Prefetch critical routes after initial render
    const prefetchCritical = () => {
      CRITICAL_ROUTES.forEach((route, index) => {
        // Stagger prefetches to avoid network congestion
        setTimeout(() => {
          router.prefetch(route);
        }, index * 100);
      });
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(prefetchCritical, { timeout: 2000 });
    } else {
      setTimeout(prefetchCritical, 1000);
    }
  }, [router]);

  return <>{children}</>;
}
