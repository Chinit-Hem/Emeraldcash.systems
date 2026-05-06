import { requirePermission } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import type { Permission } from "@/lib/types";

/**
 * Cloudinary Signature API Route
 *
 * Generates a secure signed upload signature for client-side Cloudinary uploads.
 * This keeps the API secret secure on the server while allowing direct browser-to-Cloudinary uploads.
 *
 * POST /api/cloudinary-signature
 * Body: { folder?: string, public_id?: string, tags?: string[] }
 *
 * Response: { signature: string, timestamp: number, api_key: string, upload_preset: string, folder: string }
 */

// Server-side Cloudinary configuration
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "vehicle_uploads";

/**
 * Generate Cloudinary upload signature
 *
 * @param params - Parameters to include in signature
 * @param apiSecret - Cloudinary API secret
 * @returns SHA-256 signature string
 */
function generateSignature(params: Record<string, string | number>, apiSecret: string): string {
  // Sort params alphabetically and create string: param1=value1&param2=value2...
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join("&");

  // Append API secret and create SHA-256 hash
  const signatureString = sortedParams + apiSecret;
  return createHash("sha256").update(signatureString).digest("hex");
}

/**
 * Validate server-side configuration
 */
function validateConfig(): { valid: boolean; error?: string } {
  if (!CLOUDINARY_API_KEY) {
    return { valid: false, error: "CLOUDINARY_API_KEY is not configured" };
  }

  if (!CLOUDINARY_API_SECRET) {
    return { valid: false, error: "CLOUDINARY_API_SECRET is not configured" };
  }

  if (!CLOUDINARY_CLOUD_NAME) {
    return { valid: false, error: "CLOUDINARY_CLOUD_NAME is not configured" };
  }

  return { valid: true };
}

function getRequiredPermission(folder: string): Permission {
  return folder.startsWith("sms/") ? "sms:create" : "vehicles:create";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // No body or invalid JSON, use defaults
    }

    const folder = (body.folder as string) || "vehicles";
    const publicId = body.public_id as string | undefined;
    const tags = body.tags as string[] | undefined;

    const auth = requirePermission(request, getRequiredPermission(folder));
    if (auth.response) return auth.response;

    // Validate configuration
    const configValidation = validateConfig();
    if (!configValidation.valid) {
      return NextResponse.json(
        {
          ok: false,
          error: configValidation.error,
          code: "CONFIG_ERROR"
        },
        { status: 500 }
      );
    }

    // Generate timestamp (must be within 1 hour of upload)
    const timestamp = Math.floor(Date.now() / 1000);

    // Build params for signature (only params that need signing)
    const signatureParams: Record<string, string | number> = {
      timestamp,
      upload_preset: CLOUDINARY_UPLOAD_PRESET,
      folder,
    };

    // Add optional params if provided
    if (publicId) {
      signatureParams.public_id = publicId;
    }

    if (tags && tags.length > 0) {
      signatureParams.tags = tags.join(",");
    }

    // Generate signature
    const signature = generateSignature(signatureParams, CLOUDINARY_API_SECRET!);

    // Return signature and required params
    return NextResponse.json({
      ok: true,
      data: {
        signature,
        timestamp,
        api_key: CLOUDINARY_API_KEY,
        cloud_name: CLOUDINARY_CLOUD_NAME,
        upload_preset: CLOUDINARY_UPLOAD_PRESET,
        folder,
        ...(publicId && { public_id: publicId }),
        ...(tags && { tags: tags.join(",") }),
      }
    });

  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to generate signature",
        code: "SIGNATURE_ERROR"
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for health check
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = requirePermission(request, "vehicles:view");
  if (auth.response) return auth.response;

  const configValidation = validateConfig();

  return NextResponse.json({
    ok: configValidation.valid,
    status: configValidation.valid ? "ready" : "not_configured",
    error: configValidation.error,
    cloud_name: CLOUDINARY_CLOUD_NAME || null,
    upload_preset: CLOUDINARY_UPLOAD_PRESET,
    // Don't expose API key or secret in GET response
    has_api_key: !!CLOUDINARY_API_KEY,
    has_api_secret: !!CLOUDINARY_API_SECRET,
  });
}
