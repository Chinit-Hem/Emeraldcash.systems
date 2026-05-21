"use client";

import { useState, useCallback } from "react";
import { compressImage } from "@/lib/clientImageCompression";
import { getCloudinaryFolder } from "@/lib/cloudinary-folders";
import { recordMutation } from "@/lib/vehicleCache";
import { safeBase64ToFile } from "@/lib/fileToDataUrl";
import type { Vehicle } from "@/lib/types";
import { parseVehicleImages } from "@/lib/vehicle-helpers";

function cleanBase64DataUrl(dataUrl: string): string {
  if (!dataUrl || typeof dataUrl !== 'string') return dataUrl;
  
  if (!dataUrl.startsWith('data:')) return dataUrl;
  
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) return dataUrl;
  
  const header = dataUrl.substring(0, commaIndex);
  let base64Data = dataUrl.substring(commaIndex + 1);
  
  base64Data = base64Data.replace(/[\s\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '');
  
  base64Data = base64Data.replace(/-/g, "+").replace(/_/g, "/");
  
  base64Data = base64Data.replace(/…/g, '').replace(/\u2026/g, '');
  
  base64Data = base64Data.replace(/[^A-Za-z0-9+/]/g, '');
  
  const remainder = base64Data.length % 4;
  if (remainder !== 0) {
    base64Data += "=".repeat(4 - remainder);
  }
  
  return `${header},${base64Data}`;
}

interface UseUpdateVehicleOptimisticOptions {
  onSuccess?: (vehicle: Vehicle) => void;
  onError?: (error: Error, originalVehicle: Vehicle) => void;
  onProgress?: (stage: 'compressing' | 'uploading' | 'processing' | 'saving', progress: number) => void;
}

interface UseUpdateVehicleOptimisticReturn {
  updateVehicle: (
    vehicleId: string,
    data: Partial<Vehicle>,
    originalVehicle: Vehicle,
    imageFile?: File | null
  ) => Promise<void>;
  isUpdating: boolean;
}

type VehicleUpdateData = Partial<Vehicle> & { Images?: string[] };

const MAX_RETRY_ATTEMPTS = 1;
const RETRY_DELAY_MS = 100;
const MAX_CLOUDINARY_RETRIES = 2;
const CLOUDINARY_RETRY_DELAY = 500;

const COMPRESSION_MAX_WIDTH = 800;
const COMPRESSION_QUALITY = 0.7;

