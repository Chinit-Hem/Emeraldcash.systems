// Force dynamic rendering and disable caching to ensure fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import type { Vehicle } from "@/lib/types";
import { vehicleService, type VehicleDB } from "@/services/VehicleService";
import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert API camelCase vehicle data to database snake_case format
 */
function toVehicleDB(vehicle: Partial<Vehicle>): Partial<VehicleDB> {
  const dbVehicle: Partial<VehicleDB> = {};
  
  if (vehicle.Brand !== undefined) dbVehicle.brand = vehicle.Brand;
  if (vehicle.Model !== undefined) dbVehicle.model = vehicle.Model;
  if (vehicle.Category !== undefined) dbVehicle.category = vehicle.Category;
  if (vehicle.Plate !== undefined) dbVehicle.plate = vehicle.Plate;
  if (vehicle.Year !== undefined) dbVehicle.year = vehicle.Year ?? undefined;
  if (vehicle.PriceNew !== undefined) dbVehicle.market_price = vehicle.PriceNew ?? undefined;
  if (vehicle.Condition !== undefined) dbVehicle.condition = vehicle.Condition;
  if (vehicle.Color !== undefined) dbVehicle.color = vehicle.Color;
  if (vehicle.BodyType !== undefined) dbVehicle.body_type = vehicle.BodyType;
  if (vehicle.TaxType !== undefined) dbVehicle.tax_type = vehicle.TaxType;
  if (vehicle.Image !== undefined) dbVehicle.image_id = vehicle.Image;
  
  return dbVehicle;
}

/**
 * Convert full API vehicle to database format for create operations
 */
function toCreateVehicleDB(vehicle: Partial<Vehicle>): Omit<VehicleDB, "id" | "created_at" | "updated_at"> {
  return {
    brand: vehicle.Brand || "",
    model: vehicle.Model || "",
    category: vehicle.Category || "",
    plate: vehicle.Plate || "",
year: (vehicle.Year ?? undefined) as number ?? null,
    market_price: (vehicle.PriceNew ?? undefined) as number ?? null,
    condition: vehicle.Condition || "Used",
    color: (vehicle.Color ?? undefined) as string ?? null,
    body_type: vehicle.BodyType || null,
    tax_type: vehicle.TaxType || null,
    image_id: vehicle.Image || null,
    thumbnail_url: null,
  };
}

// CORS headers
function buildCorsHeaders(req: NextRequest) {
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
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  });

  if (allowedOrigin !== "*") {
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  return headers;
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(req),
  });
}

// GET /api/cleaned-vehicles - Get all cleaned vehicles or a single vehicle by ID
// Uses VehicleService for optimized ILIKE filtering and SSR performance
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(req.url);
    
    // Check if requesting a single vehicle by ID
    const vehicleId = searchParams.get("id");
    if (vehicleId) {
      const vehicleIdNum = parseInt(vehicleId);
      if (isNaN(vehicleIdNum)) {
        return NextResponse.json({
          success: false,
          error: "Invalid vehicle ID format",
        }, {
          status: 400,
          headers: buildCorsHeaders(req),
        });
      }

      // Fetch single vehicle
      const result = await vehicleService.getVehicleById(vehicleIdNum);
      
      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error || "Vehicle not found",
        }, {
          status: result.error?.includes("not found") ? 404 : 500,
          headers: buildCorsHeaders(req),
        });
      }

      const responseHeaders = new Headers(buildCorsHeaders(req));
      responseHeaders.set("X-Response-Time", `${Date.now() - startTime}ms`);

      return NextResponse.json({
        success: true,
        data: result.data ? [result.data] : [],
        meta: {
          durationMs: result.meta?.durationMs || (Date.now() - startTime),
        },
      }, {
        headers: responseHeaders,
      });
    }

