/**
 * Vehicles by Brand Chart
 * 
 * Bar chart showing vehicle distribution by brand.
 * Uses dynamic import with ssr: false to prevent hydration errors.
 * 
 * @module VehiclesByBrandChart
 */

"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { BarDatum } from "@/systems/vms/utils/analytics";

type VehiclesByBrandChartProps = {
  data: BarDatum[];
};

function ChartSkeleton() {
  return (
    <div 
      className="w-full flex items-center justify-center"
      style={{ height: '300px' }}
    >
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
    </div>
  );
}

// Internal component that receives explicit dimensions
function RechartsBarChartWithDimensions({ data, width, height }: { data: BarDatum[]; width: number; height: number }) {
  const RechartsBarChart = dynamic(
    () => import("@/systems/vms/components/dashboard/charts/RechartsBarChart").then((mod) => mod.default),
    { ssr: false }
  );
  return <RechartsBarChart data={data} width={width} height={height} />;
}

export default function VehiclesByBrandChart({ data }: VehiclesByBrandChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    const timeoutId = setTimeout(() => setIsMounted(true), 0);
    
    if (!containerRef.current) {
      return () => clearTimeout(timeoutId);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, []);

  if (data.length === 0) {
    return (
      <div 
        className="w-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400"
        style={{ height: '300px' }}
      >
        No data available
      </div>
    );
  }

  const hasValidDimensions = dimensions.width > 0 && dimensions.height > 0;

  return (
    <div 
      ref={containerRef}
      style={{ height: '300px', width: '100%', minHeight: '300px', minWidth: '100%' }}
    >
      {isMounted && hasValidDimensions ? (
        <RechartsBarChartWithDimensions data={data} width={dimensions.width} height={dimensions.height} />
      ) : (
        <ChartSkeleton />
      )}
    </div>
  );
}
