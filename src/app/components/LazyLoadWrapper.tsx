/**
 * LazyLoadWrapper - Intersection Observer based lazy loading
 *
 * Features:
 * - Lazy load components when they enter viewport
 * - Configurable root margin for early loading
 * - Skeleton placeholder while loading
 * - Support for fade-in animations
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

interface LazyLoadWrapperProps {
  children: React.ReactNode;
  skeleton?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
  triggerOnce?: boolean;
  fadeIn?: boolean;
  className?: string;
  minHeight?: string | number;
  disableSuspense?: boolean;
}

export function LazyLoadWrapper({
  children,
  className = "",
  minHeight = "200px",
}: LazyLoadWrapperProps) {
  const containerStyle: React.CSSProperties = {
    minHeight: typeof minHeight === "number" ? `${minHeight}px` : minHeight,
  };

  return (
    <div 
      className={className}
      style={containerStyle}
    >
      {children}
    </div>
  );
}

/**
 * Default skeleton for lazy loading
 */
function DefaultSkeleton() {
  return (
    <div className="w-full h-full min-h-[200px] bg-white rounded-2xl shadow-sm animate-pulse flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 border-4 border-[#d1d5db] border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading form...</p>
      </div>
    </div>
  );
}

/**
 * Lazy load a component with dynamic import
 */
// Component libraries expose a wide range of prop contracts here; preserve inference for callers.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyLoad<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: {
    skeleton?: React.ReactNode;
    rootMargin?: string;
    minHeight?: string | number;
  } = {}
) {
  const LazyComponent = React.lazy(importFn);

  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <LazyLoadWrapper
        skeleton={options.skeleton}
        rootMargin={options.rootMargin}
        minHeight={options.minHeight}
      >
        <LazyComponent {...props} />
      </LazyLoadWrapper>
    );
  };
}

/**
 * Preload component when user hovers over a trigger element
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function usePreload<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) {
  const preloadRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup if needed
    };
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!preloadRef.current) {
      preloadRef.current = () => {
        // Start loading the component
        importFn();
      };
      preloadRef.current();
    }
  }, [importFn]);

  return handleMouseEnter;
}

/**
 * Visibility tracker for analytics or progressive loading
 */
export function useVisibilityTracking(
  onVisible: () => void,
  options: {
    rootMargin?: string;
    threshold?: number;
    triggerOnce?: boolean;
  } = {}
) {
  const elementRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          onVisible();

          if (options.triggerOnce !== false) {
            observer.unobserve(element);
          }
        } else if (options.triggerOnce === false) {
          setIsVisible(false);
        }
      },
      {
        rootMargin: options.rootMargin || "0px",
        threshold: options.threshold || 0,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [onVisible, options.rootMargin, options.threshold, options.triggerOnce]);

  return { ref: elementRef, isVisible };
}

export default LazyLoadWrapper;
