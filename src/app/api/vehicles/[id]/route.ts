/**
 * Single Vehicle API Route - FULL CRUD /api/vehicles/[id]
 *
 * GET ✓ PUT ✓ DELETE ✓ - Complete CRUD for individual vehicles
 */

import { createErrorResponse, createSuccessResponse, withErrorHandling } from "@/lib/api-error-wrapper";
import { requirePermission } from "@/lib/auth-helpers";
import { vehicleService } from "@/services/VehicleService";
import { normalizeImageUrl } from "@/lib/cloudinary";
import { NextRequest, NextResponse } from "next/server";

type VehicleUpdatePayload = {
  Category?: string;
  category?: string;
  Brand?: string;
  brand?: string;
  Model?: string;
  model?: string;
  Year?: number | string | null;
  year?: number | string | null;
  Plate?: string;
  plate?: string;
  PriceNew?: number | string | null;
  market_price?: number | string | null;
  TaxType?: string;
  tax_type?: string;
  Condition?: string;
  condition?: string;
  BodyType?: string;
  body_type?: string;
  Color?: string;
  color?: string;
  Image?: string | null;
  image_id?: string | null;
  thumbnail_url?: string | null;
};

function firstDefined<T>(...values: Array<T | undefined>): T | undefined {
  return values.find((value) => value !== undefined);
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function normalizeOptionalString(value: string | null | undefined): string | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeUpdatePayload(payload: VehicleUpdatePayload) {
  return {
    category: firstDefined(payload.Category, payload.category)?.trim(),
    brand: firstDefined(payload.Brand, payload.brand)?.trim(),
    model: firstDefined(payload.Model, payload.model)?.trim(),
    year: normalizeOptionalNumber(firstDefined(payload.Year, payload.year)),
    plate: firstDefined(payload.Plate, payload.plate)?.trim(),
    market_price: normalizeOptionalNumber(firstDefined(payload.PriceNew, payload.market_price)),
    tax_type: firstDefined(payload.TaxType, payload.tax_type)?.trim(),
    condition: firstDefined(payload.Condition, payload.condition)?.trim(),
    body_type: firstDefined(payload.BodyType, payload.body_type)?.trim(),
    color: firstDefined(payload.Color, payload.color)?.trim(),
    image_id: normalizeOptionalString(firstDefined(payload.Image, payload.image_id)),
  };
}

// ============================================================================
// CORS Configuration
function buildCorsHeaders(req: NextRequest): Headers {
  const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim();
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  const vercelOrigin = vercelUrl
    ? vercelUrl.startsWith("http")
      ? vercelUrl
      : `https://${vercelUrl}`
    : "";
  const requestOrigin = req.headers.get("origin") || "";
  const allowedOrigin = appOrigin || vercelOrigin || requestOrigin || "*";

  const headers = new Headers({
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  });

  if (allowedOrigin !== "*") {
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  return headers;
}

// ============================================================================
// OPTIONS Handler (CORS Preflight)
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(req),
  });
}

// ============================================================================
// GET Handler - Single Vehicle by ID (EXISTING - WORKING)
const getHandler = withErrorHandling(async (req: NextRequest, { logger, requestId, startTime }) => {
  const auth = requirePermission(req, "vehicles:view");
  if (auth.response) return auth.response;

  const idStr = req.nextUrl.pathname.split('/').pop()?.trim() || '';

  if (!idStr || idStr === 'undefined' || isNaN(Number(idStr))) {
    logger.warn('Invalid vehicle ID', { idStr, requestId });
    return createErrorResponse(
      "Valid numeric vehicle ID required",
      requestId,
      Date.now() - startTime,
      400,
      buildCorsHeaders(req)
    );
  }

  const id = parseInt(idStr, 10);

  logger.debug("Fetching single vehicle", { vehicleId: id, requestId });

  const vehicleResult = await vehicleService.getVehicleById(id);

  if (!vehicleResult.success) {
    const errorMsg = vehicleResult.error?.includes('not found')
      ? `Vehicle ID ${id} not found`
      : vehicleResult.error || 'Vehicle not available';

    logger.info(`Vehicle not found: ID ${id}`);

    return createErrorResponse(
      errorMsg,
      requestId,
      Date.now() - startTime,
      404,
      buildCorsHeaders(req)
    );
  }

  logger.info("Vehicle found", { vehicleId: id, plate: vehicleResult.data?.Plate, requestId });

  return createSuccessResponse(
    vehicleResult.data,
    requestId,
    Date.now() - startTime,
    { vehicleId: id, queryCount: vehicleResult.meta?.queryCount || 1 },
    buildCorsHeaders(req)
  );
}, { context: "vehicles-get-single" });

export { getHandler as GET };

