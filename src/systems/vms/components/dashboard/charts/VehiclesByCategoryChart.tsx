/**
 * Vehicles by Category Chart
 * 
 * Pie chart showing vehicle distribution by category.
 * Uses dynamic import with ssr: false to prevent hydration errors.
 * 
 * @module VehiclesByCategoryChart
 */

"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { PieDatum } from "@/systems/vms/utils/analytics";

type VehiclesByCategoryChartProps = {
  data: PieDatum[];
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
function RechartsPieChartWithDimensions({ data, width, height }: { data: PieDatum[]; width: number; height: number }) {
  const RechartsPieChart = dynamic(
    () => import("@/systems/vms/components/dashboard/charts/RechartsPieChart").then((mod) => mod.default),
    { ssr: false }
  );
  return <RechartsPieChart data={data} width={width} height={height} />;
}

export default function VehiclesByCategoryChart({ data }: VehiclesByCategoryChartProps) {
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

  // Only render chart when we have valid dimensions and component is mounted
  const hasValidDimensions = dimensions.width > 0 && dimensions.height > 0;

  return (
    <div 
      ref={containerRef}
      style={{ height: '300px', width: '100%', minHeight: '300px', minWidth: '100%' }}
    >
      {isMounted && hasValidDimensions ? (
        <RechartsPieChartWithDimensions data={data} width={dimensions.width} height={dimensions.height} />
      ) : (
        <ChartSkeleton />
      )}
    </div>
  );
}
