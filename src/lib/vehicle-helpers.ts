/**
 * Vehicle Helper Utilities
 * Centralized functions for vehicle-related operations to avoid code duplication
 */

import { driveThumbnailUrl, extractDriveFileId } from "./drive";

/**
 * Format price for display
 */
export function formatPrice(price: string | number | null): string {
  if (!price) return "—";
  const num = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(num)) return "—";
  return `$${num.toLocaleString()}`;
}

/**
 * Check if an image ID is a Cloudinary URL
 */
export function isCloudinaryUrl(imageId: string | null): boolean {
  if (!imageId) return false;
  if (imageId === "undefined" || imageId === "null") return false;
  return imageId.includes("res.cloudinary.com");
}

function isCloudinaryPublicId(value: string): boolean {
  return /^[a-zA-Z0-9\-_/\\.]+$/.test(value) && value.includes("/");
}

function cloudinaryImageUrl(publicId: string, size?: string): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dgntrakv6";
  const sizeMatch = size?.match(/^w(\d+)-h(\d+)$/);
  const transform = sizeMatch
    ? `w_${sizeMatch[1]},h_${sizeMatch[2]},c_fill`
    : "f_auto,q_auto";

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transform}/${publicId}`;
}

/**
 * Get thumbnail URL for vehicle image
 */
export function getVehicleThumbnailUrl(imageId: string | null, size: string = "w200-h150"): string | null {
  const raw = imageId?.trim();
  if (!raw || raw === "undefined" || raw === "null") return null;
  if (isCloudinaryUrl(raw)) return raw;

  if (raw.startsWith("data:image/") || raw.startsWith("blob:")) return raw;

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const host = new URL(raw).hostname;
      const isDriveUrl = host === "drive.google.com" || host.endsWith(".googleusercontent.com");
      const driveFileId = isDriveUrl ? extractDriveFileId(raw) : null;
      return driveFileId ? driveThumbnailUrl(driveFileId, size) : raw;
    } catch {
      return raw;
    }
  }

  // Extract file ID from Google Drive URL if needed
  const fileId = extractDriveFileId(raw);
  if (!fileId && isCloudinaryPublicId(raw)) {
    return cloudinaryImageUrl(raw, size);
  }
  if (!fileId) return null;

  return driveThumbnailUrl(fileId, size);
}

/**
 * Get full-size URL for vehicle image modal
 */
export function getVehicleFullImageUrl(imageId: string | null): string | null {
  const raw = imageId?.trim();
  if (!raw || raw === "undefined" || raw === "null") return null;
  if (isCloudinaryUrl(raw)) return raw;

  if (raw.startsWith("data:image/") || raw.startsWith("blob:")) return raw;

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const host = new URL(raw).hostname;
      const isDriveUrl = host === "drive.google.com" || host.endsWith(".googleusercontent.com");
      const driveFileId = isDriveUrl ? extractDriveFileId(raw) : null;
      return driveFileId ? driveThumbnailUrl(driveFileId, "w1200-h900") : raw;
    } catch {
      return raw;
    }
  }

  // Extract file ID from Google Drive URL if needed
  const fileId = extractDriveFileId(raw);
  if (!fileId && isCloudinaryPublicId(raw)) {
    return cloudinaryImageUrl(raw, "w1200-h900");
  }
  if (!fileId) return null;

  return driveThumbnailUrl(fileId, "w1200-h900");
}

/**
 * Filter state interface for vehicle filtering
 */
export interface VehicleFilterState {
  search: string;
  category: string;
  brand: string;
  yearMin: string;
  yearMax: string;
  priceMin: string;
  priceMax: string;
  condition: string;
  color: string;
  dateFrom: string;
  dateTo: string;
  withoutImage: boolean;
}

/**
 * Default filter state
 */
export const defaultVehicleFilterState: VehicleFilterState = {
  search: "",
  category: "All",
  brand: "All",
  yearMin: "",
  yearMax: "",
  priceMin: "",
  priceMax: "",
  condition: "All",
  color: "All",
  dateFrom: "",
  dateTo: "",
  withoutImage: false,
};
