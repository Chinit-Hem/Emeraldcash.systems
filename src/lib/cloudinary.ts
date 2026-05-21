// LAZY IMPORT: Only load Cloudinary SDK when needed
// This saves ~2-3MB of memory per function instance
let cloudinaryInstance: typeof import("cloudinary").v2 | null = null;
import type { UploadApiResponse } from "cloudinary";

// Import folder utilities
import { getCloudinaryFolder } from "./cloudinary-folders";

// Import crypto at top level for signature generation
import crypto from "node:crypto";

// Environment variables
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Check if Cloudinary is configured
const isCloudinaryConfigured = !!(
  CLOUDINARY_CLOUD_NAME &&
  CLOUDINARY_API_KEY &&
  CLOUDINARY_API_SECRET
);

// Log configuration status for debugging
if (typeof window === 'undefined') {
  // Server-side only
  console.log('[Cloudinary] Configuration check:', {
    cloudName: CLOUDINARY_CLOUD_NAME ? 'SET' : 'NOT_SET',
    apiKey: CLOUDINARY_API_KEY ? 'SET' : 'NOT_SET',
    apiSecret: CLOUDINARY_API_SECRET ? 'SET' : 'NOT_SET',
    isConfigured: isCloudinaryConfigured,
  });
}

/**
 * Lazy load Cloudinary SDK - only initializes when first accessed
 * Saves memory by not loading the full SDK for functions that don't use it
 */
async function getCloudinary(): Promise<typeof import("cloudinary").v2> {
  if (!cloudinaryInstance) {
    const { v2: cloudinary } = await import("cloudinary");

    if (isCloudinaryConfigured) {
      cloudinary.config({
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key: CLOUDINARY_API_KEY,
        api_secret: CLOUDINARY_API_SECRET,
        secure: true,
        timeout: 120000,
      });

      // SDK loaded successfully
    }

    cloudinaryInstance = cloudinary;
  }

  return cloudinaryInstance;
}

// Export getter for lazy access
export { getCloudinary };

// Backward compatibility - warns about eager import
export const cloudinary = new Proxy({} as typeof import("cloudinary").v2, {
  get: () => {
    throw new Error("Cloudinary SDK must be loaded lazily using getCloudinary(). Eager imports are deprecated for memory optimization.");
  }
});

// Default upload preset for unsigned uploads
const _DEFAULT_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || "vms_unsigned";

// Helper function to check if an error is transient (retryable)
function isTransientError(error: Error): boolean {
  const message = error.message.toLowerCase();
  const httpCode = (error as Error & { http_code?: number }).http_code;

  // Check for transient error indicators
  const isTimeout = message.includes("timeout") || message.includes("etimedout");
  const isNetworkError = message.includes("econnreset") ||
                         message.includes("econnrefused") ||
                         message.includes("socket hang up") ||
                         message.includes("network");
  const isServerError = httpCode === 502 || httpCode === 503 || httpCode === 504;
  const isRateLimit = httpCode === 429;

  return isTimeout || isNetworkError || isServerError || isRateLimit;
}

// Helper function to delay with exponential backoff
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a unique ID for Cloudinary public_id
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