// ============================================================================
// PUT Handler - Update Vehicle by ID (CRUD FIX)
const putHandler = withErrorHandling(async (req: NextRequest, { logger, requestId, startTime }) => {
  const auth = requirePermission(req, "vehicles:edit");
  if (auth.response) return auth.response;

  const idStr = req.nextUrl.pathname.split('/').pop()?.trim() || '';
  if (!idStr || isNaN(Number(idStr))) {
    return createErrorResponse("Valid numeric vehicle ID required", requestId, Date.now() - startTime, 400, buildCorsHeaders(req));
  }

  const id = parseInt(idStr, 10);

  let payload: VehicleUpdatePayload;
  try {
    payload = await req.json();
  } catch {
    return createErrorResponse("Invalid JSON payload", requestId, Date.now() - startTime, 400, buildCorsHeaders(req));
  }

  const dbPayload = normalizeUpdatePayload(payload);

  // Log incoming payload for debugging image update issues
  console.log('[🚀 API UPDATE FULL PAYLOAD]:', JSON.stringify({ 
    vehicleId: id, 
    dbPayload,
    payloadKeys: Object.keys(payload)
  }, null, 2));

  // 🚀 IMAGE SAVE FIX: Normalize image_id (public_id → URL)
  if (dbPayload.image_id) {
    const normalizedImageId = await normalizeImageUrl(dbPayload.image_id);
    console.log(`[API UPDATE ${id}] Image normalized: "${dbPayload.image_id.substring(0,30)}..." → "${normalizedImageId.substring(0,50)}..."`);
    dbPayload.image_id = normalizedImageId;
  }

  // Required fields validation
  const requiredFields = [
    ["category", dbPayload.category],
    ["brand", dbPayload.brand],
    ["model", dbPayload.model],
    ["plate", dbPayload.plate],
  ] as const;

  for (const [field, value] of requiredFields) {
    if (!value) {
      return createErrorResponse(`Missing required: ${field}`, requestId, Date.now() - startTime, 400, buildCorsHeaders(req));
    }
  }

  logger.debug("[UPDATE]", { vehicleId: id, plate: dbPayload.plate, hasImage: !!dbPayload.image_id });

  console.error('[🚀 VEHICLE API UPDATE START]', { 
    vehicleId: id, 
    image_id: dbPayload.image_id ? `${dbPayload.image_id.substring(0,50)}...` : null,
    image_format: dbPayload.image_id ? (dbPayload.image_id.startsWith('http') ? 'URL' : dbPayload.image_id.startsWith('data:') ? 'DATA' : 'PUBLIC_ID') : null,
    plate: dbPayload.plate,
    requestId 
  });
  
  const result = await vehicleService.updateVehicle(id, dbPayload);
  
  console.error('[🚀 VEHICLE API UPDATE RESULT]', { 
    success: result.success, 
    error: result.error,
    image_saved: dbPayload.image_id,
    requestId 
  });

  if (!result.success) {
    const errorMsg = result.error || 'Unknown database error (no error message returned)';
    logger.error("[UPDATE FAILED]", { error: errorMsg, vehicleId: id, dbPayloadKeys: Object.keys(dbPayload), requestId });
    return createErrorResponse(
      `Update failed: ${errorMsg}`, 
      requestId, Date.now() - startTime, 500, buildCorsHeaders(req)
    );
  }

  logger.info("[UPDATE OK]", { vehicleId: id });

  return createSuccessResponse(
    result.data,
    requestId,
    Date.now() - startTime,
    { operation: "update", vehicleId: id },
    buildCorsHeaders(req)
  );
}, { context: "vehicles-update" });

export { putHandler as PUT };

// ============================================================================
// DELETE Handler - Delete Vehicle by ID (CRUD FIX)
const deleteHandler = withErrorHandling(async (req: NextRequest, { logger, requestId, startTime }) => {
  const auth = requirePermission(req, "vehicles:delete");
  if (auth.response) return auth.response;

  const idStr = req.nextUrl.pathname.split('/').pop()?.trim() || '';
  if (!idStr || isNaN(Number(idStr))) {
    return createErrorResponse("Valid numeric vehicle ID required", requestId, Date.now() - startTime, 400, buildCorsHeaders(req));
  }

  const id = parseInt(idStr, 10);

  logger.debug("[DELETE]", { vehicleId: id });

  const result = await vehicleService.deleteVehicle(id);

  if (!result.success) {
    logger.error("[DELETE FAILED]", { error: result.error, vehicleId: id });
    return createErrorResponse(result.error || "Delete failed", requestId, Date.now() - startTime, 500, buildCorsHeaders(req));
  }

  logger.info("[DELETE OK]", { vehicleId: id });

  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(req)
  });
}, { context: "vehicles-delete" });

export { deleteHandler as DELETE };
