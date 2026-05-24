"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { compressImage } from "@/shared/utils/compressImage";
import { invalidateAllCaches, writeVehicleCache } from "@/systems/vms/utils/vehicleCache";
import type { Vehicle } from "@/shared/types/types";

interface UpdateVehicleData {
  VehicleId: string;
  [key: string]: string | number | boolean | null | undefined;
}

interface UseUpdateVehicleResult {
  updateVehicle: (data: UpdateVehicleData, imageFile?: File | null) => Promise<boolean>;
  isUpdating: boolean;
  error: string | null;
}

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "vehicle_uploads";

// Skip compression if file is already small enough (under 800KB)
// This prevents double compression when VehicleForm already compressed the image
const SKIP_COMPRESSION_THRESHOLD_KB = 800;

/**
 * Get Cloudinary signature from server API for signed uploads
 */
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

/**
 * Upload image using signed upload (server-generated signature)
 */
async function uploadImageToCloudinarySigned(
  file: File,
  vehicleId: string
): Promise<string> {
  const folder = "vms/vehicles";
  const publicId = `vehicle_${vehicleId}_${Date.now()}`;
  const tags = ["vms", "vehicle"];

  // Get signature from server
  const signatureData = await getCloudinarySignature(folder, publicId, tags);

  // Build Cloudinary upload URL using cloud name from server response
  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${signatureData.cloud_name}/image/upload`;
  
  // Create form data for Cloudinary SIGNED upload
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

  const response = await fetch(cloudinaryUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || 
      errorData.message || 
      `Cloudinary upload failed: ${response.status}`
    );
  }

  const result = await response.json();
  
  if (!result.secure_url) {
    throw new Error("Cloudinary response missing secure_url");
  }

  return result.secure_url;
}

/**
 * Upload image using direct unsigned upload (requires NEXT_PUBLIC_ env vars)
 */
async function uploadImageToCloudinaryDirect(
  file: File
): Promise<string> {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not configured");
  }

  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "vms/vehicles");

  const uploadRes = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!uploadRes.ok) {
    const errorData = await uploadRes.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to upload image to Cloudinary: ${uploadRes.status}`);
  }

  const uploadData = await uploadRes.json();
  return uploadData.secure_url;
}

