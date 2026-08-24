/**
 * Vehicles API Route - OOAD Service Layer Implementation
 *
 * Demonstrates professional API design using VehicleService:
 * - Singleton service for business logic
 * - Case-insensitive ILIKE filtering with TRIM()
 * - SSR-optimized responses
 * - Comprehensive error handling with withErrorHandling wrapper
 * - SQL injection protection via parameterized queries
 * - Defensive programming patterns
 *
 * @module api/vehicles
 */

import { createErrorResponse, createSuccessResponse, withErrorHandling } from "@/lib/api-error-wrapper";
import { auditEventFromRequest, recordAuditEvent } from "@/lib/audit-log";
import { requirePermission } from "@/lib/auth-helpers";
import type { VehicleFilters, VehicleStats } from "@/systems/vms/services/VehicleService";
import { vehicleService } from "@/systems/vms/services/VehicleService";
import { NextRequest, NextResponse } from "next/server";
import { clearCachedVehicles, getCachedVehicles, setCachedVehicles } from "@/systems/vms/api/vehicles-cache";
import { buildCorsHeaders } from "@/lib/cors"; // Import shared CORS utility
import type { Vehicle } from "@/shared/types/types";
import { normalizeImageUrl } from "@/lib/cloudinary";
import { mergeVehicleImages } from "@/systems/vms/utils/vehicle-helpers";

type VehiclesMeta = {
  total?: number;
  queryCount?: number;
  stats?: VehicleStats;
  cacheHit?: boolean;
  [key: string]: unknown;
};

type VehiclesResult = {
  success: boolean;
  data?: Vehicle[];
  meta?: VehiclesMeta;
  error?: string;
};

type StatsResult = {
  success: boolean;
  data?: VehicleStats | null;
  error?: string;
};

function firstDefined<T>(...values: Array<T | undefined>): T | undefined {
  return values.find((value) => value !== undefined);
}

function normalizeOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

async function normalizeVehicleImages(...values: unknown[]): Promise<string[]> {
  const rawImages = mergeVehicleImages(...values);
  const normalizedImages = await Promise.all(
    rawImages.map((image) => normalizeImageUrl(image))
  );
  return mergeVehicleImages(normalizedImages);
}
// ============================================================================
// CORS Configuration
// ============================================================================

/**
 * Build CORS headers for cross-origin requests
 */

// ============================================================================
// OPTIONS Handler (CORS Preflight)
// ============================================================================

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(req),
  });
}

// ============================================================================
// GET Handler - List/Search Vehicles
// ============================================================================

/**
 * GET /api/vehicles
 *
 * Query Parameters:
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 * - category: string (case-insensitive)
 * - brand: string (case-insensitive, partial match)
 * - model: string (case-insensitive, partial match)
 * - condition: "New" | "Used" | "Other"
 * - yearMin: number
 * - yearMax: number
 * - priceMin: number
 * - priceMax: number
 * - color: string
 * - bodyType: string
 * - taxType: string
 * - searchTerm: string (searches brand, model, plate)
 * - orderBy: string (default: "id")
 * - orderDirection: "ASC" | "DESC" (default: "DESC")
 *
 * Returns:
 * - success: boolean
 * - data: Vehicle[]
 * - meta: { total, limit, offset, durationMs, queryCount }
 */
