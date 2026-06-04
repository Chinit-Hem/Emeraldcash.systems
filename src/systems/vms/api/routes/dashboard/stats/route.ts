import { requirePermission } from '@/lib/auth-helpers';
import { vehicleService } from '@/systems/vms/services/VehicleService';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/dashboard/stats
 * Server-side aggregated vehicle statistics
 * Cached 30s for dashboard performance
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const auth = requirePermission(request, 'vehicles:view');
  if (auth.response) return auth.response;

  // 🚀 Add 10s timeout for dashboard stats
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const result = await Promise.race([
      vehicleService.getVehicleStats(),
      new Promise<never>((_, reject) => controller.signal.addEventListener('abort', () => reject(new Error('Stats timeout (10s)'))))
    ]);

    clearTimeout(timeoutId);

    if (!result.success || !result.data) {
      console.error(`[DashboardStats] Service error (${Date.now() - startTime}ms):`, result.error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch stats',
          details: result.error,
          meta: { durationMs: Date.now() - startTime }
        },
        { status: 500 }
      );
    }

    // Map VehicleStats to DashboardMeta format (EnhancedDashboard expects this)
    const dashboardMeta = {
      total: result.data.total,
      countsByCategory: {
        Cars: result.data.byCategory?.Cars || 0,
        Motorcycles: result.data.byCategory?.Motorcycles || 0,
        TukTuks: result.data.byCategory?.TukTuks || 0,
      },
      countsByCondition: {
        New: result.data.byCondition?.New || 0,
        Used: result.data.byCondition?.Used || 0,
      },
      noImageCount: result.data.noImageCount || 0,
      avgPrice: result.data.avgPrice || 0,
    };

    return NextResponse.json({
      success: true,
      data: dashboardMeta,
      meta: result.meta
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, stale-while-revalidate=60',
      }
    });

  } catch (error) {
    clearTimeout(timeoutId);

    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[DashboardStats] ❌ ERROR (${duration}ms):`, errorMsg);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: errorMsg,
        meta: { durationMs: duration }
      },
      { status: 500 }
    );
  }
}