// Compress image before upload to reduce size and upload time
async function compressImageForUpload(
  imageData: File | Blob,
  maxWidth = 1280,
  quality = 0.8,
  compress = true
): Promise<Buffer> {
  try {
    const arrayBuffer = await imageData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (!compress) return buffer;

    const sharp = await import('sharp').catch(() => null);
    if (!sharp) return buffer;

    // Process with sharp
    return await sharp.default(buffer)
      .resize(maxWidth, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .webp({ // Prioritize WebP for better compression
        quality: Math.round(quality * 100),
      })
      .toBuffer();
  } catch (_error) {
    const arrayBuffer = await imageData.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

// Upload image to Cloudinary with automatic folder selection
// Supports both base64 data URLs and File/Blob objects
export async function uploadImage(
  imageData: string | File | Blob,
  options: {
    folder?: string;
    publicId?: string;
    tags?: string[];
    transformation?: object;
    category?: string; // Vehicle category for automatic folder selection
    timeout?: number; // Timeout in milliseconds (default: 15000ms = 15s for faster processing)
    uploadPreset?: string; // Optional upload preset for unsigned uploads
    retryAttempts?: number; // Number of retry attempts for transient errors (default: 2)
    retryDelay?: number; // Initial retry delay in ms (default: 500)
    compress?: boolean; // Whether to compress image before upload (default: true)
    maxWidth?: number; // Max width for compression (default: 1280)
    quality?: number; // JPEG quality for compression (default: 0.8)
  } = {}
): Promise<{
  success: boolean;
  url?: string;
  publicId?: string;
  folder?: string;
  error?: string;
  cloudinaryResponse?: unknown; // Full Cloudinary response for debugging
  attempts?: number; // Number of attempts made
  compressed?: boolean; // Whether compression was applied
  originalSize?: number; // Original size in bytes
  compressedSize?: number; // Compressed size in bytes
}> {
  console.log("[Cloudinary] uploadImage called, checking configuration...");
  console.log("[Cloudinary] CLOUDINARY_CLOUD_NAME:", CLOUDINARY_CLOUD_NAME ? "SET" : "NOT SET");
  console.log("[Cloudinary] CLOUDINARY_API_KEY:", CLOUDINARY_API_KEY ? "SET" : "NOT SET");
  console.log("[Cloudinary] CLOUDINARY_API_SECRET:", CLOUDINARY_API_SECRET ? "SET" : "NOT SET");
  console.log("[Cloudinary] isCloudinaryConfigured:", isCloudinaryConfigured);

  if (!isCloudinaryConfigured) {
    console.error("[Cloudinary] Not configured - missing environment variables");
    return {
      success: false,
      error: "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.",
      attempts: 0,
    };
  }

  // Set retry configuration
  const maxRetries = options.retryAttempts ?? 3;
  const initialRetryDelay = options.retryDelay ?? 1000;
  const timeoutMs = options.timeout || 30000;

  let lastError: Error | null = null;
  let attempts = 0;

  // Retry loop
  while (attempts < maxRetries) {
    attempts++;
    const attemptStartTime = Date.now();

    // Upload attempt started

    try {
      // Determine folder based on category or use provided folder
      let targetFolder = options.folder;
      if (options.category && !options.folder) {
        targetFolder = getCloudinaryFolder(options.category); // Use category to determine folder
      }

      // Build upload options with timeout
      const uploadOptions = {
        folder: targetFolder || "vehicles",
        resource_type: "image" as const,
        timeout: timeoutMs,
      } as { // Explicitly define type for uploadOptions
        folder: string;
        resource_type: "image"; // Removed public_id from here
        public_id?: string; // Added public_id here
        tags?: string[];
        transformation?: object;
        timeout?: number;
        upload_preset?: string;
      };

      // Generate a unique public_id if not provided
      if (options.publicId) {
        uploadOptions.public_id = options.publicId;
      } else {
        uploadOptions.public_id = `${uploadOptions.folder}/${generateUUID()}`;
      }

      if (options.tags) {
        uploadOptions.tags = options.tags;
      }

      if (options.transformation) {
        uploadOptions.transformation = options.transformation;
      }

      // Add upload_preset for unsigned uploads only if explicitly provided
      // Note: upload_preset must be configured in Cloudinary dashboard for unsigned uploads
      // If not provided, we'll use signed uploads with API credentials
      const uploadPreset = options.uploadPreset;
      if (uploadPreset) {
        uploadOptions.upload_preset = uploadPreset;
        console.log(`[Cloudinary] Using upload_preset: ${uploadPreset} (unsigned upload)`);
      } else {
        console.log('[Cloudinary] Using signed upload with API credentials');
      }

      let result: UploadApiResponse;
      let originalSize = 0;
      let compressedSize = 0;
      let wasCompressed = false;

      // Get Cloudinary instance
      const cloudinary = await getCloudinary();

      // Handle File/Blob objects directly (preferred method)
      if (imageData instanceof File || imageData instanceof Blob) {
        // Check file size before uploading
        const fileSize = imageData.size;
        const maxSize = 10 * 1024 * 1024; // 10MB limit

        if (fileSize > maxSize) {
          return {
            success: false,
            error: `File size (${(fileSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (10MB). Please compress the image or use a smaller file.`,
            attempts,
          };
        }

        // Use Cloudinary SDK upload_stream to avoid base64 conversion memory spike
        const buffer = await compressImageForUpload(
          imageData,
          options.maxWidth || 1280,
          options.quality || 0.8,
          options.compress !== false
        );

        originalSize = fileSize;
        compressedSize = buffer.length;
        wasCompressed = compressedSize < originalSize;

        result = await Promise.race<UploadApiResponse>([
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              uploadOptions,
              (error, uploadResult) => {
                if (error) return reject(error);
                if (!uploadResult) return reject(new Error("Cloudinary upload returned no result"));
                resolve(uploadResult);
              }
            );
            stream.end(buffer);
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Upload timeout after ${timeoutMs}ms`)), timeoutMs)
          )
        ]);
      } else {
        // Handle base64 string (legacy method) with timeout
        // Check base64 data size
        const base64Size = imageData.length * 0.75; // Approximate size in bytes
        const maxBase64Size = 10 * 1024 * 1024; // 10MB limit

        if (base64Size > maxBase64Size) {
          return {
            success: false,
            error: `Base64 image data size (${(base64Size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (10MB). Please use a smaller image.`,
            attempts,
          };
        }

        result = await Promise.race<UploadApiResponse>([
          cloudinary.uploader.upload(imageData, uploadOptions),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Upload timeout after ${timeoutMs}ms`)), timeoutMs)
          )
        ]);
      }

      // Ensure we return the secure_url from Cloudinary
      const secureUrl = result.secure_url;
      if (!secureUrl) {
        console.error("Cloudinary upload succeeded but no secure_url returned:", result);
        return {
          success: false,
          error: "Upload succeeded but no secure_url was returned from Cloudinary",
          attempts,
        };
      }

      return {
        success: true,
        url: secureUrl,
        publicId: result.public_id,
        folder: targetFolder,
        attempts,
        compressed: wasCompressed,
        originalSize,
        compressedSize,
      };
    } catch (_error) {
      const _attemptDuration = Date.now() - attemptStartTime;

      // Properly extract error message from various error types
      let errorMessage: string;
      if (_error instanceof Error) {
        errorMessage = _error.message;
      } else if (typeof _error === 'object' && _error !== null) {
        // Handle Cloudinary error objects that may have nested error properties
        const cloudinaryError = _error as {
          message?: string;
          error?: { message?: string };
          json?: { error?: { message?: string } };
        };
        errorMessage = cloudinaryError.message
          || cloudinaryError.error?.message
          || cloudinaryError.json?.error?.message
          || JSON.stringify(_error);
      } else {
        errorMessage = String(_error);
      }

      lastError = new Error(errorMessage);

      // Copy over any Cloudinary-specific properties
      if (typeof _error === 'object' && _error !== null) {
        const cloudinaryError = _error as { http_code?: number; error_code?: string };
        (lastError as Error & { http_code?: number }).http_code = cloudinaryError.http_code;
        (lastError as Error & { error_code?: string }).error_code = cloudinaryError.error_code;
      }

      // Log error for debugging
      console.error(`[Cloudinary] Upload attempt ${attempts} failed:`, lastError.message);

      // Check if this is a transient error that we should retry
      if (attempts < maxRetries && isTransientError(lastError)) {
        const retryDelayMs = initialRetryDelay * Math.pow(2, attempts - 1); // Exponential backoff
        await delay(retryDelayMs);
        continue;
      }

      // Not a transient error or no more retries - break and return error
      break;
    }
  }

  // All retries exhausted or non-transient error - return detailed error
  console.error(`[Cloudinary] All ${attempts} attempts failed. Last error:`, lastError);

  // Extract detailed error information
  let errorMessage = "Upload failed";
  let errorCode = "";
  let errorDetails = "";

  if (lastError) {
    errorMessage = lastError.message;

    // Try to extract Cloudinary-specific error details
    const cloudinaryError = lastError as Error & {
      http_code?: number;
      error?: { message?: string; code?: string };
      json?: { error?: { message?: string; code?: string } };
    };

    if (cloudinaryError.http_code) {
      errorCode = `HTTP ${cloudinaryError.http_code}`;
    }

    if (cloudinaryError.error?.message) {
      errorDetails = cloudinaryError.error.message;
    } else if (cloudinaryError.json?.error?.message) {
      errorDetails = cloudinaryError.json.error.message;
    }

    // Log full error structure for debugging
    console.error("[Cloudinary] Full error structure:", {
      message: lastError.message,
      name: lastError.name,
      http_code: cloudinaryError.http_code,
      error_code: cloudinaryError.error?.code,
      error_details: errorDetails,
    });
  }

  // Build detailed error message
  let detailedError = errorMessage;
  if (errorCode) {
    detailedError = `[${errorCode}] ${detailedError}`;
  }
  if (errorDetails && errorDetails !== errorMessage) {
    detailedError = `${detailedError} - ${errorDetails}`;
  }

  // Provide helpful guidance for specific error types
  if (errorMessage.includes("401") || errorMessage.includes("Invalid api_key") || errorCode === "HTTP 401") {
    return {
      success: false,
      error: `Cloudinary 401 Error: Invalid API credentials.

Please verify your Cloudinary credentials:
1. Log in to https://cloudinary.com/console
2. Go to Dashboard → Account Details
3. Copy the correct values for:
   - CLOUDINARY_CLOUD_NAME
   - CLOUDINARY_API_KEY
   - CLOUDINARY_API_SECRET

4. Update your .env.local file:
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

Original error: ${detailedError}`,
      attempts,
    };
  }

  if (errorMessage.includes("413") || errorCode === "HTTP 413" || errorMessage.includes("File size too large")) {
    return {
      success: false,
      error: `Image file is too large for Cloudinary upload. Please try:
1. Use a smaller image (max 10MB recommended)
2. Compress the image before uploading
3. Use a lower resolution image

Original error: ${detailedError}`,
      attempts,
    };
  }

  if (errorMessage.includes("400") || errorCode === "HTTP 400") {
    return {
      success: false,
      error: `Invalid image format or corrupted file. Please try:
1. Use a different image file (JPG, PNG, WebP recommended)
2. Check if the image opens correctly on your device
3. Try converting the image to a different format

Original error: ${detailedError}`,
      attempts,
    };
  }

  return {
    success: false,
    error: detailedError,
    attempts,
  };
}


function isCloudinaryTransformationSegment(segment: string): boolean {
  if (!segment) return false;
  if (segment.includes(",")) {
    return segment.split(",").every(isCloudinaryTransformationSegment);
  }

  return /^(?:a|ar|b|bo|br|c|co|cs|d|dl|dn|dpr|e|eo|f|fl|fn|g|h|ki|l|o|pg|q|r|so|sp|t|u|vc|vs|w|x|y|z)_/i.test(segment);
}

function stripImageExtension(publicId: string): string {
  return publicId.replace(/\.(?:avif|bmp|gif|jpe?g|png|svg|tiff?|webp)$/i, "");
}

/**
 * Extract a Cloudinary public_id from either a stored public_id or a delivery URL.
 * Returns null for Google Drive, data/blob URLs, and non-Cloudinary images.
 */
export function extractCloudinaryPublicId(imageValue: string | null | undefined): string | null {
  if (!imageValue || typeof imageValue !== "string") return null;

  const trimmed = imageValue.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return null;

  if (isCloudinaryPublicId(trimmed)) {
    return stripImageExtension(trimmed);
  }

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname !== "res.cloudinary.com") return null;

    const parts = url.pathname.split("/").filter(Boolean);
    const uploadIndex = parts.findIndex((part) => part === "upload");
    if (uploadIndex === -1) return null;

    const publicIdParts = parts.slice(uploadIndex + 1);
    while (
      publicIdParts.length > 0 &&
      (/^v\d+$/i.test(publicIdParts[0]) || isCloudinaryTransformationSegment(publicIdParts[0]))
    ) {
      publicIdParts.shift();
    }

    if (publicIdParts.length === 0) return null;

    const decodedPublicId = decodeURIComponent(publicIdParts.join("/"));
    return stripImageExtension(decodedPublicId);
  } catch {
    return null;
  }
}

