/**
 * Image Upload API Route
 *
 * Handles image uploads to Cloudinary for vehicle images.
 * Supports multipart/form-data uploads.
 *
 * @module api/upload
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { uploadImage } from "@/lib/cloudinary";
import { requirePermission } from "@/lib/auth-helpers";
import { generateUUID } from "@/shared/utils/uuid";
import { NextRequest, NextResponse } from "next/server";
import { Buffer } from "node:buffer";

// ============================================================================
// Types
// ============================================================================

interface UploadResponse {
  ok: boolean;
  data?: {
    url: string;
    publicId: string;
  };
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

const BASE64_DATA_URL_PREFIX = "data:";
const REMOTE_IMAGE_PROTOCOLS = new Set(["http:", "https:"]);
const SAFE_VEHICLE_UPLOAD_ID_PATTERN = /^\d{1,18}$/;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse multipart form data from request
 */
async function parseFormData(request: NextRequest): Promise<{
  file: File | null;
  base64Image: string | null;
  vehicleId: string | null;
  category: string | null;
  error?: string;
}> {
  try {
    // First try multipart form-data
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();

      const file = formData.get("file") as File | null || formData.get("image") as File | null;
      const vehicleId = formData.get("vehicleId") as string | null;
      const category = formData.get("category") as string | null;

      return { file, base64Image: null, vehicleId, category };
    }

    // Fallback: JSON with base64 data URL or remote image URL.
    const jsonBody = await request.json();

    const base64Image = (jsonBody.file || jsonBody.image || jsonBody.imageUrl || '').toString().trim();
    const vehicleId = (jsonBody.vehicleId || jsonBody.vehicle_id || '').toString() || null;
    const category = (jsonBody.category || '').toString() || null;

    return { file: null, base64Image, vehicleId, category };
  } catch (error) {
    return {
      file: null,
      base64Image: null,
      vehicleId: null,
      category: null,
      error: error instanceof Error ? error.message : "Failed to parse form data",
    };
  }
}

/**
 * Convert base64 data URL into a File so it can use the same upload path
 * as multipart uploads (more stable than Cloudinary SDK data-url uploads).
 */
function dataUrlToFile(
  dataUrl: string,
  fallbackName: string
): { file: File | null; error?: string } {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith(BASE64_DATA_URL_PREFIX)) {
    return { file: null, error: "Invalid image format. Expected a base64 data URL." };
  }

  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex < 0) {
    return { file: null, error: "Invalid image data URL format." };
  }

  const header = dataUrl.slice(0, commaIndex);
  const base64Payload = dataUrl.slice(commaIndex + 1).trim();
  const mimeMatch = header.match(/^data:([^;]+);base64$/i);
  const mimeType = mimeMatch?.[1]?.toLowerCase() || "";

  if (!mimeType) {
    return { file: null, error: "Missing MIME type in base64 image data." };
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      file: null,
      error: `Invalid file type: ${mimeType}. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
    };
  }

  try {
    const buffer = Buffer.from(base64Payload, "base64");
    if (!buffer.length) {
      return { file: null, error: "Empty base64 image payload." };
    }

    const extension = mimeType.split("/")[1] || "jpg";
    const normalizedExtension = extension === "jpeg" ? "jpg" : extension;
    const file = new File([buffer], `${fallbackName}.${normalizedExtension}`, { type: mimeType });
    return { file };
  } catch (error) {
    return {
      file: null,
      error: error instanceof Error ? error.message : "Failed to decode base64 image data",
    };
  }
}

function normalizeVehicleUploadId(vehicleId: string | null): { value: string | null; error?: string } {
  const trimmed = vehicleId?.trim();
  if (!trimmed) return { value: null };
  if (!SAFE_VEHICLE_UPLOAD_ID_PATTERN.test(trimmed)) {
    return { value: null, error: "Invalid vehicleId. Expected a numeric vehicle ID." };
  }
  return { value: trimmed };
}

function isValidRemoteImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return REMOTE_IMAGE_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate uploaded file
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (10MB)`,
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
    };
  }

  return { valid: true };
}

// ============================================================================
// API Handlers
// ============================================================================

