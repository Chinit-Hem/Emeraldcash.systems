/**
 * Recharts Pie Chart Wrapper
 * 
 * Internal component that uses recharts directly.
 * This is dynamically imported with ssr: false to prevent hydration errors.
 * 
 * @module RechartsPieChart
 */

"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { PieDatum } from "@/lib/analytics";
import { useChartTheme } from "./useChartTheme";

type RechartsPieChartProps = {
  data: PieDatum[];
  width?: number;
  height?: number;
};

export default function RechartsPieChart({ data, width = 300, height = 300 }: RechartsPieChartProps) {
  const chartTheme = useChartTheme();

  return (
    <ResponsiveContainer width={width} height={height} minWidth={0} minHeight={0}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          stroke={chartTheme.pieStroke}
          strokeOpacity={0.5}
          strokeWidth={1}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: unknown) => [String(value), "Vehicles"]}
          contentStyle={chartTheme.tooltipContentStyle}
          labelStyle={chartTheme.tooltipLabelStyle}
          itemStyle={chartTheme.tooltipItemStyle}
        />
        <Legend wrapperStyle={chartTheme.legendStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}