export function useUpdateVehicle(
  onSuccess?: (updatedVehicle?: Vehicle) => void,
  onError?: (error: string) => void
): UseUpdateVehicleResult {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateVehicle = useCallback(
    async (data: UpdateVehicleData, imageFile?: File | null): Promise<boolean> => {
      setIsUpdating(true);
      setError(null);

      try {
        let cloudinaryImageUrl: string | null = null;

        // Step 1: Upload image to Cloudinary if provided
        if (imageFile) {
          console.log("[useUpdateVehicle] Uploading image to Cloudinary...");
          console.log("[useUpdateVehicle] Cloudinary config:", {
            cloudName: CLOUDINARY_CLOUD_NAME ? "SET" : "MISSING (will use signed upload)",
            uploadPreset: CLOUDINARY_UPLOAD_PRESET ? "SET" : "MISSING"
          });

          // Check if we should skip compression (file already small enough)
          const fileSizeKB = imageFile.size / 1024;
          let fileToUpload: File;
          
          if (fileSizeKB < SKIP_COMPRESSION_THRESHOLD_KB) {
            console.log(`[useUpdateVehicle] File already small (${fileSizeKB.toFixed(2)}KB < ${SKIP_COMPRESSION_THRESHOLD_KB}KB), skipping compression`);
            fileToUpload = imageFile;
          } else {
            // Compress image first
            console.log("[useUpdateVehicle] Compressing image...");
            const compressedResult = await compressImage(imageFile, {
              maxWidth: 1280,
              quality: 0.75,
              targetMinSizeKB: 250,
              targetMaxSizeKB: 800,
            });
            console.log("[useUpdateVehicle] Image compressed:", {
              originalSize: compressedResult.originalSize,
              compressedSize: compressedResult.compressedSize
            });
            fileToUpload = compressedResult.file;
          }

          // Choose upload method based on configuration
          if (CLOUDINARY_CLOUD_NAME) {
            // Use direct unsigned upload
            console.log("[useUpdateVehicle] Using direct unsigned upload");
            cloudinaryImageUrl = await uploadImageToCloudinaryDirect(fileToUpload);
          } else {
            // Use signed upload via server API
            console.log("[useUpdateVehicle] Using signed upload via server API");
            cloudinaryImageUrl = await uploadImageToCloudinarySigned(fileToUpload, data.VehicleId);
          }
          
          console.log("[useUpdateVehicle] Image uploaded to Cloudinary:", {
            url: cloudinaryImageUrl?.substring(0, 100) + "..."
          });
        }

        // Step 2: Prepare JSON payload with Cloudinary URL
        const headers: Record<string, string> = {
          "Content-Type": "application/json"
        };

        // Map capitalized keys to lowercase for API compatibility
        const keyMapping: Record<string, string> = {
          "VehicleId": "id",
          "Category": "category",
          "Brand": "brand",
          "Model": "model",
          "Year": "year",
          "Plate": "plate",
          "Color": "color",
          "Condition": "condition",
          "BodyType": "body_type",
          "TaxType": "tax_type",
          "PriceNew": "market_price",
          "Image": "image_id",
        };

        // Build mapped data
        const mappedData: Record<string, unknown> = {};
        Object.entries(data).forEach(([key, value]) => {
          if (value != null && key !== "Image") { // Exclude Image, we'll add image_id separately
            const mappedKey = keyMapping[key] || key.toLowerCase();
            mappedData[mappedKey] = value;
          }
        });

        // Add the Cloudinary image URL if we have one
        if (cloudinaryImageUrl) {
          mappedData.image_id = cloudinaryImageUrl;
        }

        const body = JSON.stringify(mappedData);
        console.log("[useUpdateVehicle] Sending update to API:", {
          hasImage: !!cloudinaryImageUrl,
          imageUrl: cloudinaryImageUrl?.substring(0, 100) + "..."
        });

        const res = await fetch(`/api/vehicles/${encodeURIComponent(data.VehicleId)}`, {
          method: "PUT",
          headers,
          body,
          credentials: "include",
        });

        if (res.status === 401) {
          router.push("/login?redirect=" + encodeURIComponent(window.location.pathname));
          return false;
        }

        const json = await res.json().catch(() => ({}));
        
        if (res.status === 403) {
          throw new Error("You don't have permission to update this vehicle");
        }
        
        if (!res.ok || json.ok === false) {
          // Add HTTP status prefix for retry logic detection
          const error = new Error(`[HTTP ${res.status}] ${json.error || "Failed to save vehicle"}`);
          (error as Error & { statusCode: number }).statusCode = res.status;
          throw error;
        }

        // Get the updated vehicle data from the response (includes new image URL)
        const updatedVehicle = json.data as Vehicle;
        console.log("[useUpdateVehicle] Updated vehicle received:", {
          vehicleId: updatedVehicle.VehicleId,
          imageUrl: updatedVehicle.Image?.substring(0, 100) + "..."
        });
        
        // Update local cache immediately with the new data
        try {
          const cached = localStorage.getItem("vms-vehicles");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              const index = parsed.findIndex((v: Vehicle) => v.VehicleId === data.VehicleId);
              if (index >= 0) {
                // Use the server-returned data which includes the new image URL
                parsed[index] = updatedVehicle;
                writeVehicleCache(parsed);
                console.log("[useUpdateVehicle] Cache updated with new image URL");
              }
            }
          }
        } catch (e) {
          console.error("[useUpdateVehicle] Cache update error:", e);
        }

        // Invalidate all caches to ensure vehicle list is updated across all components
        invalidateAllCaches();

        // Pass the updated vehicle to the success callback so the UI can show the new image immediately
        onSuccess?.(updatedVehicle);
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to save vehicle";
        setError(errorMessage);
        onError?.(errorMessage);
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [router, onSuccess, onError]
  );

  return {
    updateVehicle,
    isUpdating,
    error,
  };
}
