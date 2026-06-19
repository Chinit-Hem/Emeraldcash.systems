/**
 * Vehicle Helper Utilities
 * Centralized functions for vehicle-related operations to avoid code duplication
 */

import { driveThumbnailUrl, extractDriveFileId } from "@/shared/utils/drive";
import type { Vehicle } from "@/shared/types/types";

function isBlankImageValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    !normalized ||
    normalized === "undefined" ||
    normalized === "null" ||
    normalized === "base64" ||
    normalized.startsWith("base64,") ||
    /^data:image\/[^,;]+$/i.test(normalized)
  );
}

function stripOuterQuotes(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "");
}

function collectVehicleImages(value: unknown, output: string[]): void {
  if (value === null || value === undefined) return;

  if (Array.isArray(value)) {
    value.forEach((item) => collectVehicleImages(item, output));
    return;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    collectVehicleImages(
      record.url ?? record.src ?? record.image ?? record.Image ?? record.thumbnail ?? record.imageUrl,
      output
    );
    return;
  }

  const raw = stripOuterQuotes(String(value));
  if (isBlankImageValue(raw)) return;

  if (raw.startsWith("data:image/")) {
    if (raw.includes(",")) output.push(raw);
    return;
  }

  if (
    raw.startsWith("blob:") ||
    raw.startsWith("http://") ||
    raw.startsWith("https://")
  ) {
    output.push(raw);
    return;
  }

  if (
    (raw.startsWith("[") && raw.endsWith("]")) ||
    (raw.startsWith("{") && raw.endsWith("}"))
  ) {
    try {
      collectVehicleImages(JSON.parse(raw), output);
      return;
    } catch {
      // Fall through to delimiter handling for malformed imported values.
    }
  }

  raw
    .split(/[\n;|]/)
    .map(stripOuterQuotes)
    .filter((item) => !isBlankImageValue(item))
    .forEach((item) => output.push(item));
}

/**
 * Parse any supported vehicle image shape into an ordered, de-duplicated list.
 * Supports old single strings, imported arrays, JSON strings, and new galleries.
 */
