/**
 * ImageInput Component - Hydration-Safe Image Upload
 * 
 * Supports both file upload (drag & drop or click) and URL paste (Ctrl+V).
 * Designed to be hydration-safe for SSR compatibility with iPhone Safari.
 * 
 * Features:
 * - Drag & drop file upload
 * - Click to select file
 * - URL input field for image links
 * - Ctrl+V paste support for image URLs
 * - Image preview with remove option
 * - File size validation
 * - Loading states
 * - Error handling
 * 
 * @module ImageInput
 */

"use client";

import { processImageForUpload } from "@/lib/clientImageCompression";
import { fileToDataUrl } from "@/lib/fileToDataUrl";
import React, { useCallback, useEffect, useRef, useState } from "react";

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ImageInputProps {
  /** Current image value (URL or base64) */
  value?: string;
  /** Callback when image changes (URL, base64, or null) */
  onChange: (value: string | null) => void;
  /** Optional label text */
  label?: string;
  /** Optional helper text */
  helperText?: string;
  /** Maximum file size in MB (default: 5) */
  maxSizeMB?: number;
  /** Accepted file types (default: image/*) */
  accept?: string;
  /** Optional className for styling */
  className?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Notifies parent while client-side image processing is running */
  onProcessingChange?: (isProcessing: boolean) => void;
  /** Placeholder text for URL input */
  urlPlaceholder?: string;
}