const SKIP_COMPRESSION_THRESHOLD_KB = 800;

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "vehicle_uploads";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isRetryableError = (error: Error | null): boolean => {
  if (!error) return false;
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

function validateCloudinaryConfig(): { valid: boolean; error?: string; useSignedUpload?: boolean } {
  if (!CLOUDINARY_CLOUD_NAME) {
    return {
      valid: true,
      useSignedUpload: true
    };
  }
  
  if (!CLOUDINARY_UPLOAD_PRESET) {
    return {
      valid: false,
      error: "Cloudinary Upload Preset is not configured. Please set NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in your environment variables."
    };
  }
  
  return { valid: true, useSignedUpload: false };
}

async function getCloudinarySignature(
  folder: string,
  publicId: string,
  tags: string[]
): Promise<{
  signature: string;
  timestamp: number;
  api_key: string;
  cloud_name: string;
  upload_preset: string;
  folder: string;
  public_id?: string;
  tags?: string;
}> {
  const response = await fetch('/api/cloudinary-signature', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      folder,
      public_id: publicId,
      tags,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to get upload signature: ${response.status}`
    );
  }

  const result = await response.json();
  
  if (!result.ok || !result.data) {
    throw new Error(result.error || 'Invalid signature response from server');
  }

  return result.data;
}

async function uploadImageToCloudinaryWithRetry(
  file: File,
  category: string,
  vehicleId: string,
  maxRetries: number = MAX_CLOUDINARY_RETRIES
): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const result = await uploadImageToCloudinary(file, category, vehicleId);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown upload error");
      
      if (lastError.message.includes('configuration error') || 
          lastError.message.includes('Upload Preset Error') ||
          lastError.message.includes('Cloud Name Error')) {
        throw lastError;
      }
      
      if (attempt <= maxRetries) {
        await delay(CLOUDINARY_RETRY_DELAY);
      }
    }
  }
  
  throw lastError || new Error("Cloudinary upload failed after retries");
}

async function uploadImageToCloudinarySigned(
  file: File,
  category: string,
  vehicleId: string
): Promise<string> {
  const folder = getCloudinaryFolder(category);
  const publicId = `vehicle_${vehicleId}_${Date.now()}`;
  const tags = [category, "vms", "vehicle"];

  const signatureData = await getCloudinarySignature(folder, publicId, tags);

  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${signatureData.cloud_name || 'unknown'}/image/upload`;
  
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", signatureData.upload_preset);
  formData.append("folder", signatureData.folder);
  formData.append("public_id", signatureData.public_id || publicId);
  formData.append("api_key", signatureData.api_key);
  formData.append("timestamp", String(signatureData.timestamp));
  formData.append("signature", signatureData.signature);
  
  if (signatureData.tags) {
    formData.append("tags", signatureData.tags);
  }

  try {
    const response = await fetch(cloudinaryUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || 
                          errorData.message || 
                          `Cloudinary upload failed: ${response.status}`;
      
      const error = new Error(errorMessage);
      (error as Error & { statusCode?: number }).statusCode = response.status;
      throw error;
    }

    const result = await response.json();
    
    if (!result.secure_url) {
      throw new Error("Cloudinary response missing secure_url");
    }

    return result.secure_url;
    
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Network error uploading to Cloudinary: ${error.message}. Please check your internet connection.`);
    }
    
    throw error;
  }
}

async function uploadImageToCloudinary(
  file: File,
  category: string,
  vehicleId: string
): Promise<string> {
  const configValidation = validateCloudinaryConfig();
  
  if (configValidation.useSignedUpload) {
    return uploadImageToCloudinarySigned(file, category, vehicleId);
  }

  if (!configValidation.valid) {
    throw new Error(`Configuration Error: ${configValidation.error}`);
  }

  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  
  const folder = getCloudinaryFolder(category);
  const publicId = `vehicle_${vehicleId}_${Date.now()}`;
  const tags = [category, "vms", "vehicle"];

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", folder);
  formData.append("public_id", publicId);
  formData.append("tags", tags.join(","));

  try {
    const response = await fetch(cloudinaryUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || 
                          errorData.message || 
                          `Cloudinary upload failed: ${response.status}`;
      
      const error = new Error(errorMessage);
      (error as Error & { statusCode?: number }).statusCode = response.status;
      throw error;
    }

    const result = await response.json();
    
    if (!result.secure_url) {
      throw new Error("Cloudinary response missing secure_url");
    }

    return result.secure_url;
    
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Network error uploading to Cloudinary: ${error.message}. Please check your internet connection.`);
    }
    
    throw error;
  }
}

async function resolveGalleryImageForSave(
  image: string,
  category: string,
  vehicleId: string,
  index: number
): Promise<string | null> {
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  if (!image.startsWith("data:image/")) {
    return null;
  }

  let fileFromBase64: File | null = null;
  const filename = `vehicle_${vehicleId}_${Date.now()}_${index}.jpg`;

  try {
    const response = await fetch(image);
    const blob = await response.blob();
    if (blob.size > 0 && blob.type.startsWith("image/")) {
      fileFromBase64 = new File([blob], filename, { type: blob.type });
    }
  } catch {
    const cleanedImage = cleanBase64DataUrl(image);
    const { file } = safeBase64ToFile(cleanedImage, filename);
    fileFromBase64 = file;
  }

  if (!fileFromBase64) {
    return null;
  }

  return uploadImageToCloudinaryWithRetry(
    fileFromBase64,
    category,
    `${vehicleId}_${index}`
  );
}

