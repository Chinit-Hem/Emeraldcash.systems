/**
 * Vehicle CREATE API - POST /api/vehicles/create
 *
 * Creates new vehicle using VehicleService.createVehicle()
 * Full CRUD support for AddVehicleModal
 */

import { createErrorResponse, createSuccessResponse, withErrorHandling } from "@/lib/api-error-wrapper";
import { requirePermission } from "@/lib/auth-helpers";
import { buildCorsHeaders } from "@/lib/cors";
import { vehicleService } from "@/services/VehicleService";
import { NextRequest, NextResponse } from "next/server";
import type { Vehicle } from "@/lib/types";
import type { VehicleDB } from "@/services/VehicleService";
import { clearCachedVehicles } from "../_cache";
import { normalizeImageUrl } from "@/lib/cloudinary";

// ============================================================================
// OPTIONS (CORS Preflight)
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: buildCorsHeaders(req) });
}

// ============================================================================
// POST Handler - Create New Vehicle
const postHandler = withErrorHandling(async (req: NextRequest, { logger, requestId, startTime }) => {
  const auth = requirePermission(req, "vehicles:create");
  if (auth.response) return auth.response;

  logger.debug("[CREATE] POST /api/vehicles/create", { requestId });

  // Parse request body
  let payload: Partial<Vehicle>;
  try {
    payload = await req.json();
  } catch (err) {
    return createErrorResponse(
      "Invalid JSON payload",
      requestId,
      Date.now() - startTime,
      400,
      buildCorsHeaders(req)
    );
  }

  // Validate required fields
  const requiredFields = ["Category", "Brand", "Model", "Plate"];
  for (const field of requiredFields) {
    if (!payload[field as keyof Vehicle]) {
      return createErrorResponse(
        `Missing required field: ${field}`,
        requestId,
        Date.now() - startTime,
        400,
        buildCorsHeaders(req)
      );
    }
  }

  logger.debug("[CREATE] Validated payload", {
    brand: payload.Brand,
    model: payload.Model,
    plate: payload.Plate,
    requestId
  });

  const imageId = payload.Image ? await normalizeImageUrl(payload.Image) : null;

  // Convert to DB format for service
  const dbPayload = {
    category: payload.Category as string,
    brand: payload.Brand as string,
    model: payload.Model as string,
    year: payload.Year as number | null,
    plate: payload.Plate as string,
    market_price: payload.PriceNew as number,
    tax_type: payload.TaxType as string || null,
    condition: payload.Condition as string,
    body_type: payload.BodyType as string || null,
    color: payload.Color as string || null,
    image_id: imageId,
    thumbnail_url: imageId,
  };

  // Create vehicle
  const result = await vehicleService.createVehicle(dbPayload as Omit<VehicleDB, "id" | "created_at" | "updated_at">);

  if (!result.success || !result.data) {
    logger.error("[CREATE] Service error", { error: result.error, requestId });
    return createErrorResponse(
      result.error || "Failed to create vehicle",
      requestId,
      Date.now() - startTime,
      500,
      buildCorsHeaders(req)
    );
  }

  logger.info("[CREATE] Success", {
    vehicleId: result.data.VehicleId,
    plate: result.data.Plate,
    requestId
  });

  clearCachedVehicles();

  return createSuccessResponse(
    result.data,
    requestId,
    Date.now() - startTime,
    { operation: "create", vehicleId: result.data.VehicleId },
    buildCorsHeaders(req)
  );
}, { context: "vehicles-create-api" });

export { postHandler as POST };