interface ImagePreview {
  url: string;
  name?: string;
  size?: number;
  isUrl: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function ImageInput({
  value,
  onChange,
  label = "Vehicle Image",
  helperText = "Drag & drop, click to upload, paste image URL, or Ctrl+V to paste image",
  maxSizeMB = 5,
  accept = "image/*",
  className = "",
  disabled = false,
  onProcessingChange,
  urlPlaceholder = "Paste image URL or press Ctrl+V",
}: ImageInputProps) {
  // ============================================================================
  // State
  // ============================================================================
  
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImagePreview | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  // Cache key to force image re-render when image changes
  const [cacheKey, setCacheKey] = useState(0);
  // Track object URLs for cleanup
  const objectUrlRef = useRef<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // Effects
  // ============================================================================

  // Hydration safety - only run client-side code after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    onProcessingChange?.(isLoading);
  }, [isLoading, onProcessingChange]);

  // Update preview when value changes
  useEffect(() => {
    if (!value) {
      setPreview(null);
      setIsUsingFallback(false);
      setFailedUrl(null);
      return;
    }

    // If this URL has already failed, don't try to show it again
    // This prevents the preview from reappearing after onError clears it
    if (failedUrl === value) {
      return;
    }

    // Force cache key update to prevent browser caching old image
    setCacheKey(prev => prev + 1);

    // Check if it's a URL or base64
    const isUrl = value.startsWith("http://") || value.startsWith("https://");
    const isDataUrl = value.startsWith("data:image/");
    
    // Validate data URLs before attempting to display
    if (isDataUrl && !isValidDataUrl(value)) {
      console.warn("[ImageInput] Invalid data URL format, using placeholder");
      setFailedUrl(value);
      setIsUsingFallback(true);
      setPreview({
        url: "/placeholder-car.svg",
        name: "Invalid Image (Placeholder)",
        isUrl: false,
      });
      return;
    }
    
    // Check data URL size to prevent memory issues
    if (isDataUrl) {
      const dataUrlSize = getDataUrlSize(value);
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (dataUrlSize > maxSizeBytes) {
        console.warn(`[ImageInput] Data URL too large (${formatFileSize(dataUrlSize)}), using placeholder`);
        setError(`Image too large (${formatFileSize(dataUrlSize)}). Max: ${maxSizeMB}MB`);
        setFailedUrl(value);
        setIsUsingFallback(true);
        setPreview({
          url: "/placeholder-car.svg",
          name: `Oversized Image (${formatFileSize(dataUrlSize)})`,
          isUrl: false,
        });
        return;
      }
    }
    
    // For external URLs coming from parent (initial data), show them
    // The img onError handler will catch load failures
    if (isUrl) {
      // iOS Safari fix: Validate URL format more strictly
      let validatedUrl = value;
      try {
        const urlObj = new URL(value);
        validatedUrl = urlObj.href;
      } catch {
        validatedUrl = value;
      }
      
      // Reset fallback state when value changes
      setIsUsingFallback(false);
      setFailedUrl(null);
      
      setPreview({
        url: validatedUrl,
        name: "Image URL",
        isUrl: true,
      });
    } else {
      // For data URLs, show immediately
      setIsUsingFallback(false);
      setFailedUrl(null);
      
      setPreview({
        url: value,
        name: "Uploaded Image",
        isUrl: false,
      });
    }
  }, [value, maxSizeMB, failedUrl]);

  // ============================================================================
  // Helpers
  // ============================================================================

  const isValidImageUrl = (url: string): boolean => {
    return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url) ||
           /^https?:\/\/.+/i.test(url); // Allow any URL that starts with http
  };

  const isValidDataUrl = (url: string): boolean => {
    // Check if it's a valid data URL with proper format
    if (!url.startsWith("data:image/")) return false;
    
    // Check for valid mime type
    const mimeMatch = url.match(/^data:image\/(jpeg|jpg|png|gif|webp|svg\+xml|bmp);/i);
    if (!mimeMatch) return false;
    
    // Check if base64 data exists and has reasonable length
    const base64Match = url.match(/^data:image\/[^;]+;base64,(.+)$/);
    if (!base64Match) {
      // Allow non-base64 data URLs (though rare)
      return url.length > 20;
    }
    
    const base64Data = base64Match[1];
    // Minimum valid base64 length (at least a few bytes)
    if (base64Data.length < 10) return false;
    
    // Check for valid base64 characters (allow common corruption patterns)
    // Relaxed check: allow any characters that aren't obviously wrong
    const cleaned = base64Data.replace(/[\s\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF…]/g, '');
    if (cleaned.length < 10) return false;
    
    return true;
  };

  /**
   * Clean base64 data URL to remove invalid characters
   * This prevents atob() failures by sanitizing the data at the source
   */
  const cleanDataUrl = (url: string): string => {
    if (!url.startsWith("data:")) return url;
    
    const commaIndex = url.indexOf(",");
    if (commaIndex === -1) return url;
    
    const header = url.substring(0, commaIndex);
    let base64Data = url.substring(commaIndex + 1);
    
    // Remove all whitespace and control characters
    base64Data = base64Data.replace(/[\s\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '');
    
    // Remove ellipsis characters (truncation indicator)
    base64Data = base64Data.replace(/…/g, '').replace(/\u2026/g, '');
    
    // Convert URL-safe base64 to standard
    base64Data = base64Data.replace(/-/g, "+").replace(/_/g, "/");
    
    // Remove all non-base64 characters (keep only A-Z, a-z, 0-9, +, /)
    base64Data = base64Data.replace(/[^A-Za-z0-9+/]/g, '');
    
    // Add padding if needed
    const remainder = base64Data.length % 4;
    if (remainder !== 0) {
      base64Data += "=".repeat(4 - remainder);
    }
    
    return `${header},${base64Data}`;
  };

  const getDataUrlSize = (url: string): number => {
    // Estimate size of base64 data URL in bytes
    const base64Match = url.match(/^data:image\/[^;]+;base64,(.+)$/);
    if (base64Match) {
      // Base64 encoding is ~4/3 of original size
      return Math.floor((base64Match[1].length * 3) / 4);
    }
    return 0;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const validateFile = useCallback((file: File): string | null => {
    if (!file.type.startsWith("image/")) {
      return "Please upload an image file (JPG, PNG, GIF, etc.)";
    }
    
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File size must be less than ${maxSizeMB}MB (current: ${formatFileSize(file.size)})`;
    }
    
    return null;
  }, [maxSizeMB]);

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return fileToDataUrl(file);
  };

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    
    // Clear any existing object URL to prevent caching issues
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    
    // Clear preview immediately to remove old image from UI
    setPreview(null);
    
    // Force cache key update to trigger re-render
    setCacheKey(prev => prev + 1);
    
    // Show immediate preview using object URL for instant feedback
    const immediatePreviewUrl = URL.createObjectURL(file);
    objectUrlRef.current = immediatePreviewUrl;
    
    setPreview({
      url: immediatePreviewUrl,
      name: file.name,
      size: file.size,
      isUrl: false,
    });
    
    try {
      // Compress image in background
      // This reduces upload time and prevents 502 timeouts
      const processedFile = await processImageForUpload(file, {
        maxWidth: 1200,
        quality: 0.7,
        autoCompress: true,
        maxSizeMB: 1 // Compress if larger than 1MB
      });
      
      const dataUrl = await readFileAsDataUrl(processedFile);
      
      // Revoke the temporary object URL to free memory
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      
      // Clean the data URL to prevent atob() failures
      const cleanedDataUrl = cleanDataUrl(dataUrl);
      
      // Update preview with compressed data URL
      onChange(cleanedDataUrl);
      setCacheKey(prev => prev + 1); // Force re-render with new image
      setPreview({
        url: cleanedDataUrl,
        name: processedFile.name,
        size: processedFile.size,
        isUrl: false,
      });
    } catch (err) {
      // If compression fails, keep the original preview and still use it
      console.warn("[ImageInput] Compression failed, using original file:", err);
      const dataUrl = await readFileAsDataUrl(file);
      
      // Clean the data URL to prevent atob() failures
      const cleanedDataUrl = cleanDataUrl(dataUrl);
      
      onChange(cleanedDataUrl);
      setCacheKey(prev => prev + 1); // Force re-render with new image
      setPreview({
        url: cleanedDataUrl,
        name: file.name,
        size: file.size,
        isUrl: false,
      });
    } finally {
      setIsLoading(false);
    }
  }, [onChange, validateFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect, disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
    // Reset input so the same file can be selected again
    e.target.value = "";
  }, [handleFileSelect]);

  const handleUrlSubmit = useCallback(async (url: string) => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    setError(null);
    setIsLoading(true);

    try {
      // Basic URL validation
      if (!isValidImageUrl(trimmedUrl)) {
        throw new Error("Please enter a valid image URL (http://...)");
      }

      // Test if image loads with timeout and CORS handling
      const img = new Image();
      
      // Only enable CORS for domains known to support it
      // Many image hosts (like IIHS) don't send CORS headers, so we skip CORS for display-only
      const trustedCorsDomains = [
        'cloudinary.com',
        'imgur.com',
        'unsplash.com',
        'images.unsplash.com',
        'picsum.photos',
        'placehold.co',
        'via.placeholder.com'
      ];
      const shouldUseCors = trustedCorsDomains.some(domain => trimmedUrl.includes(domain));
      
      if (shouldUseCors) {
        img.crossOrigin = "anonymous";
      }
      // For non-CORS domains, we don't set crossOrigin - image will load for display
      // but can't be manipulated in canvas (which is fine for our use case)
      
      const imageLoadPromise = new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error("Image load timeout - URL may be inaccessible"));
        }, 10000); // 10 second timeout
        
        img.onload = () => {
          clearTimeout(timeoutId);
          resolve(undefined);
        };
        
        img.onerror = () => {
          clearTimeout(timeoutId);
          // Provide more specific error message based on URL pattern
          if (trimmedUrl.includes('drive.google.com') || trimmedUrl.includes('googleusercontent.com')) {
            reject(new Error("Google Drive images require public sharing. Try downloading and uploading directly."));
          } else if (trimmedUrl.includes('dropbox.com')) {
            reject(new Error("Dropbox links need to be converted to direct download links (change ?dl=0 to ?dl=1)"));
          } else {
            reject(new Error("Failed to load image. The URL may be private, blocked, or the image no longer exists."));
          }
        };
        
        img.src = trimmedUrl;
      });

      await imageLoadPromise;

      // Only update parent and show preview after successful validation
      onChange(trimmedUrl);
      setPreview({
        url: trimmedUrl,
        name: "Image from URL",
        isUrl: true,
      });
      setUrlInput("");
      setCacheKey(prev => prev + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid image URL";
      setError(message);
      // Don't update parent or show preview for failed URLs
      // Keep input field visible for retry
      console.warn("[ImageInput] URL validation warning:", message);
    } finally {
      setIsLoading(false);
    }
  }, [onChange]);

  const handleUrlInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUrlInput(e.target.value);
    setError(null);
  }, []);

  const handleUrlInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleUrlSubmit(urlInput);
    }
  }, [urlInput, handleUrlSubmit]);

  const handleRemove = useCallback(() => {
    // Clean up object URL if exists
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    onChange(null);
    setPreview(null);
    setError(null);
    setUrlInput("");
    setIsUsingFallback(false);
    setFailedUrl(null);
    setCacheKey(prev => prev + 1); // Force re-render
  }, [onChange]);

  const handleRetry = useCallback(() => {
    if (failedUrl) {
      setIsUsingFallback(false);
      setError(null);
      // Force re-render by temporarily clearing and resetting the preview
      const currentPreview = preview;
      setPreview(null);
      setTimeout(() => {
        if (currentPreview) {
          setPreview(currentPreview);
        }
      }, 100);
    }
  }, [failedUrl, preview]);

  // Global paste handler for Ctrl+V (both files and URLs)
  useEffect(() => {
    if (!isMounted || disabled) return;

    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const activeElement = document.activeElement;
      const isFocusedInContainer = containerRef.current?.contains(activeElement) || false;
      
      // Let URL input handle its own paste
      if (activeElement === urlInputRef.current) {
        return;
      }

      if (isFocusedInContainer || activeElement === document.body) {
        const clipboardData = e.clipboardData;
        if (!clipboardData) return;

        // Try to get pasted files first (images copied from browser/screenshots)
        const files = clipboardData.files;
        if (files && files.length > 0) {
          const imageFile = Array.from(files).find(f => f.type.startsWith("image/"));
          if (imageFile) {
            e.preventDefault();
            await handleFileSelect(imageFile);
            return;
          }
        }

        // Fall back to URL paste
        const pastedText = clipboardData.getData("text");
        if (pastedText && isValidImageUrl(pastedText)) {
          e.preventDefault();
          handleUrlSubmit(pastedText);
        }
      }
    };

    document.addEventListener("paste", handleGlobalPaste);
    return () => document.removeEventListener("paste", handleGlobalPaste);
  }, [isMounted, disabled, handleFileSelect, handleUrlSubmit]);

  // ============================================================================
  // Render
  // ============================================================================

  // Don't render until mounted (hydration safety)
  if (!isMounted) {
    return (
      <div className={`space-y-2 ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`space-y-3 ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      {/* Main Upload Area */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 cursor-pointer
          ${isDragging 
            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" 
            : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          ${error ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />

        {isLoading ? (
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Processing...</p>
          </div>
        ) : preview ? (
          <div className="relative">
            { }
            <img
              key={cacheKey} // Force re-render when image changes
              src={isUsingFallback ? "/placeholder-car.svg" : preview.url}
              alt="Preview"
              className="max-h-48 mx-auto rounded-lg object-contain"
              onError={(e) => {
                // Handle image load errors - clear preview and show error
                // This allows user to try a different URL
                setFailedUrl(preview.url);
                setIsUsingFallback(true);
                setError("Failed to load image from URL. The image may be private, blocked, or no longer exists.");
                // Clear the preview to show the URL input again
                setPreview(null);
                // Don't change the parent value - let user decide to remove or try again
                e.currentTarget.src = "/placeholder-car.svg"; // Fallback to placeholder
              }}
              onLoad={() => {
                // Clear error when fallback image loads successfully
                if (isUsingFallback) {
                  setError(null);
                }
              }}
            />
            <div className="absolute top-2 right-2 flex space-x-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                disabled={disabled}
                className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                title="Remove image"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {preview.name && (
              <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400 truncate">
                {preview.name}
                {preview.size && ` • ${formatFileSize(preview.size)}`}
                {preview.isUrl && " • External URL"}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-3">
            {/* Upload Icon */}
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
              <svg 
                className="w-8 h-8 text-gray-400 dark:text-gray-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                />
              </svg>
            </div>
            
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Click to upload or drag & drop
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {helperText}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Max size: {maxSizeMB}MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* URL Input Section */}
      {!preview && (
        <div className="space-y-2">
          <div className="relative">
            <input
              ref={urlInputRef}
              type="text"
              value={urlInput}
              onChange={handleUrlInputChange}
              onKeyDown={handleUrlInputKeyDown}
              placeholder={urlPlaceholder}
              disabled={disabled || isLoading}
              className={`
                w-full px-4 py-2 pr-20 text-sm
                border rounded-lg 
                focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
                disabled:opacity-50 disabled:cursor-not-allowed
                ${error 
                  ? "border-red-300 dark:border-red-700 focus:ring-red-500 focus:border-red-500" 
                  : "border-gray-300 dark:border-gray-600"
                }
                bg-white dark:bg-gray-800
                text-gray-900 dark:text-gray-100
                placeholder-gray-400 dark:placeholder-gray-500
              `}
            />
            <button
              type="button"
              onClick={() => handleUrlSubmit(urlInput)}
              disabled={!urlInput.trim() || disabled || isLoading}
              className={`
                absolute right-1.5 top-1.5 px-3 py-1 text-xs font-medium rounded-md
                transition-colors
                ${urlInput.trim() && !disabled && !isLoading
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }
              `}
            >
              Add
            </button>
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Tip: Press Ctrl+V to paste an image from clipboard or URL
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center justify-between text-sm text-red-600 dark:text-red-400">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
          {isUsingFallback && failedUrl && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={disabled}
              className="ml-2 px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              title="Retry loading the original image"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Export
// ============================================================================

export default ImageInput;
