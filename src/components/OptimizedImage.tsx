/**
 * OptimizedImage - Performance-optimized image component
 * 
 * Features:
 * - WebP format support with fallback
 * - Blur-up loading effect
 * - Lazy loading with Intersection Observer
 * - CDN optimization params
 * - Responsive srcset
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/ui";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  containerClassName?: string;
  priority?: boolean;
  quality?: number;
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  placeholder?: "blur" | "empty";
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
  sizes?: string;
  loading?: "lazy" | "eager";
}

// Generate Cloudinary optimized URL with WebP
function getOptimizedUrl(
  src: string,
  width: number,
  quality: number = 80,
  format: string = "auto"
): string {
  // If it's already a Cloudinary URL, add optimization params
  if (src.includes("cloudinary.com")) {
    const baseUrl = src.split("/upload/")[0] + "/upload/";
    const imagePath = src.split("/upload/")[1];
    
    // Add transformation params
    const params = [
      `w_${width}`,
      `q_${quality}`,
      `f_${format}`,
      "dpr_auto",
    ].join(",");
    
    return `${baseUrl}${params}/${imagePath}`;
  }
  
  // For other URLs, return as-is (could add other CDN optimizations here)
  return src;
}

// Generate srcset for responsive images
function generateSrcSet(
  src: string,
  widths: number[],
  quality: number,
  format: string
): string {
  return widths
    .map(w => `${getOptimizedUrl(src, w, quality, format)} ${w}w`)
    .join(", ");
}

export function OptimizedImage({
  src,
  alt,
  width = 800,
  height,
  className,
  containerClassName,
  priority = false,
  quality = 80,
  objectFit = "cover",
  placeholder = "blur",
  blurDataURL,
  onLoad,
  onError,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  loading = "lazy",
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInViewport, setIsInViewport] = useState(priority);
  const [currentSrc, setCurrentSrc] = useState<string>("");
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate blur placeholder if not provided
  const blurPlaceholder = blurDataURL || 
    `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1">
        <rect fill="#f1f5f9" width="1" height="1"/>
      </svg>
    `)}`;

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || loading === "eager") {
      setIsInViewport(true);
      return;
    }

    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInViewport(true);
          observer.unobserve(element);
        }
      },
      {
        rootMargin: "200px", // Start loading 200px before entering viewport
        threshold: 0,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [priority, loading]);

  // Set optimized source when in viewport
  useEffect(() => {
    if (!isInViewport) return;

    const optimized = getOptimizedUrl(src, width, quality, "auto");
    setCurrentSrc(optimized);
  }, [isInViewport, src, width, quality]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  // Generate srcset for responsive images
  const srcSet = !priority ? generateSrcSet(
    src,
    [320, 640, 960, 1280, 1920],
    quality,
    "auto"
  ) : undefined;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden",
        containerClassName
      )}
      style={{
        width: width ? `${width}px` : "100%",
        height: height ? `${height}px` : "100%",
      }}
    >
      {/* Blur placeholder */}
      {placeholder === "blur" && !isLoaded && (
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            backgroundImage: `url(${blurPlaceholder})`,
            backgroundSize: objectFit,
            backgroundPosition: "center",
            filter: "blur(20px)",
            transform: "scale(1.1)",
            opacity: isLoaded ? 0 : 1,
          }}
        />
      )}

      {/* Skeleton placeholder */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-slate-200 animate-pulse" />
      )}

      {/* Main image */}
      {isInViewport && (
        <img
          ref={imgRef}
          src={currentSrc || src}
          alt={alt}
          width={width}
          height={height}
          loading={loading}
          decoding={priority ? "sync" : "async"}
          srcSet={srcSet}
          sizes={sizes}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "transition-all duration-500",
            isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105",
            className
          )}
          style={{
            objectFit,
            width: "100%",
            height: "100%",
          }}
        />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <div className="text-center">
            <svg
              className="w-12 h-12 mx-auto mb-2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm text-slate-500">Failed to load image</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Preload hook for critical images
export function usePreloadImage(src: string) {
  useEffect(() => {
    const img = new Image();
    img.src = src;
  }, [src]);
}

// Preload multiple images
export function preloadImages(srcs: string[]) {
  srcs.forEach(src => {
    const img = new Image();
    img.src = src;
  });
}

export default OptimizedImage;