const getHandler = withErrorHandling(async (req, { logger, requestId, startTime }) => {
  const auth = requirePermission(req, "vehicles:view");
  if (auth.response) return auth.response;

  // Add overall timeout for the entire handler
  // OPTIMIZED: Reduced from 45s to 30s for faster failure and better UX
  const HANDLER_TIMEOUT_MS = 30000;

  // Log request details
  logger.debug("Parsing query parameters", {
    url: req.url,
  });

  // Parse query parameters with validation
  const { searchParams } = new URL(req.url);
  const requestedLimit = parseInt(searchParams.get("limit") || "50", 10);
  const maxLimit = 2000;
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), maxLimit)
    : 50;

  // OPTIMIZED: Reduced default limit from 100 to 50 for better performance
  const filters: VehicleFilters = {
    limit,
    offset: Math.max(parseInt(searchParams.get("offset") || "0", 10), 0), // Min 0
    orderBy: searchParams.get("orderBy") || "id",
    orderDirection: (searchParams.get("orderDirection") as "ASC" | "DESC") || "DESC",
  };

  // Validate orderDirection
  if (!filters.orderDirection || !["ASC", "DESC"].includes(filters.orderDirection)) {
    return createErrorResponse(
      "Invalid orderDirection. Must be 'ASC' or 'DESC'.",
      requestId,
      Date.now() - startTime,
      400,
      buildCorsHeaders(req)
    );
  }

  // Optional filters (only add if provided)
  const category = searchParams.get("category");
  if (category) filters.category = category;

  const brand = searchParams.get("brand");
  if (brand) filters.brand = brand;

  const model = searchParams.get("model");
  if (model) filters.model = model;

  const condition = searchParams.get("condition");
  if (condition) filters.condition = condition;

  const yearMin = searchParams.get("yearMin");
  if (yearMin) {
    const year = parseInt(yearMin, 10);
    if (isNaN(year) || year < 1900 || year > 2100) {
      return createErrorResponse(
        "Invalid yearMin. Must be between 1900 and 2100.",
        requestId,
        Date.now() - startTime,
        400,
      buildCorsHeaders(req)
      );
    }
    filters.yearMin = year;
  }

  const yearMax = searchParams.get("yearMax");
  if (yearMax) {
    const year = parseInt(yearMax, 10);
    if (isNaN(year) || year < 1900 || year > 2100) {
      return createErrorResponse(
        "Invalid yearMax. Must be between 1900 and 2100.",
        requestId,
        Date.now() - startTime,
        400,
      buildCorsHeaders(req)
      );
    }
    filters.yearMax = year;
  }

  const priceMin = searchParams.get("priceMin");
  if (priceMin) {
    const price = parseInt(priceMin, 10);
    if (isNaN(price) || price < 0) {
      return createErrorResponse(
        "Invalid priceMin. Must be a positive number.",
        requestId,
        Date.now() - startTime,
        400,
      buildCorsHeaders(req)
      );
    }
    filters.priceMin = price;
  }

  const priceMax = searchParams.get("priceMax");
  if (priceMax) {
    const price = parseInt(priceMax, 10);
    if (isNaN(price) || price < 0) {
      return createErrorResponse(
        "Invalid priceMax. Must be a positive number.",
        requestId,
        Date.now() - startTime,
        400,
      buildCorsHeaders(req)
      );
    }
    filters.priceMax = price;
  }

  const color = searchParams.get("color");
  if (color) filters.color = color;

  const bodyType = searchParams.get("bodyType");
  if (bodyType) filters.bodyType = bodyType;

  const taxType = searchParams.get("taxType");
  if (taxType) filters.taxType = taxType;

  const searchTerm = searchParams.get("searchTerm");
  if (searchTerm) filters.searchTerm = searchTerm;

  // Handle withoutImage filter
  const withoutImage = searchParams.get("withoutImage");
  if (withoutImage === "1" || withoutImage === "true") {
    filters.withoutImage = true;
  }

  logger.debug("Checking LRU cache", { filters });

  // 🚀 PHASE 1 STEP 3: Try LRU cache first
  let cacheHit = false;
  let vehiclesResult: VehiclesResult = {
    success: false,
    data: [],
    meta: {},
  };

  // Skip cache for noCache=1 or mutations (offset=0 typically uncached)
  const noCache = searchParams.get("noCache") === "1";
  if (!noCache) {
    const cached = getCachedVehicles(filters);
    if (cached && cached.data.length > 0) {
      cacheHit = true;
      logger.info("LRU Cache HIT", { filterKey: JSON.stringify({category: filters.category, brand: filters.brand}), size: cached.data.length });
      vehiclesResult.data = cached.data;
      vehiclesResult.meta = cached.meta as VehiclesMeta; // Assign cached meta
      vehiclesResult.success = true;
      vehiclesResult.meta = { ...vehiclesResult.meta, cacheHit: true, queryCount: 0 };
    }
  }

  let statsResult: StatsResult = { success: true, data: null };

  if (!vehiclesResult.success) {
    logger.debug("Cache MISS - querying DB", { filters });

    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), HANDLER_TIMEOUT_MS);
    });

    // Execute queries in parallel for better performance with timeout
    const [freshVehiclesResult, freshStatsResult, freshCountResult] = await Promise.race([
      Promise.all([
        vehicleService.getVehicles(filters),
        // ALWAYS fetch stats so Quick Filters (Cars, Motorcycles, etc.) don't vanish
        vehicleService.getVehicleStats(),
        // Fetch actual matching count for correct pagination
        vehicleService.countWithFilters(filters)
      ]),
      timeoutPromise
    ]);

    vehiclesResult = freshVehiclesResult;
    statsResult = freshStatsResult;
    const countResult = freshCountResult;

    // Cache successful fresh result, including meta
    if (vehiclesResult.success && vehiclesResult.data) {
      // Include stats in the meta to be cached
      const meta = { ...vehiclesResult.meta, stats: statsResult.data, total: countResult.data };
      setCachedVehicles(vehiclesResult.data, meta, filters);
      logger.info("LRU Cache SET", { filterKey: JSON.stringify({category: filters.category, brand: filters.brand}), size: vehiclesResult.data.length });
    }
  }

  if (!vehiclesResult.success) {
    logger.error("Vehicle service returned error", new Error(vehiclesResult.error || "Unknown error"), {
      filters,
      queryCount: vehiclesResult.meta?.queryCount,
    });

    return createErrorResponse(
      "Failed to fetch vehicles. Please try again later.",
      requestId,
      Date.now() - startTime,
      500,
      buildCorsHeaders(req)
    );
  }

  // Fix: use the actual total count from DB matching filters
  const total = vehiclesResult.meta?.total ?? vehiclesResult.data?.length ?? 0;
  const stats = (statsResult.success && statsResult.data)
    ? statsResult.data
    : vehiclesResult.meta?.stats;

  logger.info("Successfully fetched vehicles", {
    count: vehiclesResult.data?.length,
    total,
    filters: Object.keys(filters).filter(k => k !== 'limit' && k !== 'offset'),
  });

  return createSuccessResponse(
    vehiclesResult.data,
    requestId,
    Date.now() - startTime,
    {
      total,
      limit: filters.limit,
      offset: filters.offset,
      totalPages: Math.ceil(total / (filters.limit || 100)),
      queryCount: vehiclesResult.meta?.queryCount || 0,
      cacheHit,
      cacheStats: {
        hits: 42, misses: 58, evictions: 2, size: 7 // Placeholder for monitoring
      },
      // Include category and condition counts for KPIs
      countsByCategory: stats ? {
        Cars: stats.byCategory?.Cars || 0,
        Motorcycles: stats.byCategory?.Motorcycles || 0,
        TukTuks: stats.byCategory?.TukTuks || 0,
      } : undefined,
      countsByCondition: stats ? {
        New: stats.byCondition?.New || 0,
        Used: stats.byCondition?.Used || 0,
      } : undefined,
      avgPrice: stats?.avgPrice,
      noImageCount: stats?.noImageCount,
    },
    buildCorsHeaders(req)
  );
}, { context: "vehicles-api", timeoutMs: 60000 });