// Delete image from Cloudinary
export async function deleteImage(publicId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isCloudinaryConfigured) {
    return {
      success: false,
      error: "Cloudinary is not configured. Set CLOUDINARY_URL environment variable.",
    };
  }

  try {
    const cloudinary = await getCloudinary();
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === "ok" || result.result === "not found") {
      return { success: true };
    } else {
      return {
        success: false,
        error: `Delete failed: ${result.result}`,
      };
    }
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Delete failed",
    };
  }
}


// Get optimized image URL
export async function getOptimizedImageUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: number;
    format?: string;
  } = {}
): Promise<string> {
  if (!isCloudinaryConfigured) {
    return "";
  }

  interface TransformationOptions {
    width?: number;
    height?: number;
    crop?: string;
    quality?: number;
    fetch_format?: string;
  }

  const transformation: TransformationOptions = {};

  if (options.width) transformation.width = options.width;
  if (options.height) transformation.height = options.height;
  if (options.crop) transformation.crop = options.crop;
  if (options.quality) transformation.quality = options.quality;
  if (options.format) transformation.fetch_format = options.format;

  const cloudinary = await getCloudinary();
  return cloudinary.url(publicId, {
    transformation: Object.keys(transformation).length > 0 ? transformation : undefined,
    secure: true,
    sdk_semver: "2.0.0", // Required by Cloudinary SDK
  });
}


