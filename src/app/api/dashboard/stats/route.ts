import { requirePermission } from '@/lib/auth-helpers';
import { vehicleService } from '@/services/VehicleService';
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
    console.time('[DashboardStats]');

    // 🚀 FIX: Force refresh to bypass stale cache and get fresh data
    const result = await Promise.race([
      vehicleService.getVehicleStats(true), // Force refresh - bypass cache
      new Promise<never>((_, reject) => controller.signal.addEventListener('abort', () => reject(new Error('Stats timeout (10s)'))))
    ]);

    clearTimeout(timeoutId);
    console.timeEnd('[DashboardStats]');

    if (!result.success || !result.data) {
      console.error(`[DashboardStats] Service error (${Date.now() - startTime}ms):`, result.error);
      return NextResponse.json(
        {
          error: 'Failed to fetch stats',
          fallback: {
            total: 0,
            countsByCategory: { Cars: 0, Motorcycles: 0, TukTuks: 0 },
            countsByCondition: { New: 0, Used: 0 },
            noImageCount: 0,
            avgPrice: 0
          }
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


    // 🚀 Enhanced logging
    console.log(`[DashboardStats] ✅ Success: ${dashboardMeta.total} vehicles, ${result.meta?.durationMs || Date.now() - startTime}ms, cache: ${!!result.meta?.cacheHit}`);

    // 🚀 FIX: Add no-cache headers to ensure fresh data
    return NextResponse.json({
      success: true,
      data: dashboardMeta,
      meta: result.meta
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });

  } catch (error) {
    clearTimeout(timeoutId);
    console.timeEnd('[DashboardStats]');

    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[DashboardStats] ❌ ERROR (${duration}ms):`, errorMsg);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: errorMsg,
        fallback: {
          total: 0,
          countsByCategory: { Cars: 0, Motorcycles: 0, TukTuks: 0 },
          countsByCondition: { New: 0, Used: 0 },
          noImageCount: 0,
          avgPrice: 0
        },
        meta: { durationMs: duration }
      },
      { status: 500 }
    );
  }
}
