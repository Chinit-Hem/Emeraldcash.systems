"use client";

import EnhancedDashboard from "@/systems/vms/components/dashboard/EnhancedDashboard";
import ErrorBoundary from "@/shared/components/ErrorBoundary";
import { NeuDashboardSkeleton } from "@/shared/components/skeletons";
import { useVehiclesNeon, useVehicleStats } from "@/systems/vms/hooks/useVehiclesNeon";
import { Suspense, useEffect, useState } from "react";

type DashboardMeta = {
  total: number;
  countsByCategory: {
    Cars: number;
    Motorcycles: number;
    TukTuks: number;
  };
  countsByCondition: {
    New: number;
    Used: number;
  };
  noImageCount: number;
  avgPrice: number;
};

function detectIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false;

  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const isIOS =
    /iP(hone|ad|od)/i.test(userAgent) ||
    (platform === "MacIntel" && maxTouchPoints > 1);
  const isWebKit = /AppleWebKit/i.test(userAgent);
  const isNonSafariIOSBrowser = /(CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo)/i.test(userAgent);

  return isIOS && isWebKit && !isNonSafariIOSBrowser;
}

/**
 * Dashboard Page - Client component with data fetching
 * Provides initial props to EnhancedDashboard from useVehiclesNeon
 */
export default function Page() {
  const [isIOSSafari, setIsIOSSafari] = useState(detectIOSSafari);

  // Clear SWR cache on mount to ensure fresh data
  useEffect(() => {
    setIsIOSSafari(detectIOSSafari());
  }, []);

  const { vehicles, meta, error, loading } = useVehiclesNeon({
    limit: isIOSSafari ? 150 : 500,
  });
  const { stats } = useVehicleStats(120000);

  const dashboardMeta: DashboardMeta = {
    // Use stats.total if available (accurate count from DB), otherwise show loading state
    total: stats?.total ?? meta?.total ?? 0,
    countsByCategory: {
      Cars: stats?.byCategory?.Cars || 0,
      Motorcycles: stats?.byCategory?.Motorcycles || 0,
      TukTuks: stats?.byCategory?.TukTuks || 0,
    },
    countsByCondition: {
      New: stats?.byCondition?.New || 0,
      Used: stats?.byCondition?.Used || 0,
    },
    noImageCount: (stats?.noImageCount ?? meta?.noImageCount) || 0,
    avgPrice: stats?.avgPrice || 0,
  };

  if (loading && vehicles.length === 0) {
    return <NeuDashboardSkeleton />;
  }

  return (
    <ErrorBoundary fallback={<NeuDashboardSkeleton />}>
      <Suspense fallback={<NeuDashboardSkeleton />}>
        <EnhancedDashboard 
          initialVehicles={vehicles.slice(0, 50)}
          initialMeta={dashboardMeta}
          initialError={error ? 'Failed to load dashboard data' : null}
          isIOSSafari={isIOSSafari}
        />
      </Suspense>
    </ErrorBoundary>
  );
}

