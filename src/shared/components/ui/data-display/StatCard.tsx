/**
 * StatCard Component - Data Display System
 * 
 * Reusable statistics card component with glassmorphism support.
 * Eliminates duplication of stat card patterns across the dashboard.
 * 
 * @module ui/data-display/StatCard
 */

"use client";

import React from "react";
import Link from "next/link";
import { ColorPalette, type ColorName } from "@/shared/utils/design-system/colors";
import { cn } from "@/shared/utils/ui";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: ColorName;
  href?: string;
  onClick?: () => void;
  className?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  glassmorphism?: boolean;
}

/**
 * StatCard - Unified statistics display component
 * 
 * Usage:
 *   <StatCard
 *     title="Total Vehicles"
 *     value={1234}
 *     subtitle="All categories"
 *     icon={<CarIcon />}
 *     color="emerald"
 *   />
 */
export function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = "emerald",
  href,
  onClick,
  className,
  trend,
  glassmorphism = false,
}: StatCardProps) {
  const colors = ColorPalette.get(color);

  const cardContent = (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl p-5 transition-all duration-300",
        glassmorphism
          ? "bg-white/70 dark:bg-gray-800/70 backdrop-blur-md border border-white/20 dark:border-gray-700/30 shadow-lg"
          : "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm",
        (href || onClick) && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
      onClick={onClick}
    >
      {/* Gradient accent */}
      <div
        className={cn(
          "absolute top-0 left-0 w-1 h-full bg-gradient-to-b",
          colors.gradient
        )}
      />

      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={cn(
                  "text-xs font-medium",
                  trend.isPositive ? "text-emerald-600" : "text-red-600"
                )}
              >
                {trend.isPositive ? "+" : ""}{trend.value}%
              </span>
              <svg
                className={cn(
                  "w-3 h-3",
                  trend.isPositive ? "text-emerald-600" : "text-red-600 rotate-180"
                )}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span className="text-xs text-gray-400">vs last month</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex-shrink-0 p-3 rounded-xl",
            colors.bg,
            colors.icon
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block no-underline">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}

/**
 * CompactStatCard - Smaller version for dense layouts
 */
export function CompactStatCard({
  title,
  value,
  icon,
  color = "emerald",
  className,
}: Omit<StatCardProps, "subtitle" | "href" | "onClick" | "trend" | "glassmorphism">) {
  const colors = ColorPalette.get(color);

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl",
        "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700",
        className
      )}
    >
      <div className={cn("p-2.5 rounded-lg", colors.bg, colors.icon)}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

/**
 * StatCardGrid - Container for multiple stat cards
 */
export function StatCardGrid({
  children,
  className,
  columns = 4,
}: {
  children: React.ReactNode;
  className?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
}) {
  const columnClasses = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5",
    6: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
  };

  return (
    <div className={cn("grid gap-4", columnClasses[columns], className)}>
      {children}
    </div>
  );
}