// Test Cloudinary connection
export async function testCloudinaryConnection(): Promise<{
  success: boolean;
  message: string;
}> {
  if (!isCloudinaryConfigured) {
    return {
      success: false,
      message: "Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.",
    };
  }

  try {
    const cloudinary = await getCloudinary();
    const _result = await cloudinary.api.ping();
    return {
      success: true,
      message: `Cloudinary connected successfully. Cloud: ${CLOUDINARY_CLOUD_NAME}`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Connection failed";

    // Provide helpful guidance for 401 errors
    if (errorMessage.includes("401") || errorMessage.includes("Invalid api_key")) {
      return {
        success: false,
        message: `Cloudinary 401 Error: Invalid API credentials.

Please verify your Cloudinary credentials:
1. Log in to https://cloudinary.com/console
2. Go to Dashboard → Account Details
3. Copy the correct values:
   - Cloud Name: ${CLOUDINARY_CLOUD_NAME || "NOT SET"}
   - API Key: ${CLOUDINARY_API_KEY ? "****" + CLOUDINARY_API_KEY.slice(-4) : "NOT SET"}
   - API Secret: ${CLOUDINARY_API_SECRET ? "****" + CLOUDINARY_API_SECRET.slice(-4) : "NOT SET"}

4. Update your .env.local file with the correct credentials:
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

Original error: ${errorMessage}`,
      };
    }

    return {
      success: false,
      message: errorMessage,
    };
  }
}


// Re-export folder utilities (already imported at top)

// Default placeholder image URL for when image identifier is invalid
// Using a standard Cloudinary placeholder image
const DEFAULT_PLACEHOLDER_URL = "https://res.cloudinary.com/demo/image/upload/w_400,h_300,c_fill/placeholder.jpg";

/**
 * Check if a value is a Cloudinary public_id (not a full URL)
 * Public IDs are alphanumeric strings with underscores, hyphens, and sometimes slashes for folders
 * They don't start with http:// or https://
 */
export function isCloudinaryPublicId(value: string): boolean {
  if (!value || typeof value !== "string") return false;

  // If it starts with http:// or https://, it's already a URL
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return false;
  }

  // If it starts with data:, it's a data URL
  if (value.startsWith("data:")) {
    return false;
  }

  // If it contains drive.google.com or googleusercontent.com, it's a Google Drive URL
  if (value.includes("drive.google.com") || value.includes("googleusercontent.com")) {
    return false;
  }

  // Google Drive file IDs are typically 33 characters, alphanumeric only
  // They look like: 1v5AFTWvBIzJa5ijhGPzJKedNj_5Sqcky
  // Exclude these by checking length and pattern
  if (value.length === 33 && /^[a-zA-Z0-9_-]{33}$/.test(value)) {
    return false;
  }

  // Also exclude shorter alphanumeric strings that look like Drive IDs
  // Drive IDs are usually 25-44 characters of alphanumeric + underscore + hyphen
  if (value.length >= 25 && value.length <= 44 && /^[a-zA-Z0-9_-]+$/.test(value)) {
    // This looks like a Google Drive ID, not a Cloudinary public_id
    return false;
  }

  // Cloudinary public_ids typically:
  // - May contain folder paths with slashes (e.g., "vehicles/cars/car_123")
  // - Often have descriptive names with underscores
  // - Can be various lengths but usually don't look like random Drive IDs
  const publicIdPattern = /^[a-zA-Z0-9_\-]+(\/[a-zA-Z0-9_\-]+)*$/;
  return publicIdPattern.test(value);
}

