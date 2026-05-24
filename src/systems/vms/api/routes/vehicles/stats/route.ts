/**
 * Vehicle Stats API - Fast aggregate queries
 */
import { requirePermission } from "@/lib/auth-helpers";
import { vehicleService } from "@/systems/vms/services/VehicleService";
import { NextRequest, NextResponse } from "next/server";

const EMPTY_STATS = {
  total: 0,
  byCategory: {
    Cars: 0,
    Motorcycles: 0,
    TukTuks: 0,
    Trucks: 0,
    Vans: 0,
    Buses: 0,
    Other: 0,
  },
  byCondition: {
    New: 0,
    Used: 0,
    Other: 0,
  },
  avgPrice: 0,
  noImageCount: 0,
};

function sumCounts(counts: Record<string, number> | undefined): number {
  if (!counts) return 0;
  return Object.values(counts).reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
}

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, "vehicles:view");
    if (auth.response) return auth.response;

    console.log("[API /vehicles/stats] Fetching full vehicle stats...");
    const result = await vehicleService.getVehicleStats();
    const stats = result.data || EMPTY_STATS;
    const categoryTotal = sumCounts(stats.byCategory);
    const conditionTotal = sumCounts(stats.byCondition);

    console.log("[API /vehicles/stats] Full stats response:", {
      success: result.success,
      total: stats.total,
      categoryTotal,
      conditionTotal,
      byCategory: stats.byCategory,
      byCondition: stats.byCondition,
      unaccountedByCategory: Math.max(0, stats.total - categoryTotal),
    });

    return NextResponse.json({
      success: result.success,
      data: stats,
      meta: result.meta
    });
  } catch (error) {
    console.error("[API /vehicles/stats] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