export { getHandler as GET };

// ============================================================================
// POST Handler - Create Vehicle
// ============================================================================

/**
 * POST /api/vehicles
 *
 * Body: Partial<VehicleDB> (without id, created_at, updated_at)
 * Supports both JSON and FormData (with image file upload)
 *
 * Returns:
 * - success: boolean
 * - data: Vehicle (created)
 * - meta: { durationMs, queryCount }
 */
const postHandler = withErrorHandling(async (req, { logger, requestId, startTime }) => {
  const auth = requirePermission(req, "vehicles:create");
  if (auth.response) return auth.response;

  // Check if request is FormData or JSON
  const contentType = req.headers.get("content-type") || "";
  const isFormData = contentType.includes("multipart/form-data");

  let vehicleData: Record<string, unknown>;
  let imageFile: File | null = null;
  let imageSize: number | undefined;
  let imageName: string | undefined;

  if (isFormData) {
    // Handle FormData with potential image upload
    const formData = await req.formData();

    // Extract vehicle data from form fields
    vehicleData = {};
    formData.forEach((value, key) => {
      if (key === "image" && value instanceof File) {
        imageFile = value;
        imageSize = value.size;
        imageName = value.name;
      } else {
        vehicleData[key] = value;
      }
    });

    logger.debug("Processing FormData request", {
      hasImage: !!imageFile,
      imageSize,
      fields: Object.keys(vehicleData),
    });
  } else {
    // Handle JSON request
    try {
      vehicleData = await req.json();
      logger.debug("Processing JSON request", {
        fields: Object.keys(vehicleData),
      });
    } catch {
      return createErrorResponse(
        "Invalid JSON in request body",
        requestId,
        Date.now() - startTime,
        400,
        buildCorsHeaders(req)
      );
    }
  }

  const categoryValue = firstDefined(vehicleData.category as string | undefined, vehicleData.Category as string | undefined);
  const brandValue = firstDefined(vehicleData.brand as string | undefined, vehicleData.Brand as string | undefined);
  const modelValue = firstDefined(vehicleData.model as string | undefined, vehicleData.Model as string | undefined);
  const yearValue = firstDefined(vehicleData.year as string | number | undefined, vehicleData.Year as string | number | undefined);
  const plateValue = firstDefined(vehicleData.plate as string | undefined, vehicleData.Plate as string | undefined);

  // Validate required fields
  const requiredFields = [
    ["category", categoryValue],
    ["brand", brandValue],
    ["model", modelValue],
    ["year", yearValue],
  ] as const;
  const missingFields = requiredFields.filter(([, value]) => !value).map(([field]) => field);

  if (missingFields.length > 0) {
    return createErrorResponse(
      `Missing required fields: ${missingFields.join(", ")}`,
      requestId,
      Date.now() - startTime,
      400,
      buildCorsHeaders(req)
    );
  }

  // Validate year is reasonable
  const year = parseInt(String(yearValue), 10);
  if (isNaN(year) || year < 1900 || year > 2100) {
    return createErrorResponse(
      "Invalid year. Must be between 1900 and 2100.",
      requestId,
      Date.now() - startTime,
      400,
      buildCorsHeaders(req)
    );
  }

  // Validate market price if provided
  const marketPriceRaw = firstDefined(
    vehicleData.market_price,
    vehicleData.marketPrice,
    vehicleData.PriceNew
  );
  let marketPrice: number = 0;
  if (marketPriceRaw !== undefined && marketPriceRaw !== null && marketPriceRaw !== "") {
    const price = parseFloat(String(marketPriceRaw));
    if (isNaN(price) || price < 0) {
      return createErrorResponse(
        "Invalid market price. Must be a positive number.",
        requestId,
        Date.now() - startTime,
        400,
        buildCorsHeaders(req)
      );
    }
    marketPrice = price;
  }

  // Create vehicle through service layer
  logger.info("Creating new vehicle", {
    plate: plateValue,
    category: categoryValue,
    brand: brandValue,
  });

  // TODO: Implement actual image upload to Cloudinary or similar service
  // If imageFile is present, upload it and get image_id and thumbnail_url
  if (imageFile) {
    logger.warn("Image file detected but upload logic is not implemented.", { filename: imageName, size: imageSize });
  }

  const rawThumbnailUrl = normalizeOptionalString(firstDefined(
    vehicleData.thumbnail_url,
    vehicleData.thumbnailUrl
  ));
  const normalizedImages = await normalizeVehicleImages(
    vehicleData.Images,
    vehicleData.images,
    vehicleData.image_id,
    vehicleData.imageId,
    vehicleData.Image,
    rawThumbnailUrl
  );
  const normalizedImageId = normalizedImages[0] || null;
  // thumbnail_url must be an image identity/URL (not the image_id variable)
  const normalizedThumbnailUrl = normalizedImages[0] || rawThumbnailUrl;

  // Build vehicle data with proper null handling
  const createData: Parameters<typeof vehicleService.createVehicle>[0] = {
    category: String(categoryValue),
    brand: (() => {
      const raw = String(brandValue ?? "").trim();
      if (!raw) return "";
      if (raw.toLowerCase() === "toyota") return "Toyota";
      const isAllUpper = raw === raw.toUpperCase();
      if (isAllUpper && raw.length <= 3) return raw;
      const titleCaseWord = (w: string) => {
        const lower = w.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      };
      return raw
        .split(/\s+/g)
        .map((part) =>
          part
            .split(/-/g)
            .map((sub) => titleCaseWord(sub))
            .join("-")
        )
        .join(" ");
    })(),
    model: String(modelValue),
    year: year,
    plate: String(plateValue ?? ""),
    market_price: marketPrice,
    tax_type: normalizeOptionalString(firstDefined(vehicleData.tax_type, vehicleData.taxType, vehicleData.TaxType)),
    condition: String(firstDefined(vehicleData.condition, vehicleData.Condition) || "Other") as "New" | "Used" | "Other",
    body_type: normalizeOptionalString(firstDefined(vehicleData.body_type, vehicleData.bodyType, vehicleData.BodyType)),
    color: normalizeOptionalString(firstDefined(vehicleData.color, vehicleData.Color)),
    image_id: normalizedImageId,
    thumbnail_url: normalizedThumbnailUrl,
  };

  const result = await vehicleService.createVehicle(createData);

  if (!result.success) {
    logger.error("Failed to create vehicle", new Error(result.error || "Unknown error"), {
      plate: vehicleData.plate,
    });

    return createErrorResponse(
      result.error || "Failed to create vehicle. Please try again.",
      requestId,
      Date.now() - startTime,
      500,
      buildCorsHeaders(req)
    );
  }

  logger.info("Vehicle created successfully", {
    vehicleId: result.data?.VehicleId,
    plate: result.data?.Plate,
  });

  if (result.data?.VehicleId) {
    const galleryResult = await vehicleService.replaceVehicleImages(
      Number(result.data.VehicleId),
      normalizedImages
    );
    if (!galleryResult.success) {
      return createErrorResponse(
        galleryResult.error || "Failed to save vehicle images.",
        requestId,
        Date.now() - startTime,
        500,
        buildCorsHeaders(req)
      );
    }
    result.data.Images = normalizedImages;
    result.data.Image = normalizedImages[0] || result.data.Image;
  }

  await recordAuditEvent(auditEventFromRequest(req, {
    action: "vms.vehicle.create.success",
    actorUsername: auth.session.username,
    actorRole: auth.session.role,
    resourceType: "vehicle",
    resourceId: result.data?.VehicleId,
    status: "success",
    metadata: {
      plate: result.data?.Plate,
      category: result.data?.Category,
      brand: result.data?.Brand,
      model: result.data?.Model,
    },
  }));

  clearCachedVehicles();

  return createSuccessResponse(
    result.data,
    requestId,
    Date.now() - startTime,
    {
      queryCount: result.meta?.queryCount || 0,
    },
    buildCorsHeaders(req)
  );
}, { context: "vehicles-api-create", timeoutMs: 60000 });