export function useUpdateVehicleOptimistic(
  options: UseUpdateVehicleOptimisticOptions = {}
): UseUpdateVehicleOptimisticReturn {
  const { onSuccess, onError, onProgress } = options;
  const [isUpdating, setIsUpdating] = useState(false);

  const updateVehicle = useCallback(
    async (
      vehicleId: string,
      data: VehicleUpdateData,
      originalVehicle: Vehicle,
      imageFile?: File | null
    ): Promise<void> => {
      setIsUpdating(true);

      let lastError: Error | null = null;
      let attempts = 0;
      let cloudinaryImageUrl: string | null = null;
      const hasGalleryUpdate = Array.isArray(data.Images);
      let cloudinaryImageUrls: string[] | null = hasGalleryUpdate ? [] : null;

      const reportProgress = (stage: 'compressing' | 'uploading' | 'processing' | 'saving', progress: number) => {
        onProgress?.(stage, progress);
      };

      // Image upload
      try {
        if (hasGalleryUpdate) {
          const galleryImages = parseVehicleImages(data.Images);
          reportProgress('compressing', 100);
          reportProgress('uploading', galleryImages.length > 0 ? 0 : 100);

          const galleryResults = await Promise.allSettled(
            galleryImages.map((image, index) =>
              resolveGalleryImageForSave(
                image,
                data.Category || originalVehicle.Category || "Cars",
                vehicleId,
                index
              )
            )
          );
          cloudinaryImageUrls = parseVehicleImages(
            galleryResults
              .filter((result): result is PromiseFulfilledResult<string | null> => result.status === "fulfilled")
              .map((result) => result.value)
              .filter((imageUrl): imageUrl is string => Boolean(imageUrl))
          );

          if (galleryImages.length > 0 && cloudinaryImageUrls.length === 0) {
            throw new Error("The selected photos are invalid. Replace the broken photos or remove them before saving.");
          }
          reportProgress('uploading', 100);
          cloudinaryImageUrl = cloudinaryImageUrls[0] || null;
        }
        else if (imageFile) {
          const fileSizeKB = imageFile.size / 1024;
          
          let fileToUpload: File;
          
          if (fileSizeKB < SKIP_COMPRESSION_THRESHOLD_KB) {
            fileToUpload = imageFile;
            reportProgress('compressing', 100);
          } else {
            reportProgress('compressing', 0);
            const compressedResult = await compressImage(imageFile, {
              maxWidth: COMPRESSION_MAX_WIDTH,
              quality: COMPRESSION_QUALITY,
            });
            fileToUpload = compressedResult.file;
            reportProgress('compressing', 100);
          }

          reportProgress('uploading', 0);
          cloudinaryImageUrl = await uploadImageToCloudinaryWithRetry(
            fileToUpload,
            data.Category || originalVehicle.Category || "Cars",
            vehicleId
          );
          reportProgress('uploading', 100);
        }
        else if (data.Image && data.Image.startsWith("data:image/")) {
          reportProgress('compressing', 50);
          
          const cleanedImage = cleanBase64DataUrl(data.Image);
          
          console.log("[useUpdateVehicleOptimistic] Converting base64 image:", {
            originalLength: data.Image.length,
            cleanedLength: cleanedImage.length,
            imagePreview: cleanedImage.substring(0, 100),
          });
          
          const { file: fileFromBase64, error: conversionError } = safeBase64ToFile(
            cleanedImage, 
            `vehicle_${vehicleId}_${Date.now()}.jpg`
          );
          
          if (conversionError || !fileFromBase64) {
            console.error("[useUpdateVehicleOptimistic] Base64 conversion failed:", conversionError);
            setIsUpdating(false);
            const error = new Error(conversionError || "Failed to convert image data. Please try uploading a different image or refreshing the page.");
            onError?.(error, originalVehicle);
            throw error;
          }
          
          console.log("[useUpdateVehicleOptimistic] Base64 conversion successful:", {
            fileSize: fileFromBase64.size,
            fileType: fileFromBase64.type,
          });
          
          reportProgress('compressing', 100);

          reportProgress('uploading', 0);
          cloudinaryImageUrl = await uploadImageToCloudinaryWithRetry(
            fileFromBase64,
            data.Category || originalVehicle.Category || "Cars",
            vehicleId
          );
          reportProgress('uploading', 100);
        }
        else if (data.Image && (data.Image.startsWith("http://") || data.Image.startsWith("https://"))) {
          cloudinaryImageUrl = data.Image;
          reportProgress('uploading', 100);
        } else {
          reportProgress('uploading', 100);
        }
      } catch (uploadError) {
        setIsUpdating(false);
        const error = uploadError instanceof Error ? uploadError : new Error("Image upload failed");
        onError?.(error, originalVehicle);
        throw error;
      }

      // Validate image result
      const imageWasProvided = !hasGalleryUpdate && (!!imageFile || (data.Image && data.Image.startsWith("data:image/")));
      const imageUploadFailed = imageWasProvided && !cloudinaryImageUrl;
      const imageUrlIsInvalid = cloudinaryImageUrl === "undefined" || 
                                cloudinaryImageUrl === "null" || 
                                (cloudinaryImageUrl && cloudinaryImageUrl.includes("/undefined"));
      const galleryHasInvalidUrl = cloudinaryImageUrls?.some(
        (imageUrl) =>
          !imageUrl ||
          imageUrl === "undefined" ||
          imageUrl === "null" ||
          imageUrl.includes("/undefined") ||
          imageUrl.startsWith("data:image/")
      );

      if (imageUploadFailed || imageUrlIsInvalid || galleryHasInvalidUrl) {
        setIsUpdating(false);
        const error = new Error(
          imageUrlIsInvalid 
            ? "Image upload returned an invalid URL. Please try uploading the image again."
            : "Image upload failed. Please check your internet connection and try again."
        );
        onError?.(error, originalVehicle);
        throw error;
      }

      // Prepare payload
      const payload: Record<string, unknown> = {
        id: vehicleId,
        category: data.Category || originalVehicle.Category,
        brand: data.Brand || originalVehicle.Brand,
        model: data.Model || originalVehicle.Model,
        year: data.Year || originalVehicle.Year,
        plate: data.Plate || originalVehicle.Plate,
        color: data.Color || originalVehicle.Color,
        condition: data.Condition || originalVehicle.Condition,
        body_type: data.BodyType || originalVehicle.BodyType,
        tax_type: data.TaxType || originalVehicle.TaxType,
        market_price: data.PriceNew || originalVehicle.PriceNew,
      };

      if (cloudinaryImageUrls) {
        payload.image_id = cloudinaryImageUrls[0] || null;
        payload.Images = cloudinaryImageUrls;
      } else if (cloudinaryImageUrl &&
          (cloudinaryImageUrl.startsWith('http://') ||
           cloudinaryImageUrl.startsWith('https://'))) {
        if (cloudinaryImageUrl.startsWith('data:image/')) {
          setIsUpdating(false);
          const error = new Error("Image upload failed: Invalid image format detected. Please try again.");
          onError?.(error, originalVehicle);
          throw error;
        }
        payload.image_id = cloudinaryImageUrl;
      } else if (data.Image === "" && originalVehicle.Image) {
        payload.image_id = null;
      }

      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      const payloadString = JSON.stringify(payload);
      if (payloadString.includes('data:image/')) {
        setIsUpdating(false);
        const error = new Error("Image upload failed: Base64 data detected in payload. Please try again.");
        onError?.(error, originalVehicle);
        throw error;
      }

      reportProgress('processing', 0);
      await delay(100);
      reportProgress('processing', 50);
      
      while (attempts < MAX_RETRY_ATTEMPTS) {
        attempts++;

        try {
          reportProgress('saving', 0);
          console.log('[🚀 SENDING PAYLOAD]:', JSON.stringify(payload, null, 2));
          console.log('[🚀 SENDING UPDATE PAYLOAD]:', {
            vehicleId,
            payloadKeys: Object.keys(payload),
            hasImage: !!payload.image_id,
            imagePreview: payload.image_id ? String(payload.image_id).substring(0, 50) : null
          });
          
          const res = await fetch(`/api/vehicles/${encodeURIComponent(vehicleId)}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            credentials: "include",
          });

          if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            const errorMessage = json.error || `HTTP ${res.status}`;
            throw new Error(`[HTTP ${res.status}] ${errorMessage} (Vehicle ID: ${vehicleId})`);
          }

          const result = await res.json();
          
          console.log('[🚀 API RESPONSE]:', {
            success: result.success,
            ok: result.ok,
            error: result.error,
            hasData: !!result.data,
            vehicleId
          });

          // ✅ FIXED: Check both success AND ok for compatibility
          if (!result.success && !result.ok) {
            console.error('[API RESPONSE ERROR]', {
              status: result.status,
              success: result.success,
              ok: result.ok,
              error: result.error,
              vehicleId,
              payloadKeys: Object.keys(payload)
            });
            const serverError = result.error || result.message || 'Unknown server error';
            throw new Error(`${serverError} (Vehicle ID: ${vehicleId})`);
          }

          reportProgress('saving', 100);
          const updatedVehicle = result.data || {
            ...originalVehicle,
            ...data,
            Image: cloudinaryImageUrls ? (cloudinaryImageUrls[0] || "") : (cloudinaryImageUrl || originalVehicle.Image),
            Images: cloudinaryImageUrls ?? originalVehicle.Images,
          };

          setTimeout(() => {
            recordMutation();
          }, 0);

          onSuccess?.(updatedVehicle);
          
          setIsUpdating(false);
          return;
          
        } catch (err) {
          lastError = err instanceof Error ? err : new Error("Failed to update vehicle");

          if (attempts < MAX_RETRY_ATTEMPTS && isRetryableError(lastError)) {
            await delay(RETRY_DELAY_MS);
            continue;
          }
          
          break;
        }
      }

      // All retries exhausted
      setIsUpdating(false);
      
      const errorMessage = lastError ? lastError.message : 'Unknown error';
      const enhancedError = new Error(
        `${errorMessage}\n\n(Attempted ${attempts} time${attempts > 1 ? 's' : ''})`
      );
      onError?.(enhancedError, originalVehicle);
      throw enhancedError;
    },
    [onSuccess, onError, onProgress]
  );

  return {
    updateVehicle,
    isUpdating,
  };
}
