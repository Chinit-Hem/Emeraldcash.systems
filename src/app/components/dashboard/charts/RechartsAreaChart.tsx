/**
 * Recharts Area Chart Wrapper
 * 
 * Internal component that uses recharts directly.
 * This is dynamically imported with ssr: false to prevent hydration errors.
 * 
 * @module RechartsAreaChart
 */

"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BarDatum } from "@/lib/analytics";
import { useChartTheme } from "./useChartTheme";

type RechartsAreaChartProps = {
  data: BarDatum[];
  width?: number;
  height?: number;
};

export default function RechartsAreaChart({ data, width = 300, height = 300 }: RechartsAreaChartProps) {
  const chartTheme = useChartTheme();

  return (
    <ResponsiveContainer width={width} height={height} minWidth={0} minHeight={0}>
      <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 24, left: 10 }}>
        <defs>
          <linearGradient id="colorVehicles" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12, fontWeight: 500, fill: chartTheme.tickFill }}
          stroke={chartTheme.axisStroke}
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
        <Area
          type="monotone"
          dataKey="value"
          stroke="#10b981"
          fillOpacity={1}
          fill="url(#colorVehicles)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
