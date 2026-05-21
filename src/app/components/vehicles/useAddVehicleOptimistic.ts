"use client";

import { useState, useCallback } from "react";
import { compressImage } from "@/lib/clientImageCompression";
import { recordMutation } from "@/lib/vehicleCache";
import { safeBase64ToFile } from "@/lib/fileToDataUrl";
import type { Vehicle } from "@/lib/types";
import { parseVehicleImages } from "@/lib/vehicle-helpers";

/**
 * Clean base64 data URL to remove problematic characters
 * This is a defensive measure to handle data that may have been corrupted
 */
function cleanBase64DataUrl(dataUrl: string): string {
  if (!dataUrl || typeof dataUrl !== 'string') return dataUrl;

  // Only process data URLs
  if (!dataUrl.startsWith('data:')) return dataUrl;

  // Find the comma separator
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) return dataUrl;

  const header = dataUrl.substring(0, commaIndex);
  let base64Data = dataUrl.substring(commaIndex + 1);

  // Remove all whitespace and control characters (including zero-width chars)
  base64Data = base64Data.replace(/[\s\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '');

  // Convert URL-safe base64 to standard
  base64Data = base64Data.replace(/-/g, "+").replace(/_/g, "/");

  // Remove ellipsis characters
  base64Data = base64Data.replace(/…/g, '').replace(/\u2026/g, '');

  // Remove all non-base64 characters
  base64Data = base64Data.replace(/[^A-Za-z0-9+/]/g, '');

  // Add padding if needed
  const remainder = base64Data.length % 4;
  if (remainder !== 0) {
    base64Data += "=".repeat(4 - remainder);
  }

  return `${header},${base64Data}`;
}

interface UseAddVehicleOptimisticOptions {
  onSuccess?: (vehicle: Vehicle) => void;
  onError?: (error: Error) => void;
}

interface UseAddVehicleOptimisticReturn {
  addVehicle: (
    data: Partial<Vehicle>,
    imageFile?: File | null
  ) => Promise<Vehicle>;
  isAdding: boolean;
  isProcessing: boolean; // Background processing indicator
}

// Maximum retry attempts for transient errors - ULTRA-OPTIMIZED for minimal delay
const MAX_RETRY_ATTEMPTS = 1; // Single retry for fastest response
const RETRY_DELAY_MS = 100; // Minimal retry delay - reduced from 300ms

// Image compression settings - ULTRA-OPTIMIZED for speed
const COMPRESSION_MAX_WIDTH = 800; // Optimized width
const COMPRESSION_QUALITY = 0.7; // Optimized quality

// Skip compression if file is already small enough (under 800KB)
// This prevents double compression when VehicleForm already compressed the image
const SKIP_COMPRESSION_THRESHOLD_KB = 800;

// Server-side upload configuration - uses /api/upload endpoint
// This keeps Cloudinary credentials secure on the server
const UPLOAD_API_URL = '/api/upload';

// Helper function to delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to check if error is retryable
const isRetryableError = (error: Error): boolean => {
  const message = error.message.toLowerCase();
  const has502 = message.includes('502') || message.includes('[http 502]');
  const has504 = message.includes('504') || message.includes('[http 504]');
  const hasTimeout = message.includes('timeout');
  const hasNetworkError = message.includes('network') ||
                          message.includes('econnreset') ||
                          message.includes('econnrefused') ||
                          message.includes('socket hang up');

  const statusCode = (error as Error & { statusCode?: number }).statusCode;
  const isRetryableStatus = statusCode === 502 || statusCode === 504 || statusCode === 503;

  return has502 || has504 || hasTimeout || hasNetworkError || isRetryableStatus;
};

/**
 * Generate a temporary ID for optimistic vehicle
 */
function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Upload image file to Cloudinary via server-side API endpoint
 * This keeps Cloudinary credentials secure on the server
 */
