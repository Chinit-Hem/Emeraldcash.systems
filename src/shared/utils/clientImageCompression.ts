/**
 * Client-Side Image Compression Utility
 * Compresses images in the browser before uploading to reduce file size and upload time
 *
 * OPTIMIZED: Now uses Web Workers for non-blocking compression when available
 */

import {
  compressImageInWorker,
  isWorkerCompressionSupported,
  terminateWorker
} from '@/shared/utils/imageCompressionWorker';

// Compression settings optimized for speed
const DEFAULT_MAX_WIDTH = 800; // Reduced from 1200 for faster processing
const DEFAULT_MAX_HEIGHT = 800;
const DEFAULT_QUALITY = 0.7;
const COMPRESSION_TIMEOUT = 15000; // 15 second timeout

/**
 * Compress an image file using canvas (main thread fallback)
 * @param file - The image file to compress
 * @param maxWidth - Maximum width in pixels (default: 800)
 * @param quality - JPEG quality 0-1 (default: 0.6 for speed)
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 * @returns Promise with compressed file and metadata
 */
async function compressImageMainThread(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number; // JPEG/WebP quality 0-1
    type?: string;
    timeoutMs?: number;
  } = {}
): Promise<{
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
}> {
  const {
    maxWidth = DEFAULT_MAX_WIDTH,
    maxHeight = DEFAULT_MAX_HEIGHT,
    quality = DEFAULT_QUALITY,
    type = 'image/jpeg',
    timeoutMs = 5000 // 5 second default timeout
  } = options;

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    let settled = false;

    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      URL.revokeObjectURL(objectUrl);
      callback();
    };

    // Set up timeout
    const timeoutId = setTimeout(() => {
      settle(() => reject(new Error(`Image compression timeout after ${timeoutMs}ms`)));
    }, timeoutMs);

    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          settle(() => reject(new Error('Failed to get canvas context')));
          return;
        }

        // Use faster quality scaling (medium is faster than high)
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium'; // Changed from 'high' for speed

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              settle(() => reject(new Error('Failed to create blob from canvas')));
              return;
            }

            // Create new file from blob
            const compressedFile = new File([blob], file.name, {
              type: type,
              lastModified: Date.now()
            });

            const originalSize = file.size;
            const compressedSize = blob.size;
            const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

            settle(() =>
              resolve({
                file: compressedFile,
                originalSize,
                compressedSize,
                compressionRatio,
                width,
                height
              })
            );
          },
          'image/webp', // Prioritize WebP for better compression
          quality
        );
      } catch (error) {
        settle(() =>
          reject(error instanceof Error ? error : new Error('Failed to compress image'))
        );
      }
    };

    img.onerror = () => {
      settle(() => reject(new Error('Failed to load image for compression')));
    };

    img.src = objectUrl;
  });
}

/**
 * Check if image compression is needed
 * @param file - The image file to check
 * @param maxSizeMB - Maximum size in MB before compression is required
 * @returns boolean indicating if compression is recommended
 */
export function shouldCompressImage(file: File, maxSizeMB: number = 1): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size > maxSizeBytes;
}

/**
 * Get image dimensions without loading full image
 * @param file - The image file
 * @returns Promise with width and height
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Process image for upload with automatic compression if needed
 * @param file - The image file
 * @param options - Compression options
 * @returns Processed file ready for upload
 */
export async function processImageForUpload(
  file: File,
  options: {
    maxWidth?: number;
    quality?: number;
    autoCompress?: boolean;
    maxSizeMB?: number;
  } = {}
): Promise<File> {
  const {
    maxWidth = 1200,
    quality = 0.7,
    autoCompress = true,
    maxSizeMB = 1
  } = options;

  // Check if compression is needed
  if (!autoCompress || !shouldCompressImage(file, maxSizeMB)) {
    return file;
  }

  try {
    const result = await compressImage(file, {
      maxWidth,
      quality,
      type: file.type || 'image/jpeg'
    });

    // Only use compressed if it's actually smaller
    if (result.compressedSize < result.originalSize) {
      return result.file;
    } else {
      return file;
    }
  } catch (_error) {
    return file;
  }
}

