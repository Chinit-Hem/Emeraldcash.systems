/**
 * Vehicles Edge API Route - Neon-Optimized for useVehiclesNeon
 * Identical to /api/vehicles but with edge runtime optimizations
 */
import { vehicleService } from "@/services/VehicleService";
import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse, createSuccessResponse, withErrorHandling } from "@/lib/api-error-wrapper";
import type { VehicleFilters } from "@/types/vehicle";

// Use edge runtime for faster cold starts
// Removed edge runtime - Neon deps incompatible
// export const runtime = "edge";

function buildCorsHeaders(req: NextRequest): Headers {
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN || "*";
  const headers = new Headers({
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  if (allowedOrigin !== "*") {
    headers.set("Access-Control-Allow-Credentials", "true");
  }
  return headers;
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: buildCorsHeaders(req) });
}

const getHandler = withErrorHandling(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  
  const filters: VehicleFilters = {
    limit: parseInt(searchParams.get("limit") || "500"),
    offset: parseInt(searchParams.get("offset") || "0"),
  };

  // Quick filters for dashboard
  if (searchParams.get("category")) filters.category = searchParams.get("category")!;
  if (searchParams.get("brand")) filters.brand = searchParams.get("brand")!;
  if (searchParams.get("search")) filters.searchTerm = searchParams.get("search")!;
  if (searchParams.get("cursor")) filters.offset = parseInt(searchParams.get("cursor")!) * filters.limit!;

  const result = await vehicleService.getVehicles(filters);
  
  if (!result.success) {
    return createErrorResponse(result.error!, "edge-vehicles", 0, 500, buildCorsHeaders(req));
  }

  // 🚀 Fuzzy search suggestions: if search term is present but few/no results,
  // generate suggestions using Levenshtein distance for typo tolerance.
  let suggestions: unknown[] | undefined;
  const searchTerm = filters.searchTerm;
  if (searchTerm && result.data.length < 3) {
    try {
      const suggestResult = await vehicleService.getSearchSuggestions(searchTerm, 5);
      if (suggestResult.success && suggestResult.data.length > 0) {
        suggestions = suggestResult.data.map((s) => ({
          vehicleId: s.vehicle.VehicleId,
          brand: s.vehicle.Brand,
          model: s.vehicle.Model,
          category: s.vehicle.Category,
          plate: s.vehicle.Plate,
          score: Math.round(s.score * 100) / 100,
          matchedField: s.matchedField,
          highlightText: s.highlightText,
        }));
      }
    } catch {
      // Silently ignore suggestion errors so main request still succeeds
    }
  }

  return createSuccessResponse(
    result.data,
    "edge-vehicles",
    0,
    { total: result.data.length, ...filters, suggestions },
    buildCorsHeaders(req)
  );
}, { context: "vehicles-edge" });

export { getHandler as GET };