async function uploadImageToCloudinary(
  image: File | string,
  category: string,
  tempId: string
): Promise<string> {
  console.log(`[uploadImageToCloudinary] Uploading via server API:`, {
    url: UPLOAD_API_URL,
    tempId,
    category,
    source: typeof image === "string" ? "url" : "file",
    fileSize: typeof image === "string" ? undefined : `${(image.size / 1024).toFixed(2)}KB`,
  });

  const requestInit: RequestInit = {
    method: "POST",
    credentials: "include",
  };

  if (typeof image === "string") {
    requestInit.headers = { "Content-Type": "application/json" };
    requestInit.body = JSON.stringify({
      image,
      vehicleId: tempId,
      category,
    });
  } else {
    const formData = new FormData();
    formData.append("image", image);
    formData.append("vehicleId", tempId);
    formData.append("category", category);
    requestInit.body = formData;
  }

  const response = await fetch(UPLOAD_API_URL, {
    ...requestInit,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || errorData.details || `Upload failed: ${response.status}`;

    console.warn('[uploadImageToCloudinary] Server upload failed:', {
      status: response.status,
      error: errorMessage,
      errorData,
    });

    throw new Error(errorMessage);
  }

  const result = await response.json();

  if (!result.ok || !result.data?.url) {
    throw new Error("Server response missing image URL");
  }

  console.log(`[uploadImageToCloudinary] Success:`, {
    url: result.data.url.substring(0, 100) + "...",
    publicId: result.data.publicId,
    folder: result.data.folder,
  });

  return result.data.url;
}

type VehicleCreateData = Partial<Vehicle> & { Images?: string[] };

async function prepareImageForUpload(
  data: VehicleCreateData,
  imageFile: File | null | undefined,
  tempId: string
): Promise<File | string | null> {
  if (imageFile) {
    const fileSizeKB = imageFile.size / 1024;

    if (fileSizeKB < SKIP_COMPRESSION_THRESHOLD_KB) {
      console.log(`[addVehicle] File already small (${fileSizeKB.toFixed(2)}KB < ${SKIP_COMPRESSION_THRESHOLD_KB}KB), skipping compression`);
      return imageFile;
    }

    console.log(`[addVehicle] Compressing image file (${fileSizeKB.toFixed(2)}KB)...`);
    const compressedResult = await compressImage(imageFile, {
      maxWidth: COMPRESSION_MAX_WIDTH,
      quality: COMPRESSION_QUALITY,
    });

    console.log(`[addVehicle] Image compressed:`, {
      originalSize: `${(imageFile.size / 1024).toFixed(2)}KB`,
      compressedSize: `${(compressedResult.compressedSize / 1024).toFixed(2)}KB`,
    });

    return compressedResult.file;
  }

  if (data.Image?.startsWith("data:image/")) {
    const cleanedImage = cleanBase64DataUrl(data.Image);
    const { file: fileFromBase64, error: conversionError } = safeBase64ToFile(
      cleanedImage,
      `vehicle_${tempId}_${Date.now()}.jpg`
    );

    if (conversionError || !fileFromBase64) {
      throw new Error(conversionError || "Failed to convert image data");
    }

    return fileFromBase64;
  }

  if (data.Image?.startsWith("http://") || data.Image?.startsWith("https://")) {
    return data.Image;
  }

  return null;
}

async function resolveImageForSave(
  source: File | string,
  category: string,
  tempId: string,
  index: number
): Promise<string> {
  if (typeof source === "string" && (source.startsWith("http://") || source.startsWith("https://"))) {
    return source;
  }

  return uploadImageToCloudinary(source, category, `${tempId}_${index}`);
}

export function useAddVehicleOptimistic(
  options: UseAddVehicleOptimisticOptions = {}
): UseAddVehicleOptimisticReturn {
  const { onSuccess, onError } = options;
  const [isAdding, setIsAdding] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const addVehicle = useCallback(
    async (
      data: VehicleCreateData,
      imageFile?: File | null
    ): Promise<Vehicle> => {
      setIsAdding(true);
      const tempId = generateTempId();

      // Create optimistic vehicle for instant UI feedback
      const optimisticVehicle: Vehicle = {
        VehicleId: tempId,
        Brand: data.Brand || "",
        Model: data.Model || "",
        Category: data.Category || "",
        Plate: data.Plate || "",
        Year: data.Year || null,
        Color: data.Color || "",
        Condition: data.Condition || "New",
        BodyType: data.BodyType || "",
        TaxType: data.TaxType || "",
        PriceNew: data.PriceNew || null,
        Price40: data.Price40 || null,
        Price70: data.Price70 || null,
        Image: "", // Will be updated after upload
        Images: [],
        Time: new Date().toISOString(),
      };

      console.log(`[addVehicle] Starting optimistic add with temp ID: ${tempId}`);

      let pendingImage: File | string | null = null;
      const galleryImages = Array.isArray(data.Images) ? parseVehicleImages(data.Images) : [];
      try {
        pendingImage = galleryImages.length > 0
          ? null
          : await prepareImageForUpload(data, imageFile, tempId);
      } catch (err) {
        setIsAdding(false);
        const error = err instanceof Error ? err : new Error("Failed to prepare image");
        onError?.(error);
        throw error;
      }

      // Step 1: Prepare payload without image. The vehicle should be created
      // even if image upload is slow or Cloudinary has a transient failure.
      const payload: Record<string, unknown> = {
        category: data.Category,
        brand: data.Brand,
        model: data.Model,
        year: data.Year,
        plate: data.Plate,
        color: data.Color,
        condition: data.Condition,
        body_type: data.BodyType,
        tax_type: data.TaxType,
        market_price: data.PriceNew,
      };

      // Remove undefined values
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      const pendingImages: Array<File | string> = galleryImages.length > 0
        ? galleryImages
        : pendingImage
          ? [pendingImage]
          : [];

      if (pendingImages.length > 0) {
        setIsProcessing(true);
        try {
          const imageUrls = await Promise.all(
            pendingImages.map((source, index) =>
              resolveImageForSave(source, data.Category || "Cars", tempId, index)
            )
          );
          const validImageUrls = parseVehicleImages(imageUrls).filter(
            (imageUrl) =>
              imageUrl &&
              imageUrl !== "undefined" &&
              imageUrl !== "null" &&
              !imageUrl.includes("/undefined")
          );

          if (validImageUrls.length !== imageUrls.length) {
            throw new Error("Image upload returned an invalid URL");
          }

          payload.image_id = validImageUrls[0];
          payload.Images = validImageUrls;
          optimisticVehicle.Image = validImageUrls[0] || "";
          optimisticVehicle.Images = validImageUrls;
        } catch (uploadError) {
          const error = uploadError instanceof Error
            ? uploadError
            : new Error("Image upload failed");
          setIsAdding(false);
          setIsProcessing(false);
          onError?.(new Error(`Image upload failed: ${error.message}`));
          throw error;
        } finally {
          setIsProcessing(false);
        }
      }

      // Step 2: Send to API with retry logic
      let lastError: Error | null = null;
      let attempts = 0;
      let createdVehicle: Vehicle | null = null;

      while (attempts < MAX_RETRY_ATTEMPTS) {
        attempts++;

        console.log(`[addVehicle] API call attempt ${attempts}/${MAX_RETRY_ATTEMPTS}`);

        try {
          const res = await fetch(`/api/vehicles`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            credentials: "include",
          });

          console.log(`[addVehicle] API response status: ${res.status}`);

          if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            const errorMessage = json.error || `Failed to add vehicle: ${res.status}`;
            throw new Error(`[HTTP ${res.status}] ${errorMessage}`);
          }

          const result = await res.json();

          if (!result.success) {
            throw new Error(result.error || "API returned error");
          }

          createdVehicle = (result.data || optimisticVehicle) as Vehicle;
          const finalVehicle = createdVehicle;

          console.log(`[addVehicle] Add successful for vehicle ${finalVehicle.VehicleId || tempId}`);

          // Record mutation to trigger auto-refresh - ASYNC to not block success response
          setTimeout(() => {
            recordMutation();
            console.log(`[addVehicle] Mutation recorded - VehicleList will auto-refresh`);
          }, 0);

          // Call success callback immediately (don't wait for cache)
          onSuccess?.(finalVehicle);

          setIsAdding(false);
          setIsProcessing(false);
          return finalVehicle;

        } catch (err) {
          lastError = err instanceof Error ? err : new Error("Failed to add vehicle");

          console.error(`[addVehicle] API error on attempt ${attempts}:`, lastError.message);

          // Check if we should retry
          if (attempts < MAX_RETRY_ATTEMPTS && isRetryableError(lastError)) {
            console.log(`[addVehicle] Retrying after ${RETRY_DELAY_MS}ms...`);
            await delay(RETRY_DELAY_MS); // Fixed minimal delay - no exponential backoff
            continue;
          }

          break;
        }
      }

      // All retries exhausted
      setIsAdding(false);
      setIsProcessing(false);

      if (lastError) {
        const enhancedError = new Error(
          `${lastError.message}\n\n(Attempted ${attempts} time${attempts > 1 ? 's' : ''})`
        );
        onError?.(enhancedError);
        throw enhancedError;
      }

      // Should never reach here, but TypeScript needs it
      throw new Error("Unexpected error in addVehicle");
    },
    [onSuccess, onError]
  );

  return {
    addVehicle,
    isAdding,
    isProcessing,
  };
}