/**
 * Compress an image file with automatic Web Worker support
 * Uses Web Worker for non-blocking compression when available, falls back to main thread
 *
 * NOTE: Web Worker is disabled by default to avoid compatibility issues on mobile Safari
 * and other environments where OffscreenCanvas may not be available or reliable.
 *
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise with compressed file and metadata
 */
export async function compressImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    type?: string;
    useWorker?: boolean; // Allow overriding worker usage
  } = {}
): Promise<{
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
}> {
  const {
    maxWidth = DEFAULT_MAX_WIDTH,
    maxHeight = DEFAULT_MAX_HEIGHT,
    quality = DEFAULT_QUALITY,
    type = 'image/jpeg',
    useWorker = true // 🚀 PERF: Enable Web Worker by default for non-blocking compression // This is a loop.
  } = options;

  // Check if we should use Web Worker
  const workerSupported = isWorkerCompressionSupported();
  const shouldUseWorker = useWorker && workerSupported;

  try {
    let result;

    if (shouldUseWorker) {
      // Use Web Worker for non-blocking compression
      result = await compressImageInWorker(file, {
        maxWidth,
        maxHeight,
        quality, // Worker will use 'image/jpeg' or 'image/webp' based on outputType
        timeout: COMPRESSION_TIMEOUT
      });
    } else {
      // Fallback to main thread
      result = await compressImageMainThread(file, {
        maxWidth,
        maxHeight,
        quality, // Main thread will use 'image/webp'
        type
      });
    }

    return result;

  } catch (error) {
    // If worker failed, try main thread as fallback
    if (shouldUseWorker && error instanceof Error &&
        (error.message.includes('Worker') || error.message.includes('timeout'))) {
      try {
        return await compressImageMainThread(file, {
          maxWidth,
          maxHeight,
          quality,
          type
        });
      } catch {
        // Main thread fallback also failed
      }
    }

    throw error;
  }
}

/**
 * Compress image with progress callback
 * Provides real-time progress updates during compression
 *
 * @param file - The image file to compress
 * @param options - Compression options
 * @param onProgress - Callback for progress updates (0-100)
 * @returns Promise with compressed file
 */
export async function compressImageWithProgress(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    type?: string;
  } = {},
  onProgress?: (progress: number) => void
): Promise<{
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
}> {
  // No artificial delays - immediate progress
  if (onProgress) {
    onProgress(0);
    onProgress(50);
  }

  const result = await compressImage(file, options);

  if (onProgress) {
    onProgress(100);
  }

  return result;
}

/**
 * Quick compress for immediate preview (lower quality, faster)
 * Then full compress in background
 *
 * @param file - The image file to compress
 * @returns Object with quick result and promise for full result
 */
export function compressImageProgressive(
  file: File
): {
  quick: Promise<{
    file: File;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    width: number;
    height: number;
  }>;
  full: Promise<{
    file: File;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    width: number;
    height: number;
  }>;
} {
  // Quick compression for immediate use (lower quality, smaller size)
  const quick = compressImage(file, {
    maxWidth: 400, // Small for fast processing
    maxHeight: 400,
    quality: 0.6
  });

  // Full compression for upload (higher quality, larger size)
  const full = compressImage(file, {
    maxWidth: DEFAULT_MAX_WIDTH,
    maxHeight: DEFAULT_MAX_HEIGHT,
    quality: DEFAULT_QUALITY
  });

  return { quick, full };
}

/**
 * Cleanup function - terminate worker when done
 * Call this when component unmounts or when you know no more compressions are needed
 */
export { terminateWorker };

// Re-export worker support check
export { isWorkerCompressionSupported };
