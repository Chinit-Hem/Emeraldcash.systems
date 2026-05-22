// Force dynamic rendering and disable caching to ensure fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { logAuditEvent } from "@/lib/audit-log";
import { requirePermission } from "@/lib/auth-helpers";
import { buildCorsHeaders } from "@/lib/cors";
import { vehicleService } from "@/services/VehicleService";
import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert API camelCase vehicle data to database snake_case format for updates
 */
function toVehicleDB(vehicle: Record<string, unknown>): Record<string, unknown> {
  const dbVehicle: Record<string, unknown> = {};

  if (vehicle.Brand !== undefined) dbVehicle.brand = vehicle.Brand;
  if (vehicle.Model !== undefined) dbVehicle.model = vehicle.Model;
  if (vehicle.Category !== undefined) dbVehicle.category = vehicle.Category;
  if (vehicle.Plate !== undefined) dbVehicle.plate = vehicle.Plate;
  if (vehicle.Year !== undefined) dbVehicle.year = vehicle.Year;
  if (vehicle.PriceNew !== undefined) dbVehicle.market_price = vehicle.PriceNew;
  if (vehicle.Condition !== undefined) dbVehicle.condition = vehicle.Condition;
  if (vehicle.Color !== undefined) dbVehicle.color = vehicle.Color;
  if (vehicle.BodyType !== undefined) dbVehicle.body_type = vehicle.BodyType;
  if (vehicle.TaxType !== undefined) dbVehicle.tax_type = vehicle.TaxType;
  if (vehicle.Image !== undefined) dbVehicle.image_id = vehicle.Image;

  return dbVehicle;
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(req),
  });
}

// ============================================================================
// GET /api/cleaned-vehicles/[id] - Get a single vehicle by ID
// ============================================================================
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requirePermission(req, "vehicles:view");
  if (auth.response) return auth.response;

  const startTime = Date.now();

  try {
    const { id } = await params;
    const vehicleIdNum = parseInt(id);

    if (isNaN(vehicleIdNum)) {
      return NextResponse.json({
        success: false,
        error: "Invalid vehicle ID format",
      }, {
        status: 400,
        headers: buildCorsHeaders(req),
      });
    }

    // Fetch single vehicle by ID
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
    console.error("[API /cleaned-vehicles/[id]] GET Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch vehicle",
    }, {
      status: 500,
      headers: buildCorsHeaders(req),
    });
  }
}

// ============================================================================
// PUT /api/cleaned-vehicles/[id] - Update a vehicle by ID
// ============================================================================
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requirePermission(req, "vehicles:edit");
  if (auth.response) return auth.response;

  const startTime = Date.now();

  try {
    const { id } = await params;
    const vehicleIdNum = parseInt(id);

    if (isNaN(vehicleIdNum)) {
      return NextResponse.json({
        success: false,
        error: "Invalid vehicle ID format",
      }, {
        status: 400,
        headers: buildCorsHeaders(req),
      });
    }

    const body = await req.json();

    // Trim string fields
    const updateData: Record<string, unknown> = {};

    if (body.Brand !== undefined) updateData.Brand = String(body.Brand).trim();
    if (body.Model !== undefined) updateData.Model = String(body.Model).trim();
    if (body.Category !== undefined) updateData.Category = String(body.Category).trim();
    if (body.Plate !== undefined) updateData.Plate = String(body.Plate).trim();
    if (body.Year !== undefined) updateData.Year = body.Year ? parseInt(body.Year) : null;
    if (body.market_price !== undefined) updateData.market_price = body.market_price ? parseFloat(body.market_price) : null;
    if (body.PriceNew !== undefined) updateData.PriceNew = body.PriceNew ? parseFloat(body.PriceNew) : null;
    if (body.Condition !== undefined) updateData.Condition = body.Condition;
    if (body.Color !== undefined) updateData.Color = body.Color;
    if (body.BodyType !== undefined) updateData.BodyType = body.BodyType;
    if (body.TaxType !== undefined) updateData.TaxType = body.TaxType;
    if (body.Image !== undefined) updateData.Image = body.Image;
    if (body.image_id !== undefined) updateData.image_id = body.image_id;

    // Convert to database format
    const dbUpdateData = toVehicleDB(updateData);

    // Update vehicle
    const result = await vehicleService.updateVehicle(vehicleIdNum, dbUpdateData);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || "Failed to update vehicle",
      }, {
        status: 500,
        headers: buildCorsHeaders(req),
      });
    }

    await logAuditEvent(req, auth.session, {
      action: "vehicle.update",
      entityType: "vehicle",
      entityId: vehicleIdNum,
      metadata: {
        source: "cleaned-vehicles-id",
        fields: Object.keys(dbUpdateData),
        plate: result.data?.Plate,
      },
    });

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
    console.error("[API /cleaned-vehicles/[id]] PUT Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update vehicle",
    }, {
      status: 500,
      headers: buildCorsHeaders(req),
    });
  }
}

// ============================================================================
// DELETE /api/cleaned-vehicles/[id] - Delete a vehicle by ID
// ============================================================================
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requirePermission(req, "vehicles:delete");
  if (auth.response) return auth.response;

  const startTime = Date.now();

  try {
    const { id } = await params;
    const vehicleIdNum = parseInt(id);

    if (isNaN(vehicleIdNum)) {
      return NextResponse.json({
        success: false,
        error: "Invalid vehicle ID format",
      }, {
        status: 400,
        headers: buildCorsHeaders(req),
      });
    }

    // Delete vehicle
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

    await logAuditEvent(req, auth.session, {
      action: "vehicle.delete",
      entityType: "vehicle",
      entityId: vehicleIdNum,
      metadata: {
        source: "cleaned-vehicles-id",
      },
    });

    // Add performance headers
    const responseHeaders = new Headers(buildCorsHeaders(req));
    responseHeaders.set("X-Response-Time", `${Date.now() - startTime}ms`);

    return NextResponse.json({
      success: true,
      data: { deleted: true, vehicleId: id },
      meta: {
        durationMs: result.meta?.durationMs || (Date.now() - startTime),
      },
    }, {
      headers: responseHeaders,
    });

  } catch (error) {
    console.error("[API /cleaned-vehicles/[id]] DELETE Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete vehicle",
    }, {
      status: 500,
      headers: buildCorsHeaders(req),
    });
  }
}