const limit = parseInt(searchParams.get("limit") || "500"); // Increased for pagination fix (DB total 1218)
    const offset = parseInt(searchParams.get("offset") || "0");
    const category = searchParams.get("category");
    const brand = searchParams.get("brand");
    const searchTerm = searchParams.get("search");

    // Build filters object for VehicleService
    const filters = {
      limit,
      offset,
      ...(category && { category }),
      ...(brand && { brand }),
      ...(searchTerm && { searchTerm }),
    };

    // Use VehicleService for optimized query with ILIKE filtering
    const result = await vehicleService.getVehicles(filters);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || "Failed to fetch vehicles",
      }, {
        status: 500,
        headers: buildCorsHeaders(req),
      });
    }

    // Check if this is a stats-only request
    if (searchParams.get("stats") === "full") {
      const statsResult = await vehicleService.getVehicleStats(true); // Force refresh
      if (!statsResult.success) {
        return NextResponse.json({
          success: false,
          error: statsResult.error || "Failed to fetch stats",
        }, {
          status: 500,
          headers: buildCorsHeaders(req),
        });
      }
      
      return NextResponse.json({
        success: true,
        data: statsResult.data,
        meta: {
          durationMs: statsResult.meta?.durationMs || (Date.now() - startTime),
        },
      }, {
        headers: buildCorsHeaders(req),
      });
    }

    // Get accurate total count with no-cache (force fresh data)
    console.log('[API/cleaned-vehicles] Fetching fresh total count...');
    const totalResult = await vehicleService.getTotalCount(true); // noCache=true
const total = totalResult.success ? totalResult.data ?? 0 : 0;
    console.log(`[API/cleaned-vehicles] DB total: ${total} (filters: category=${category}, brand=${brand})`);

    // Add performance headers for monitoring + total debug header
    const responseHeaders = new Headers(buildCorsHeaders(req));
    responseHeaders.set("X-Response-Time", `${Date.now() - startTime}ms`);
    responseHeaders.set("X-Query-Count", String(result.meta?.queryCount || 1));
    responseHeaders.set("X-Total-Count", String(total));
    responseHeaders.set("X-Filter-Info", `limit=${limit},offset=${offset},category=${category||'none'},brand=${brand||'none'}`);

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + (result.data?.length || 0) < total,
        durationMs: result.meta?.durationMs || (Date.now() - startTime),
        totalSource: 'getTotalCount(true)', // Debug info
      },
    }, {
      headers: responseHeaders,
    });
    
  } catch (error) {
    console.error("[API /cleaned-vehicles] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch vehicles",
    }, {
      status: 500,
      headers: buildCorsHeaders(req),
    });
  }
}