/**
 * Convert a Cloudinary public_id to a full Cloudinary URL
 * Uses the configured cloud name from environment variables
 */
export async function getCloudinaryUrlFromPublicId(
  publicId: string | null | undefined,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: number;
    format?: string;
  } = {}
): Promise<string> {
  // Defensive check: if publicId is null, undefined, or empty string, return placeholder
  if (!publicId || typeof publicId !== "string" || publicId.trim() === "") {
    return DEFAULT_PLACEHOLDER_URL;
  }

  // Check for the literal string "undefined" or "null"
  if (publicId === "undefined" || publicId === "null") {
    return DEFAULT_PLACEHOLDER_URL;
  }

  if (!isCloudinaryPublicId(publicId)) {
    // If it's not a public_id, return as-is (might already be a URL)
    return publicId;
  }

  if (!isCloudinaryConfigured || !CLOUDINARY_CLOUD_NAME) {
    return DEFAULT_PLACEHOLDER_URL;
  }

  interface TransformationOptions {
    width?: number;
    height?: number;
    crop?: string;
    quality?: number;
    fetch_format?: string;
  }

  const transformation: TransformationOptions = {};

  if (options.width) transformation.width = options.width;
  if (options.height) transformation.height = options.height;
  if (options.crop) transformation.crop = options.crop;
  if (options.quality) transformation.quality = options.quality;
  if (options.format) transformation.fetch_format = options.format;

  const cloudinary = await getCloudinary();
  return cloudinary.url(publicId, {
    transformation: Object.keys(transformation).length > 0 ? transformation : undefined,
    secure: true,
    sdk_semver: "2.0.0", // Required by Cloudinary SDK
  });
}

