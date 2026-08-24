/**
 * Recharts Bar Chart Wrapper
 * 
 * Internal component that uses recharts directly.
 * This is dynamically imported with ssr: false to prevent hydration errors.
 * 
 * @module RechartsBarChart
 */

"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BarDatum } from "@/systems/vms/utils/analytics";
import { useChartTheme } from "@/systems/vms/components/dashboard/charts/useChartTheme";

type RechartsBarChartProps = {
  data: BarDatum[];
  width?: number;
  height?: number;
};

function shortLabel(label: string, max = 10) {
  const raw = String(label || "");
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max - 1)}…`;
}

export default function RechartsBarChart({ data, width = 300, height = 300 }: RechartsBarChartProps) {
  const chartTheme = useChartTheme();

  return (
    <ResponsiveContainer width={width} height={height} minWidth={0} minHeight={0}>
      <BarChart data={data} margin={{ top: 10, right: 10, bottom: 24, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
        <XAxis
          dataKey="name"
          interval={0}
          tick={{ fontSize: 12, fontWeight: 500, fill: chartTheme.tickFill }}
          stroke={chartTheme.axisStroke}
          tickFormatter={(v) => shortLabel(String(v), 10)}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 12, fontWeight: 500, fill: chartTheme.tickFill }}
          stroke={chartTheme.axisStroke}
        />
        <Tooltip
          formatter={(value: unknown) => [String(value), "Vehicles"]}
          contentStyle={chartTheme.tooltipContentStyle}
          labelStyle={chartTheme.tooltipLabelStyle}
          itemStyle={chartTheme.tooltipItemStyle}
        />
        <Bar
          dataKey="value"
          fill="#16a34a"
          stroke="#166534"
          strokeOpacity={0.6}
          strokeWidth={1}
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