export function parseVehicleImages(value: unknown): string[] {
  const collected: string[] = [];
  collectVehicleImages(value, collected);

  const seen = new Set<string>();
  return collected.filter((image) => {
    const key = image.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mergeVehicleImages(...values: unknown[]): string[] {
  return parseVehicleImages(values);
}

export function serializeVehicleImages(images: unknown): string {
  const parsed = parseVehicleImages(images);
  if (parsed.length === 0) return "";
  if (parsed.length === 1) return parsed[0];
  return JSON.stringify(parsed);
}

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
  const transform = cloudinaryTransform(size);

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transform}/${publicId}`;
}

function cloudinaryTransform(size?: string): string {
  const sizeMatch = size?.match(/^w(\d+)-h(\d+)$/);
  const resize = sizeMatch ? [`w_${sizeMatch[1]}`, `h_${sizeMatch[2]}`, "c_fill"] : [];
  return [...resize, "f_auto", "q_auto"].join(",");
}

function isCloudinaryTransformationSegment(segment: string): boolean {
  if (!segment) return false;
  if (segment.includes(",")) {
    return segment.split(",").every(isCloudinaryTransformationSegment);
  }

  return /^(?:a|ar|b|bo|br|c|co|cs|d|dl|dn|dpr|e|eo|f|fl|fn|g|h|ki|l|o|pg|q|r|so|sp|t|u|vc|vs|w|x|y|z)_/i.test(segment);
}

function cloudinaryUrlWithTransform(imageUrl: string, size?: string): string {
  try {
    const url = new URL(imageUrl);
    if (url.hostname !== "res.cloudinary.com") return imageUrl;

    const parts = url.pathname.split("/");
    const uploadIndex = parts.findIndex((part) => part === "upload");
    if (uploadIndex === -1) return imageUrl;

    const insertIndex = parts[uploadIndex + 1]?.startsWith("s--") ? uploadIndex + 2 : uploadIndex + 1;
    if (isCloudinaryTransformationSegment(parts[insertIndex])) return imageUrl;

    parts.splice(insertIndex, 0, cloudinaryTransform(size));
    url.pathname = parts.join("/");
    return url.toString();
  } catch {
    return imageUrl;
  }
}

function getCloudinaryImageIdentity(value: string): string | null {
  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    return isCloudinaryPublicId(value) ? value.replace(/^\/+/, "").toLowerCase() : null;
  }

  try {
    const url = new URL(value);
    if (url.hostname !== "res.cloudinary.com") return null;

    const parts = url.pathname.split("/").filter(Boolean);
    const uploadIndex = parts.findIndex((part) => part === "upload");
    if (uploadIndex === -1) return null;

    const publicParts = parts.slice(uploadIndex + 1);
    if (publicParts[0]?.startsWith("s--")) publicParts.shift();
    while (publicParts[0] && isCloudinaryTransformationSegment(publicParts[0])) {
      publicParts.shift();
    }
    if (publicParts[0] && /^v\d+$/i.test(publicParts[0])) {
      publicParts.shift();
    }

    const publicId = publicParts.join("/");
    return publicId ? publicId.toLowerCase() : null;
  } catch {
    return null;
  }
}

function getVehicleImageIdentity(image: string): string | null {
  const raw = image.trim();
  if (!raw) return null;

  const driveFileId = extractDriveFileId(raw);
  if (driveFileId) return `drive:${driveFileId}`;

  const cloudinaryIdentity = getCloudinaryImageIdentity(raw);
  if (cloudinaryIdentity) return `cloudinary:${cloudinaryIdentity}`;

  const resolvedUrl = getVehicleThumbnailUrl(raw, "w400-h300");
  if (!resolvedUrl) return null;
  if (resolvedUrl.startsWith("data:image/") || resolvedUrl.startsWith("blob:")) {
    return resolvedUrl;
  }

  try {
    const url = new URL(resolvedUrl);
    url.hash = "";
    return `url:${url.toString()}`;
  } catch {
    return `raw:${resolvedUrl}`;
  }
}

/**
 * Get thumbnail URL for vehicle image
 */
export function getVehicleThumbnailUrl(imageId: string | null, size: string = "w200-h150"): string | null {
  const raw = imageId?.trim();
  if (!raw || raw === "undefined" || raw === "null") return null;
  if (isCloudinaryUrl(raw)) return cloudinaryUrlWithTransform(raw, size);

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

export function getVehicleImageUrls(imageValue: unknown, size: string = "w400-h300"): string[] {
  return parseVehicleImages(imageValue)
    .map((image) => getVehicleThumbnailUrl(image, size))
    .filter((image): image is string => Boolean(image));
}

export function getVehicleImageCount(...values: unknown[]): number {
  const uniqueImages = new Set<string>();

  mergeVehicleImages(...values).forEach((image) => {
    const identity = getVehicleImageIdentity(image);
    if (identity) uniqueImages.add(identity);
  });

  return uniqueImages.size;
}

export function getVehiclePrimaryImageUrl(imageValue: unknown, size: string = "w400-h300"): string | null {
  return getVehicleImageUrls(imageValue, size)[0] ?? null;
}

type VehicleSuggestionSearchSource = Pick<
  Vehicle,
  "VehicleId" | "Category" | "Brand" | "Model" | "Year" | "Plate"
>;

function cleanVehicleSearchPart(value: string | number | null | undefined): string {
  return String(value ?? "").trim();
}

export function getVehicleSuggestionSearchText(vehicle: VehicleSuggestionSearchSource): string {
  const plate = cleanVehicleSearchPart(vehicle.Plate);
  if (plate) return plate;

  const brandModelYear = [
    vehicle.Brand,
    vehicle.Model,
    vehicle.Year,
  ]
    .map(cleanVehicleSearchPart)
    .filter(Boolean)
    .join(" ");
  if (brandModelYear) return brandModelYear;

  return [vehicle.Category, vehicle.VehicleId]
    .map(cleanVehicleSearchPart)
    .filter(Boolean)
    .join(" ");
}

/**
 * Get full-size URL for vehicle image modal
 */
export function getVehicleFullImageUrl(imageId: string | null): string | null {
  const raw = imageId?.trim();
  if (!raw || raw === "undefined" || raw === "null") return null;
  if (isCloudinaryUrl(raw)) return cloudinaryUrlWithTransform(raw, "w1200-h900");

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
