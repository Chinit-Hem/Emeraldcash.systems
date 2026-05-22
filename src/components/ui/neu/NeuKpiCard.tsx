/**
 * NeuKpiCard Component - Premium Professional Neumorphism Design
 * 
 * A stunning, professional Neumorphism (Soft UI) statistics card component.
 * Features refined soft shadows, category-specific icons, smooth interactions,
 * advanced visual effects, and premium aesthetics for an exceptional user experience.
 * 
 * @module ui/neu/NeuKpiCard
 */

"use client";

import React from "react";
import { TukTukIcon as TukTukVehicleIcon } from "@/components/icons/TukTukIcon";
import { cn } from "@/lib/ui";

// ============================================================================
// Types & Interfaces
// ============================================================================

type CategoryType = "total" | "cars" | "motorcycles" | "tuktuks" | "price";

interface NeuKpiCardProps {
  /** Card category determining icon and color scheme */
  category: CategoryType;
  /** Label text displayed above value */
  label: string;
  /** Main value to display (formatted string) */
  value: string;
  /** Optional subtitle text */
  subtitle?: string;
  /** Optional click handler */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether the card is in an active/selected state */
  isActive?: boolean;
  /** Optional trend indicator (positive/negative) */
  trend?: "up" | "down" | "neutral";
  /** Optional trend value */
  trendValue?: string;
}

// ============================================================================
// Icon Components - Enhanced with refined strokes
// ============================================================================

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

const TotalIcon = ({ className, style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
    <circle cx="7" cy="17" r="2" />
    <path d="M9 17h6" />
    <circle cx="17" cy="17" r="2" />
  </svg>
);

const CarIcon = ({ className, style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2" />
    <circle cx="6.5" cy="16.5" r="2.5" />
    <circle cx="16.5" cy="16.5" r="2.5" />
  </svg>
);

const MotorcycleIcon = ({ className, style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5.5" cy="17.5" r="3.5" />
    <circle cx="18.5" cy="17.5" r="3.5" />
    <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 2h2" />
    <path d="M8 14v4" />
    <path d="M16 14h.01" />
  </svg>
);

const TukTukIcon = ({ className, style }: IconProps) => (
  <TukTukVehicleIcon className={className} style={style} />
);

const PriceIcon = ({ className, style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
    <path d="M12 18V6" />
  </svg>
);

const TrendUpIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17l5-5 5 5M12 12V3" />
  </svg>
);

const TrendDownIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 7l5 5 5-5M12 12v9" />
  </svg>
);

// ============================================================================
// Category Configuration - Premium Color Palette
// ============================================================================

const categoryConfig: Record<CategoryType, {
  icon: React.FC<IconProps>;
  color: string;
  colorLight: string;
  colorDark: string;
  gradientFrom: string;
  gradientTo: string;
  label: string;
}> = {
  total: {
    icon: TotalIcon,
    color: "#10b981",
    colorLight: "#34d399",
    colorDark: "#059669",
    gradientFrom: "#34d399",
    gradientTo: "#059669",
    label: "Total Vehicles",
  },
  cars: {
    icon: CarIcon,
    color: "#3b82f6",
    colorLight: "#60a5fa",
    colorDark: "#2563eb",
    gradientFrom: "#60a5fa",
    gradientTo: "#2563eb",
    label: "Cars",
  },
  motorcycles: {
    icon: MotorcycleIcon,
    color: "#8b5cf6",
    colorLight: "#a78bfa",
    colorDark: "#7c3aed",
    gradientFrom: "#a78bfa",
    gradientTo: "#7c3aed",
    label: "Motorcycles",
  },
  tuktuks: {
    icon: TukTukIcon,
    color: "#f59e0b",
    colorLight: "#fbbf24",
    colorDark: "#d97706",
    gradientFrom: "#fbbf24",
    gradientTo: "#d97706",
    label: "Tuk Tuks",
  },
  price: {
    icon: PriceIcon,
    color: "#06b6d4",
    colorLight: "#22d3ee",
    colorDark: "#0891b2",
    gradientFrom: "#22d3ee",
    gradientTo: "#0891b2",
    label: "Avg Price",
  },
};

// ============================================================================
// Main Component - Premium Professional Design
// ============================================================================

export function NeuKpiCard({
  category,
  label,
  value,
  subtitle,
  onClick,
  className,
  isActive = false,
  trend,
  trendValue,
}: NeuKpiCardProps) {
  const config = categoryConfig[category];
  const Icon = config.icon;

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        "relative overflow-hidden",
        "p-5 sm:p-6 rounded-[20px]",
        "border shadow-sm transition-colors duration-200",
        isActive
          ? "bg-emerald-50 border-emerald-200"
          : "bg-white border-slate-200 hover:bg-slate-50",
        onClick ? "cursor-pointer" : "cursor-default",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-2",
        className
      )}
    >
      {/* Top accent line */}
      <div 
        className="absolute top-0 left-4 right-4 h-[2px] rounded-full transition-all duration-300"
        style={{ 
          background: `linear-gradient(90deg, transparent 0%, ${config.color} 20%, ${config.colorLight} 50%, ${config.color} 80%, transparent 100%)`,
          opacity: isActive ? 1 : 0.6
        }}
      />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div
            className={cn(
              "flex items-center justify-center",
              "w-11 h-11 rounded-[14px]",
              "transition-colors duration-200 ease-out border border-slate-200 shadow-sm",
              isActive ? "bg-white" : "bg-slate-50"
            )}
          >
            <Icon 
              className="w-5 h-5 transition-all duration-300"
              style={{ 
                color: config.color
              }}
            />
          </div>
          
          {trend && trend !== "neutral" && (
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold",
              "transition-colors duration-200 border",
              trend === "up" 
                ? "text-emerald-700 bg-emerald-50 border-emerald-200" 
                : "text-red-700 bg-red-50 border-red-200"
            )}>
              {trend === "up" ? (
                <TrendUpIcon className="w-3 h-3" />
              ) : (
                <TrendDownIcon className="w-3 h-3" />
              )}
              {trendValue}
            </div>
          )}
        </div>
        
        {/* Label - Premium typography */}
        <div className="mb-2">
          <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.12em]">
            {label}
          </span>
        </div>
        
        {/* Value - Premium display typography */}
        <div className="flex items-baseline gap-1">
          <span 
            className={cn(
              "text-2xl sm:text-3xl font-bold tabular-nums tracking-tight",
              "transition-all duration-300"
            )}
            style={{
              color: isActive ? config.colorDark : '#1e293b'
            }}
          >
            {value}
          </span>
        </div>
        
        {/* Subtitle with premium styling */}
        {subtitle && (
          <div className="mt-2 flex items-center gap-1.5">
            <div 
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: config.colorLight }}
            />
            <span className="text-[10px] text-[#94a3b8] font-medium tracking-wide">
              {subtitle}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Export variants for convenience
// ============================================================================

export function NeuTotalCard(props: Omit<NeuKpiCardProps, "category">) {
  return <NeuKpiCard category="total" {...props} />;
}

export function NeuCarsCard(props: Omit<NeuKpiCardProps, "category">) {
  return <NeuKpiCard category="cars" {...props} />;
}

export function NeuMotorcyclesCard(props: Omit<NeuKpiCardProps, "category">) {
  return <NeuKpiCard category="motorcycles" {...props} />;
}

export function NeuTukTuksCard(props: Omit<NeuKpiCardProps, "category">) {
  return <NeuKpiCard category="tuktuks" {...props} />;
}

export function NeuPriceCard(props: Omit<NeuKpiCardProps, "category">) {
  return <NeuKpiCard category="price" {...props} />;
}