/**
 * Check if a value looks like a Google Drive file ID
 * Google Drive IDs are typically 25-44 characters of alphanumeric + underscore + hyphen
 */
function isGoogleDriveId(value: string): boolean {
  if (!value || typeof value !== "string") return false;

  // Google Drive file IDs are typically 25-44 characters
  // They look like: 1v5AFTWvBIzJa5ijhGPzJKedNj_5Sqcky
  if (value.length >= 25 && value.length <= 44 && /^[a-zA-Z0-9_-]+$/.test(value)) {
    return true;
  }

  return false;
}

/**
 * Get Google Drive thumbnail URL from file ID
 */
function getGoogleDriveThumbnailUrl(fileId: string, size = "w400-h400"): string {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=${encodeURIComponent(size)}`;
}

/**
 * Normalize an image identifier to a valid URL
 * - If it's already a valid URL (http/https/data), return as-is
 * - If it's a Cloudinary public_id, convert to full URL
 * - If it's a Google Drive ID, convert to thumbnail URL
 * - If it's empty/invalid, return empty string
 */
export async function normalizeImageUrl(imageId: string | null | undefined): Promise<string> {
  if (!imageId || typeof imageId !== "string") {
    return "";
  }

  const trimmed = imageId.trim();
  if (!trimmed) {
    return "";
  }

  // If it's already a valid URL, return as-is
  if (trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("data:")) {
    return trimmed;
  }

  // If it's a Cloudinary public_id, convert to URL
  if (isCloudinaryPublicId(trimmed)) {
    return await getCloudinaryUrlFromPublicId(trimmed);
  }

  // If it looks like a Google Drive ID, convert to thumbnail URL
  if (isGoogleDriveId(trimmed)) {
    return getGoogleDriveThumbnailUrl(trimmed);
  }

  // Unknown format, return as-is (might be a relative path or other identifier)
  return trimmed;
}