/**
 * POST /api/upload
 * Upload an image to Cloudinary
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = requirePermission(request, "vehicles:create");
  if (auth.response) return auth.response;

  const requestId = generateUUID();
  const startTime = Date.now();

  try {
    // Parse form data
    const { file, base64Image, vehicleId, category, error: parseError } = await parseFormData(request);

    if (parseError) {
      return NextResponse.json(
        { ok: false, error: parseError },
        { status: 400 }
      );
    }

    const { value: safeVehicleId, error: vehicleIdError } = normalizeVehicleUploadId(vehicleId);
    if (vehicleIdError) {
      return NextResponse.json(
        { ok: false, error: vehicleIdError },
        { status: 400 }
      );
    }

    const imageData = file || base64Image;
    if (!imageData) {
      return NextResponse.json(
        { ok: false, error: "No image file or base64 data provided" },
        { status: 400 }
      );
    }

    let uploadResult;
    if (typeof imageData === 'string') {
      if (imageData.startsWith(BASE64_DATA_URL_PREFIX)) {
        // Base64 data URL upload (convert to File for stable upload path)
        const base64FileName = vehicleId ? `vehicle_${vehicleId}` : `vehicle_${Date.now()}`;
        const { file: fileFromDataUrl, error: dataUrlError } = dataUrlToFile(imageData, base64FileName);
        if (dataUrlError || !fileFromDataUrl) {
          return NextResponse.json(
            { ok: false, error: dataUrlError || "Invalid base64 image data" },
            { status: 400 }
          );
        }

        const validation = validateFile(fileFromDataUrl);
        if (!validation.valid) {
          return NextResponse.json(
            { ok: false, error: validation.error },
            { status: 400 }
          );
        }

        uploadResult = await uploadImage(fileFromDataUrl, {
          category: category || "vehicles",
          publicId: safeVehicleId ? `vehicle_${safeVehicleId}` : undefined,
          timeout: 120000,
          retryAttempts: 2,
          retryDelay: 1000,
          compress: true,
          maxWidth: 1280,
          quality: 0.8,
        });
      } else {
        if (!isValidRemoteImageUrl(imageData)) {
          return NextResponse.json(
            { ok: false, error: "Invalid image URL. Expected http(s) URL or base64 image data." },
            { status: 400 }
          );
        }

        uploadResult = await uploadImage(imageData, {
          category: category || "vehicles",
          publicId: safeVehicleId ? `vehicle_${safeVehicleId}` : undefined,
          timeout: 120000,
          retryAttempts: 2,
          retryDelay: 1000,
          compress: false,
        });
      }
    } else {
      // File upload
      // Validate file
      const validation = validateFile(file!);
      if (!validation.valid) {
        return NextResponse.json(
          { ok: false, error: validation.error },
          { status: 400 }
        );
      }

      uploadResult = await uploadImage(file!, {
        category: category || "vehicles",
        publicId: safeVehicleId ? `vehicle_${safeVehicleId}` : undefined,
        timeout: 120000,
        retryAttempts: 2,
        retryDelay: 1000,
        compress: true,
        maxWidth: 1280,
        quality: 0.8,
      });
    }

    if (!uploadResult.success) {
      return NextResponse.json(
        { ok: false, error: uploadResult.error || "Upload failed" },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;

    return NextResponse.json(
      {
        ok: true,
        data: {
          url: uploadResult.url!,
          publicId: uploadResult.publicId!,
        },
      },
      {
        status: 200,
        headers: {
          "X-Request-ID": requestId,
          "X-Response-Time": `${duration}ms`,
        },
      }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Log detailed error information
    console.error("[Upload API] Error:", {
      message: errorMessage,
      error: error,
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
      duration: `${duration}ms`,
    });

    // Provide more helpful error messages based on error type
    let userErrorMessage = errorMessage;

    if (errorMessage.includes("signature") || errorMessage.includes("401")) {
      userErrorMessage = "Cloudinary authentication failed. Please check your API credentials configuration.";
    } else if (errorMessage.includes("timeout")) {
      userErrorMessage = "Upload timed out. Please try again with a smaller image or check your connection.";
    } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      userErrorMessage = "Network error. Please check your internet connection and try again.";
    }

    return NextResponse.json(
      {
        ok: false,
        error: userErrorMessage,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        requestId,
      },
      {
        status: 500,
        headers: {
          "X-Request-ID": requestId,
          "X-Response-Time": `${duration}ms`,
        },
      }
    );
  }
}

/**
 * GET /api/upload
 * Health check endpoint with Cloudinary configuration status
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = requirePermission(request, "vehicles:view");
  if (auth.response) return auth.response;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || "vms_unsigned";

  const isConfigured = !!(cloudName && apiKey && apiSecret);

  // Test Cloudinary connection if configured
  let connectionTest = null;
  if (isConfigured) {
    try {
      const { testCloudinaryConnection } = await import("@/lib/cloudinary");
      connectionTest = await testCloudinaryConnection();
    } catch (error) {
      connectionTest = {
        success: false,
        message: error instanceof Error ? error.message : "Connection test failed",
      };
    }
  }

  return NextResponse.json(
    {
      ok: true,
      message: "Upload API is running",
      cloudinary: {
        configured: isConfigured,
        cloudName: cloudName || "NOT_SET",
        apiKey: apiKey ? "****" + apiKey.slice(-4) : "NOT_SET",
        apiSecret: apiSecret ? "****" + apiSecret.slice(-4) : "NOT_SET",
        uploadPreset: uploadPreset,
      },
      connectionTest,
      env: process.env.NODE_ENV,
    },
    { status: 200 }
  );
}