// POST /api/cleaned-vehicles - Create a new vehicle
// Uses VehicleService for optimized insert with validation
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    
    // Validate required fields
    const requiredFields = ["Brand", "Model", "Category", "Plate"];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing required fields: ${missingFields.join(", ")}`,
      }, {
        status: 400,
        headers: buildCorsHeaders(req),
      });
    }

    // Convert to database format and create vehicle
    const vehicleData = toCreateVehicleDB({
      Brand: body.Brand.trim(),
      Model: body.Model.trim(),
      Category: body.Category.trim(),
      Plate: body.Plate.trim(),
      Year: body.Year ? parseInt(body.Year) : null,
      PriceNew: body.PriceNew ? parseFloat(body.PriceNew) : null,
      Condition: body.Condition || "Used",
      Color: body.Color || null,
      BodyType: body.BodyType || null,
      TaxType: body.TaxType || null,
      Image: body.Image || null,
    });

    // Use VehicleService to create vehicle
    const result = await vehicleService.createVehicle(vehicleData);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || "Failed to create vehicle",
      }, {
        status: 500,
        headers: buildCorsHeaders(req),
      });
    }

    // Add performance headers
    const responseHeaders = new Headers(buildCorsHeaders(req));
    responseHeaders.set("X-Response-Time", `${Date.now() - startTime}ms`);

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: {
        durationMs: result.meta?.durationMs || (Date.now() - startTime),
      },
    }, {
      status: 201,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error("[API /cleaned-vehicles POST] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create vehicle",
    }, {
      status: 500,
      headers: buildCorsHeaders(req),
    });
  }
}

// PUT /api/cleaned-vehicles - Update an existing vehicle
// Uses VehicleService for optimized update with validation
export async function PUT(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    
    // Validate required fields
    if (!body.VehicleId) {
      return NextResponse.json({
        success: false,
        error: "VehicleId is required for update",
      }, {
        status: 400,
        headers: buildCorsHeaders(req),
      });
    }

    // Prepare update data (only include defined fields)
    const updateData: Partial<Vehicle> = {};
    
    if (body.Brand !== undefined) updateData.Brand = body.Brand.trim();
    if (body.Model !== undefined) updateData.Model = body.Model.trim();
    if (body.Category !== undefined) updateData.Category = body.Category.trim();
    if (body.Plate !== undefined) updateData.Plate = body.Plate.trim();
    if (body.Year !== undefined) updateData.Year = body.Year ? parseInt(body.Year) : null;
    if (body.PriceNew !== undefined) updateData.PriceNew = body.PriceNew ? parseFloat(body.PriceNew) : null;
    if (body.Price40 !== undefined) updateData.Price40 = body.Price40 ? parseFloat(body.Price40) : null;
    if (body.Price70 !== undefined) updateData.Price70 = body.Price70 ? parseFloat(body.Price70) : null;
    if (body.Condition !== undefined) updateData.Condition = body.Condition;
    if (body.Color !== undefined) updateData.Color = body.Color;
    if (body.BodyType !== undefined) updateData.BodyType = body.BodyType;
    if (body.TaxType !== undefined) updateData.TaxType = body.TaxType;
    if (body.Image !== undefined) updateData.Image = body.Image;

    // Convert to database format and update vehicle
    const dbUpdateData = toVehicleDB(updateData);
    const vehicleId = parseInt(body.VehicleId);
    
    if (isNaN(vehicleId)) {
      return NextResponse.json({
        success: false,
        error: "Invalid VehicleId format",
      }, {
        status: 400,
        headers: buildCorsHeaders(req),
      });
    }

    // Use VehicleService to update vehicle
    const result = await vehicleService.updateVehicle(vehicleId, dbUpdateData);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || "Failed to update vehicle",
      }, {
        status: 500,
        headers: buildCorsHeaders(req),
      });
    }

    // Add performance headers
    const responseHeaders = new Headers(buildCorsHeaders(req));
    responseHeaders.set("X-Response-Time", `${Date.now() - startTime}ms`);

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: {
        durationMs: result.meta?.durationMs || (Date.now() - startTime),
      },
    }, {
      headers: responseHeaders,
    });

  } catch (error) {
    console.error("[API /cleaned-vehicles PUT] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update vehicle",
    }, {
      status: 500,
      headers: buildCorsHeaders(req),
    });
  }
}

// DELETE /api/cleaned-vehicles - Delete a vehicle
// Uses VehicleService for optimized delete with validation
export async function DELETE(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get("id");

    if (!vehicleId) {
      return NextResponse.json({
        success: false,
        error: "VehicleId is required for deletion",
      }, {
        status: 400,
        headers: buildCorsHeaders(req),
      });
    }

    // Parse and validate vehicle ID
    const vehicleIdNum = parseInt(vehicleId);
    if (isNaN(vehicleIdNum)) {
      return NextResponse.json({
        success: false,
        error: "Invalid VehicleId format",
      }, {
        status: 400,
        headers: buildCorsHeaders(req),
      });
    }

    // Use VehicleService to delete vehicle
    const result = await vehicleService.deleteVehicle(vehicleIdNum);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || "Failed to delete vehicle",
      }, {
        status: 500,
        headers: buildCorsHeaders(req),
      });
    }

    // Add performance headers
    const responseHeaders = new Headers(buildCorsHeaders(req));
    responseHeaders.set("X-Response-Time", `${Date.now() - startTime}ms`);

    return NextResponse.json({
      success: true,
      data: { deleted: true, vehicleId },
      meta: {
        durationMs: result.meta?.durationMs || (Date.now() - startTime),
      },
    }, {
      headers: responseHeaders,
    });

  } catch (error) {
    console.error("[API /cleaned-vehicles DELETE] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete vehicle",
    }, {
      status: 500,
      headers: buildCorsHeaders(req),
    });
  }
}
