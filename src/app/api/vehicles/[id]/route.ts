/**
 * Single Vehicle API Route - FULL CRUD /api/vehicles/[id]
 *
 * GET ✓ PUT ✓ DELETE ✓ - Complete CRUD for individual vehicles
 */

import { createErrorResponse, createSuccessResponse, withErrorHandling } from "@/lib/api-error-wrapper";
import { requirePermission } from "@/lib/auth-helpers";
import { vehicleService } from "@/services/VehicleService";
import { NextRequest, NextResponse } from "next/server";
import type { Vehicle } from "@/lib/types";

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

  let payload;
  try {
    payload = await req.json();
  } catch {
    return createErrorResponse("Invalid JSON payload", requestId, Date.now() - startTime, 400, buildCorsHeaders(req));
  }

  // Required fields validation
  const required = ["Category", "Brand", "Model", "Plate"];
  for (const field of required) {
    if (!payload[field]) {
      return createErrorResponse(`Missing required: ${field}`, requestId, Date.now() - startTime, 400, buildCorsHeaders(req));
    }
  }

// Convert to DB format for service
  const dbPayload = {
    category: payload.Category as string,
    brand: payload.Brand as string,
    model: payload.Model as string,
    year: payload.Year ?? undefined,
    plate: payload.Plate as string,
    market_price: payload.PriceNew as number,
    tax_type: payload.TaxType || undefined,
    condition: payload.Condition as string,
    body_type: payload.BodyType || undefined,
    color: payload.Color || undefined,
    image_id: payload.Image || undefined,
  };

  logger.debug("[UPDATE]", { vehicleId: id, plate: payload.Plate });

  const result = await vehicleService.updateVehicle(id, dbPayload);

  if (!result.success) {
    logger.error("[UPDATE FAILED]", { error: result.error, vehicleId: id });
    return createErrorResponse(result.error || "Update failed", requestId, Date.now() - startTime, 500, buildCorsHeaders(req));
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
