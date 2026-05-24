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

import { processImageForUpload } from "@/shared/utils/clientImageCompression";
import { fileToDataUrl } from "@/shared/utils/fileToDataUrl";
import { parseVehicleImages } from "@/systems/vms/utils/vehicle-helpers";
import React, { useCallback, useEffect, useRef, useState } from "react";

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ImageInputProps {
  /** Current image value (URL or base64) */
  value?: string;
  /** Current image values for gallery mode */
  values?: string[];
  /** Callback when image changes (URL, base64, or null) */
  onChange: (value: string | null) => void;
  /** Callback when gallery images change */
  onChangeMany?: (values: string[]) => void;
  /** Allow more than one image */
  multiple?: boolean;
  /** Maximum number of images in gallery mode */
  maxImages?: number;
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
  values,
  onChange,
  onChangeMany,
  multiple = false,
  maxImages = 12,
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
  const [previews, setPreviews] = useState<ImagePreview[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  // Cache key to force image re-render when image changes
  const [cacheKey, setCacheKey] = useState(0);
  // Track object URLs for cleanup
  const objectUrlRef = useRef<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const replaceIndexRef = useRef<number | null>(null);

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
    if (multiple) {
      const galleryValues = parseVehicleImages(values?.length ? values : value);
      setPreviews(
        galleryValues.map((image, index) => ({
          url: image,
          name: index === 0 ? "Primary image" : `Image ${index + 1}`,
          isUrl: image.startsWith("http://") || image.startsWith("https://"),
        }))
      );
      setPreview(null);
      setIsUsingFallback(false);
      setFailedUrl(null);
      return;
    }

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
  }, [value, values, multiple, maxSizeMB, failedUrl]);

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

  const extractImageUrlFromTransfer = (dataTransfer: DataTransfer): string | null => {
    const uriList = dataTransfer.getData("text/uri-list")?.trim();
    if (uriList && isValidImageUrl(uriList)) return uriList;

    const plainText = dataTransfer.getData("text/plain")?.trim();
    if (plainText && isValidImageUrl(plainText)) return plainText;

    const html = dataTransfer.getData("text/html");
    if (!html) return null;

    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const imgSrc = doc.querySelector("img")?.getAttribute("src")?.trim();
      if (imgSrc && isValidImageUrl(imgSrc)) return imgSrc;

      const linkHref = doc.querySelector("a")?.getAttribute("href")?.trim();
      if (linkHref && isValidImageUrl(linkHref)) return linkHref;
    } catch {
      return null;
    }

    return null;
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return fileToDataUrl(file);
  };

  const buildPreview = useCallback((url: string, index: number, name?: string, size?: number): ImagePreview => ({
    url,
    name: name || (index === 0 ? "Primary image" : `Image ${index + 1}`),
    size,
    isUrl: url.startsWith("http://") || url.startsWith("https://"),
  }), []);

  const emitMultipleImages = useCallback((nextValues: string[]) => {
    const uniqueValues = parseVehicleImages(nextValues).slice(0, maxImages);
    setPreviews(uniqueValues.map((image, index) => buildPreview(image, index)));
    setPreview(null);
    setCacheKey((prev) => prev + 1);
    if (onChangeMany) {
      onChangeMany(uniqueValues);
    } else {
      onChange(uniqueValues[0] ?? null);
    }
  }, [buildPreview, maxImages, onChange, onChangeMany]);

  const appendMultipleImages = useCallback((newValues: string[]) => {
    const currentValues = parseVehicleImages(previews.map((item) => item.url));
    emitMultipleImages([...currentValues, ...newValues]);
  }, [emitMultipleImages, previews]);

  const replaceMultipleImage = useCallback((index: number, nextValue: string) => {
    const currentValues = parseVehicleImages(previews.map((item) => item.url));
    if (index < 0 || index >= currentValues.length) return;
    currentValues[index] = nextValue;
    emitMultipleImages(currentValues);
  }, [emitMultipleImages, previews]);

  const removeMultipleImage = useCallback((index: number) => {
    const currentValues = parseVehicleImages(previews.map((item) => item.url));
    currentValues.splice(index, 1);
    emitMultipleImages(currentValues);
  }, [emitMultipleImages, previews]);

  const clearMultipleImages = useCallback(() => {
    emitMultipleImages([]);
    setUrlInput("");
    setError(null);
  }, [emitMultipleImages]);

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

    if (multiple) {
      const replacingIndex = replaceIndexRef.current;
      replaceIndexRef.current = null;

      if (replacingIndex === null && previews.length >= maxImages) {
        setError(`You can upload up to ${maxImages} images.`);
        return;
      }

      setIsLoading(true);
      try {
        const processedFile = await processImageForUpload(file, {
          maxWidth: 1200,
          quality: 0.7,
          autoCompress: true,
          maxSizeMB: 1,
        });
        const dataUrl = await readFileAsDataUrl(processedFile);
        const cleanedDataUrl = cleanDataUrl(dataUrl);

        if (replacingIndex !== null) {
          replaceMultipleImage(replacingIndex, cleanedDataUrl);
        } else {
          appendMultipleImages([cleanedDataUrl]);
        }
      } catch (err) {
        console.warn("[ImageInput] Multi-image processing failed, using original file:", err);
        const dataUrl = await readFileAsDataUrl(file);
        const cleanedDataUrl = cleanDataUrl(dataUrl);
        if (replacingIndex !== null) {
          replaceMultipleImage(replacingIndex, cleanedDataUrl);
        } else {
          appendMultipleImages([cleanedDataUrl]);
        }
      } finally {
        setIsLoading(false);
      }
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
  }, [appendMultipleImages, maxImages, multiple, onChange, previews.length, replaceMultipleImage, validateFile]);

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
      if (multiple && replaceIndexRef.current === null) {
        const remainingSlots = Math.max(maxImages - previews.length, 0);
        const selectedFiles = Array.from(files).slice(0, remainingSlots);

        if (selectedFiles.length === 0) {
          setError(`You can upload up to ${maxImages} images.`);
        } else {
          void (async () => {
            setError(null);
            setIsLoading(true);
            const processedValues: string[] = [];

            try {
              for (const file of selectedFiles) {
                const validationError = validateFile(file);
                if (validationError) {
                  setError(validationError);
                  continue;
                }

                const processedFile = await processImageForUpload(file, {
                  maxWidth: 1200,
                  quality: 0.7,
                  autoCompress: true,
                  maxSizeMB: 1,
                }).catch(() => file);
                const dataUrl = await readFileAsDataUrl(processedFile);
                processedValues.push(cleanDataUrl(dataUrl));
              }

              if (processedValues.length > 0) {
                appendMultipleImages(processedValues);
              }
            } finally {
              setIsLoading(false);
            }
          })();
        }
      } else {
        void handleFileSelect(files[0]);
      }
    }
    // Reset input so the same file can be selected again
    e.target.value = "";
  }, [appendMultipleImages, handleFileSelect, maxImages, multiple, previews.length, validateFile]);

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

      if (multiple) {
        if (previews.length >= maxImages) {
          throw new Error(`You can upload up to ${maxImages} images.`);
        }
        appendMultipleImages([trimmedUrl]);
        setUrlInput("");
        return;
      }

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
  }, [appendMultipleImages, maxImages, multiple, onChange, previews.length]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      if (multiple) {
        const remainingSlots = Math.max(maxImages - previews.length, 0);
        const selectedFiles = Array.from(files).slice(0, remainingSlots);

        if (selectedFiles.length === 0) {
          setError(`You can upload up to ${maxImages} images.`);
          return;
        }

        setIsLoading(true);
        const processedValues: string[] = [];
        try {
          for (const file of selectedFiles) {
            const validationError = validateFile(file);
            if (validationError) {
              setError(validationError);
              continue;
            }
            const processedFile = await processImageForUpload(file, {
              maxWidth: 1200,
              quality: 0.7,
              autoCompress: true,
              maxSizeMB: 1,
            }).catch(() => file);
            const dataUrl = await readFileAsDataUrl(processedFile);
            processedValues.push(cleanDataUrl(dataUrl));
          }
          if (processedValues.length > 0) {
            appendMultipleImages(processedValues);
          }
        } finally {
          setIsLoading(false);
        }
      } else {
        await handleFileSelect(files[0]);
      }
      return;
    }

    const droppedImageUrl = extractImageUrlFromTransfer(e.dataTransfer);
    if (droppedImageUrl) {
      await handleUrlSubmit(droppedImageUrl);
      return;
    }

    setError("Drop an image file or a direct image URL.");
  }, [appendMultipleImages, disabled, handleFileSelect, handleUrlSubmit, maxImages, multiple, previews.length, validateFile]);

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
    if (multiple) {
      clearMultipleImages();
      return;
    }

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
  }, [clearMultipleImages, multiple, onChange]);

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
          relative min-w-0 border-2 border-dashed rounded-lg p-4 sm:p-6 transition-all duration-200 cursor-pointer
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
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />
        {multiple && (
          <input
            ref={replaceInputRef}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            disabled={disabled}
            className="hidden"
          />
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Processing...</p>
          </div>
        ) : multiple && previews.length > 0 ? (
          <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:grid-cols-3">
              {previews.map((item, index) => (
                <div
                  key={`${item.url}-${index}-${cacheKey}`}
                  className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <img
                    src={item.url}
                    alt={index === 0 ? "Primary vehicle image" : `Vehicle image ${index + 1}`}
                    className="h-32 w-full object-cover sm:h-28"
                    onError={() => {
                      setError("One image could not be loaded. Replace it or remove it.");
                    }}
                  />
                  <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-1 text-sm font-semibold text-white">
                    {index === 0 ? "Primary" : index + 1}
                  </div>
                  <div className="absolute inset-x-2 bottom-2 flex gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        replaceIndexRef.current = index;
                        replaceInputRef.current?.click();
                      }}
                      disabled={disabled}
                      className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-white/95 px-2 py-2 text-sm font-semibold text-slate-800 shadow hover:bg-white disabled:opacity-50"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMultipleImage(index);
                      }}
                      disabled={disabled}
                      className="flex min-h-11 items-center justify-center rounded-lg bg-red-500 px-2 py-2 text-sm font-semibold text-white shadow hover:bg-red-600 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              {previews.length < maxImages && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  disabled={disabled}
                  className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-sm font-medium text-gray-500 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 sm:h-28"
                >
                  <svg className="mb-1 h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M12 5v14m7-7H5" />
                  </svg>
                  Add photo
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>{previews.length} / {maxImages} photos</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearMultipleImages();
                }}
                disabled={disabled}
                className="min-h-11 rounded-lg px-3 py-2 font-semibold text-red-500 hover:text-red-600 disabled:opacity-50"
              >
                Replace all
              </button>
            </div>
          </div>
        ) : preview ? (
          <div className="relative">
            { }
            <img
              key={cacheKey} // Force re-render when image changes
              src={isUsingFallback ? "/placeholder-car.svg" : preview.url}
              alt="Preview"
              className="mx-auto max-h-48 max-w-full rounded-lg object-contain"
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
            <div className="absolute right-2 top-2 flex space-x-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                disabled={disabled}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-colors hover:bg-red-600"
                title="Remove image"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {preview.name && (
              <p className="mt-2 break-words text-center text-sm text-gray-500 dark:text-gray-400">
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
              <p className="mt-1 break-words text-sm text-gray-500 dark:text-gray-400">
                {helperText}
              </p>
              <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                Max size: {maxSizeMB}MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* URL Input Section */}
      {(!preview || multiple) && (
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              ref={urlInputRef}
              type="text"
              value={urlInput}
              onChange={handleUrlInputChange}
              onKeyDown={handleUrlInputKeyDown}
              placeholder={urlPlaceholder}
              disabled={disabled || isLoading}
              className={`
                min-h-11 w-full min-w-0 px-4 py-3 text-base sm:text-sm
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
                min-h-11 rounded-lg px-4 py-2 text-sm font-medium
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
          
          <p className="break-words text-sm text-gray-500 dark:text-gray-400">
            Tip: Press Ctrl+V to paste an image from clipboard or URL
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex flex-col gap-2 text-sm text-red-600 dark:text-red-400 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="break-words">{error}</span>
          </div>
          {isUsingFallback && failedUrl && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={disabled}
              className="min-h-11 rounded bg-red-100 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 sm:ml-2"
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
