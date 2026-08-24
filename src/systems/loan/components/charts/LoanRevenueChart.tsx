"use client";

import { useEffect, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useChartTheme } from "@/systems/vms/components/dashboard/charts/useChartTheme";

type BarDatum = { name: string; value: number };

function ChartSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`flex h-full min-h-[18rem] w-full items-center justify-center ${className}`}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
    </div>
  );
}

function compactCurrencyTick(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${value / 1_000_000}M`;
  if (Math.abs(value) >= 1_000) return `${value / 1_000}k`;
  return String(value);
}

export default function LoanRevenueChart({ data, className = "" }: { data: BarDatum[]; className?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const chartTheme = useChartTheme();

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        if (width > 0 && height > 0) setDimensions({ width, height });
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  if (!data || data.length === 0) {
    return (
      <div ref={containerRef} className={`flex h-full min-h-[18rem] w-full items-center justify-center text-sm text-slate-500 dark:text-slate-400 ${className}`}>
        No revenue data yet.
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`h-full min-h-[18rem] w-full ${className}`}>
      {dimensions.width > 0 && dimensions.height > 0 ? (
        <ResponsiveContainer width={dimensions.width} height={dimensions.height} minWidth={0} minHeight={0}>
          <BarChart data={data} margin={{ top: 12, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid vertical={false} stroke={chartTheme.gridStroke} />
            <XAxis
              dataKey="name"
              interval={0}
              axisLine={{ stroke: chartTheme.axisStroke }}
              tickLine={false}
              tick={{ fontSize: 14, fontWeight: 500, fill: chartTheme.tickFill }}
              tickMargin={14}
            />
            <YAxis
              allowDecimals={false}
              axisLine={{ stroke: chartTheme.axisStroke }}
              tickLine={false}
              tick={{ fontSize: 14, fontWeight: 500, fill: chartTheme.tickFill }}
              tickFormatter={compactCurrencyTick}
              width={48}
            />
            <Tooltip
              formatter={(value: unknown) => [Number(value).toLocaleString(), "Base Revenue"]}
              contentStyle={chartTheme.tooltipContentStyle}
              labelStyle={chartTheme.tooltipLabelStyle}
              itemStyle={chartTheme.tooltipItemStyle}
            />
            <Bar dataKey="value" fill="#16a34a" maxBarSize={260} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ChartSkeleton />
      )}
    </div>
  );
}
