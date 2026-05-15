/**
 * Dashboard Page - Complete A-to-Z Refactor
 * 
 * Features:
 * A. Case-insensitive data counting with SQL LOWER()
 * B. O(n) Hash Map aggregation + 300ms debounced search
 * C. Fixed Recharts with proper containers + ssr: false
 * D. Skeleton loaders + 100% responsive mobile layout
 * 
 * @module DashboardPage
 */

import Dashboard from "@/app/components/dashboard/Dashboard";
import { vehicleService } from "@/services/VehicleService";
import { headers } from "next/headers";

// Disable ISR caching - always fetch fresh data
export const revalidate = 0;

// Force dynamic rendering for real-time data
export const dynamic = "force-dynamic";

function isIOSSafariUserAgent(userAgent: string): boolean {
  const isIOS = /iP(hone|ad|od)/i.test(userAgent);
  const isWebKit = /AppleWebKit/i.test(userAgent);
  const isNonSafariIOSBrowser = /(CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo)/i.test(userAgent);

  return isIOS && isWebKit && !isNonSafariIOSBrowser;
}

/**
 * Dashboard Server Component
 * Fetches initial data server-side with caching for performance
 */
export default async function DashboardPage() {
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent") || "";
  const isIOSSafari = isIOSSafariUserAgent(userAgent);
  const dashboardVehicleLimit = isIOSSafari ? 300 : 2000;

  // Fetch vehicles and stats in parallel
  // Use cache for better performance - stats don't change frequently
  const [vehiclesResult, statsResult] = await Promise.all([
    // Pull enough rows to keep dashboard search/charts aligned with totals.
    // Order newest first so freshly added vehicles appear immediately.
    vehicleService.getVehicles({ limit: dashboardVehicleLimit, orderBy: "id", orderDirection: "DESC" }),
    vehicleService.getVehicleStats(false), // Use cache (30s TTL) - much faster
  ]);

  // Extract data or use defaults
  const vehicles = vehiclesResult.success ? vehiclesResult.data || [] : [];
  const stats = statsResult.success ? statsResult.data : null;

// Build metadata for client - always provide valid meta, use defaults if stats is unavailable
  const meta = stats
    ? {
        total: stats.total,
        countsByCategory: {
          Cars: stats.byCategory.Cars || 0,
          Motorcycles: stats.byCategory.Motorcycles || 0,
          TukTuks: stats.byCategory.TukTuks || 0,
        },
        countsByCondition: {
          New: stats.byCondition.New || 0,
          Used: stats.byCondition.Used || 0,
        },
        noImageCount: stats.noImageCount,
        avgPrice: stats.avgPrice,
      }
    : {
        total: 0,
        countsByCategory: { Cars: 0, Motorcycles: 0, TukTuks: 0 },
        countsByCondition: { New: 0, Used: 0 },
        noImageCount: 0,
        avgPrice: 0,
      };

  return (
    <Dashboard
      initialVehicles={vehicles}
      initialMeta={meta}
      initialError={!vehiclesResult.success ? vehiclesResult.error || "Failed to load vehicles" : null}
      isIOSSafari={isIOSSafari}
    />
  );
}
