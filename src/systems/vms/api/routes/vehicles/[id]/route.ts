/**
 * Single Vehicle API Route - FULL CRUD /api/vehicles/[id]
 *
 * GET ✓ PUT ✓ DELETE ✓ - Complete CRUD for individual vehicles
 */

import { createErrorResponse, createSuccessResponse, withErrorHandling } from "@/lib/api-error-wrapper";
import { auditEventFromRequest, recordAuditEvent } from "@/lib/audit-log";
import { requirePermission } from "@/lib/auth-helpers";
import { buildCorsHeaders } from "@/lib/cors";
import { vehicleService } from "@/systems/vms/services/VehicleService";
import { normalizeImageUrl } from "@/lib/cloudinary";
import { mergeVehicleImages } from "@/systems/vms/utils/vehicle-helpers";
import { NextRequest, NextResponse } from "next/server";
import type { VehicleDB } from "@/systems/vms/services/VehicleService";
import { clearCachedVehicles } from "@/systems/vms/api/vehicles-cache";

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
  Images?: string[] | null;
  images?: string[] | null;
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
  const imageValue = firstDefined(payload.Image, payload.image_id);
  const thumbnailValue = firstDefined(payload.thumbnail_url);
  const normalized = {
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
    image_id: normalizeOptionalString(imageValue),
    thumbnail_url: normalizeOptionalString(thumbnailValue),
  };

  return Object.fromEntries(
    Object.entries(normalized).filter(([, value]) => value !== undefined)
  ) as Partial<VehicleDB>;
}

async function normalizeVehicleImages(...values: unknown[]): Promise<string[]> {
  const rawImages = mergeVehicleImages(...values);
  const normalizedImages = await Promise.all(
    rawImages.map((image) => normalizeImageUrl(image))
  );
  return mergeVehicleImages(normalizedImages);
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
  const hasGalleryUpdate =
    Object.prototype.hasOwnProperty.call(payload, "Images") ||
    Object.prototype.hasOwnProperty.call(payload, "images");
  const hasSingleImageUpdate =
    Object.prototype.hasOwnProperty.call(payload, "Image") ||
    Object.prototype.hasOwnProperty.call(payload, "image_id");
  const normalizedImages = hasGalleryUpdate || hasSingleImageUpdate
    ? await normalizeVehicleImages(
        payload.Images,
        payload.images,
        payload.Image,
        payload.image_id,
        payload.thumbnail_url
      )
    : null;

  if (normalizedImages) {
    dbPayload.image_id = normalizedImages[0] || null;
    dbPayload.thumbnail_url = normalizedImages[0] || null;
  }

  const hasImageUpdate = Object.prototype.hasOwnProperty.call(dbPayload, "image_id");
  const hasThumbnailUpdate = Object.prototype.hasOwnProperty.call(dbPayload, "thumbnail_url");

  // Image save fix: normalize image_id (public_id/Drive ID -> URL) and keep
  // thumbnail_url in sync so server-rendered DB lists show the latest upload.
  if (!normalizedImages && dbPayload.image_id) {
    const normalizedImageId = await normalizeImageUrl(dbPayload.image_id);
    dbPayload.image_id = normalizedImageId;

    dbPayload.thumbnail_url = hasThumbnailUpdate && dbPayload.thumbnail_url
      ? await normalizeImageUrl(dbPayload.thumbnail_url)
      : normalizedImageId;
  } else if (!normalizedImages && hasImageUpdate) {
    dbPayload.thumbnail_url = null;
  } else if (!normalizedImages && hasThumbnailUpdate && dbPayload.thumbnail_url) {
    dbPayload.thumbnail_url = await normalizeImageUrl(dbPayload.thumbnail_url);
  }

  if (Object.keys(dbPayload).length === 0) {
    return createErrorResponse("No valid fields to update", requestId, Date.now() - startTime, 400, buildCorsHeaders(req));
  }

  const previousImagesResult = normalizedImages
    ? await vehicleService.getVehicleImageReferences(id)
    : null;

  // Required fields cannot be blank when they are included in a partial update.
  const requiredFields = [
    ["category", dbPayload.category],
    ["brand", dbPayload.brand],
    ["model", dbPayload.model],
  ] as const;

  for (const [field, value] of requiredFields) {
    if (field in dbPayload && !value) {
      return createErrorResponse(`Missing required: ${field}`, requestId, Date.now() - startTime, 400, buildCorsHeaders(req));
    }
  }

  logger.debug("[UPDATE]", { vehicleId: id, plate: dbPayload.plate, hasImage: !!dbPayload.image_id });

  const result = await vehicleService.updateVehicle(id, dbPayload);

  if (!result.success) {
    const errorMsg = result.error || 'Unknown database error (no error message returned)';
    logger.error("[UPDATE FAILED]", { error: errorMsg, vehicleId: id, dbPayloadKeys: Object.keys(dbPayload), requestId });
    return createErrorResponse(
      `Update failed: ${errorMsg}`,
      requestId, Date.now() - startTime, 500, buildCorsHeaders(req)
    );
  }

  logger.info("[UPDATE OK]", { vehicleId: id });

  if (normalizedImages) {
    const galleryResult = await vehicleService.replaceVehicleImages(id, normalizedImages, {
      previousImages: previousImagesResult?.success ? previousImagesResult.data ?? [] : undefined,
    });
    if (!galleryResult.success) {
      return createErrorResponse(
        galleryResult.error || "Failed to save vehicle images",
        requestId,
        Date.now() - startTime,
        500,
        buildCorsHeaders(req)
      );
    }
    if (result.data) {
      result.data.Images = normalizedImages;
      result.data.Image = normalizedImages[0] || "";
    }
  }

  clearCachedVehicles();
  await recordAuditEvent(auditEventFromRequest(req, {
    action: "vms.vehicle.update.success",
    actorUsername: auth.session.username,
    actorRole: auth.session.role,
    resourceType: "vehicle",
    resourceId: id,
    status: "success",
    metadata: {
      updatedFields: Object.keys(dbPayload),
      hasImageUpdate: Boolean(normalizedImages || hasImageUpdate || hasThumbnailUpdate),
    },
  }));

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
  clearCachedVehicles();
  await recordAuditEvent(auditEventFromRequest(req, {
    action: "vms.vehicle.delete.success",
    actorUsername: auth.session.username,
    actorRole: auth.session.role,
    resourceType: "vehicle",
    resourceId: id,
    status: "success",
  }));

  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(req)
  });
}, { context: "vehicles-delete" });

export { deleteHandler as DELETE };
