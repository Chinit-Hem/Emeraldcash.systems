/**
 * New vs Used Chart
 * 
 * Pie chart showing new vs used vehicle distribution.
 * Uses dynamic import with ssr: false to prevent hydration errors.
 * 
 * @module NewVsUsedChart
 */

"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { PieDatum } from "@/systems/vms/utils/analytics";
import { useMounted } from "@/shared/hooks/useMounted";

type NewVsUsedChartProps = {
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

export default function NewVsUsedChart({ data }: NewVsUsedChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const isMounted = useMounted();

  useEffect(() => {
    if (!containerRef.current || !isMounted) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [isMounted]);

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
        <RechartsPieChartWithDimensions data={data} width={dimensions.width} height={dimensions.height} />
      ) : (
        <ChartSkeleton />
      )}
    </div>
  );
}