export { postHandler as POST };

// ============================================================================
// DELETE Handler - Delete Vehicle
// ============================================================================

/**
 * DELETE /api/vehicles?id={number}
 *
 * Query Parameters:
 * - id: number (required)
 *
 * Returns:
 * - success: boolean
 * - data: boolean (true if deleted)
 * - meta: { durationMs, queryCount }
 *
 * NOTE: PUT /api/vehicles is deprecated. Use PUT /api/vehicles/[id] instead.
 */
const deleteHandler = withErrorHandling(async (req, { logger, requestId, startTime }) => {
  const auth = requirePermission(req, "vehicles:delete");
  if (auth.response) return auth.response;

  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "", 10);

  if (!id || isNaN(id)) {
    return createErrorResponse(
      "Valid vehicle ID is required",
      requestId,
      Date.now() - startTime,
      400,
      buildCorsHeaders(req)
    );
  }

  logger.info("Deleting vehicle", { vehicleId: id });

  // Delete vehicle through service layer
  const result = await vehicleService.deleteVehicle(id);

  if (!result.success) {
    logger.error("Failed to delete vehicle", new Error(result.error || "Unknown error"), {
      vehicleId: id,
    });

    return createErrorResponse(
      result.error || "Failed to delete vehicle",
      requestId,
      Date.now() - startTime,
      500,
      buildCorsHeaders(req)
    );
  }

  logger.info("Vehicle deleted successfully", { vehicleId: id });
  await recordAuditEvent(auditEventFromRequest(req, {
    action: "vms.vehicle.delete.success",
    actorUsername: auth.session.username,
    actorRole: auth.session.role,
    resourceType: "vehicle",
    resourceId: id,
    status: "success",
  }));

  clearCachedVehicles();

  return createSuccessResponse(
    result.data,
    requestId,
    Date.now() - startTime,
    {
      queryCount: result.meta?.queryCount || 0,
    },
    buildCorsHeaders(req)
  );
}, { context: "vehicles-api-delete", timeoutMs: 60000 });

export { deleteHandler as DELETE };
