/**
 * Dashboard Component - Clean Professional Advanced Standard
 * 
 * Features:
 * - Pure Neumorphism design system
 * - Soft shadows and tactile interactions
 * - Smooth animations and hover transitions
 * - Professional typography hierarchy
 * - Mobile-responsive layout
 * 
 * @module Dashboard
 */

"use client";


import { useState, useCallback, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import type { Vehicle } from "@/lib/types";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { CATEGORY_COLORS } from "@/lib/categoryColors";
import { safeGetMonthKey } from "@/lib/safeDate";
import { MotorcycleIcon } from "@/components/icons/MotorcycleIcon";
import { TukTukIcon } from "@/components/icons/TukTukIcon";

// ============================================================================
// Dynamic Chart Imports (ssr: false prevents hydration errors)
// ============================================================================

const VehiclesByCategoryChart = dynamic(
  () => import("./charts/VehiclesByCategoryChart"),
  { 
    ssr: false, 
    loading: () => <ChartSkeleton height={300} /> 
  }
);

const NewVsUsedChart = dynamic(
  () => import("./charts/NewVsUsedChart"),
  { 
    ssr: false, 
    loading: () => <ChartSkeleton height={300} /> 
  }
);

const VehiclesByBrandChart = dynamic(
  () => import("./charts/VehiclesByBrandChart"),
  { 
    ssr: false, 
    loading: () => <ChartSkeleton height={300} /> 
  }
);

const MonthlyAddedChart = dynamic(
  () => import("./charts/MonthlyAddedChart"),
  { 
    ssr: false, 
    loading: () => <ChartSkeleton height={300} /> 
  }
);

// ============================================================================
// Types & Interfaces
// ============================================================================

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

type DashboardProps = {
  initialVehicles: Vehicle[];
  initialMeta: DashboardMeta;
  initialError: string | null;
  isIOSSafari?: boolean;
};

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  subtitleHref?: string;
  icon: React.ReactNode;
  color?: "emerald" | "blue" | "purple" | "orange" | "red";
  isLoading?: boolean;
  onClick?: () => void;
  href?: string;
};

type ChartSkeletonProps = {
  height?: number;
};

type ChartDatum = {
  name: string;
  value: number;
  color?: string;
};

// ============================================================================
// Color Palette for Neumorphism
// ============================================================================

const ColorPalette = {
  emerald: {
    bg: "bg-emerald-100 dark:bg-emerald-500/15",
    text: "text-emerald-600 dark:text-emerald-300",
  },
  blue: {
    bg: "bg-blue-100 dark:bg-blue-500/15",
    text: "text-blue-600 dark:text-blue-300",
  },
  purple: {
    bg: "bg-purple-100 dark:bg-purple-500/15",
    text: "text-purple-600 dark:text-purple-300",
  },
  orange: {
    bg: "bg-orange-100 dark:bg-orange-500/15",
    text: "text-orange-600 dark:text-orange-300",
  },
  red: {
    bg: "bg-red-100 dark:bg-red-500/15",
    text: "text-red-600 dark:text-red-300",
  },
};

// ============================================================================
// Utility Components
// ============================================================================

/**
 * Chart Skeleton Loader
 */
function ChartSkeleton({ height = 300 }: ChartSkeletonProps) {
  return (
    <div 
      className="w-full flex items-center justify-center bg-slate-100 rounded-[20px] dark:bg-slate-900"
      style={{ height: `${height}px` }}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-100 shadow-sm flex items-center justify-center dark:bg-slate-800">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <span className="text-sm text-[#4a4a5a] dark:text-slate-400">Loading chart...</span>
      </div>
    </div>
  );
}

function MobileSafeChartSummary({
  data,
  emptyLabel = "No data available",
}: {
  data: ChartDatum[];
  emptyLabel?: string;
}) {
  const visibleData = data.filter((item) => item.value > 0).slice(0, 8);
  const maxValue = Math.max(...visibleData.map((item) => item.value), 1);

  if (visibleData.length === 0) {
    return (
      <div className="h-full min-h-[220px] rounded-[20px] bg-slate-50 p-5 flex items-center justify-center text-sm text-[#4a4a5a] dark:bg-slate-900 dark:text-slate-400">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="h-full min-h-[220px] rounded-[20px] bg-slate-50 p-5 flex flex-col justify-center gap-4 dark:bg-slate-900">
      {visibleData.map((item) => {
        const width = Math.max((item.value / maxValue) * 100, 6);

        return (
          <div key={item.name} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-[#1a1a2e] truncate dark:text-slate-200">{item.name}</span>
              <span className="font-semibold text-[#1a1a2e] tabular-nums dark:text-slate-100">{item.value.toLocaleString()}</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{
                  width: `${width}%`,
                  backgroundColor: item.color || "#10b981",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Dashboard Stat Card - Professional Advanced Neumorphism Design
 * (Renamed to avoid conflict with shared StatCard component)
 */
function DashboardStatCard({
  title,
  value,
  subtitle,
  subtitleHref,
  icon,
  color = "emerald",
  isLoading = false,
  onClick,
  href,
}: StatCardProps) {
  const colors = ColorPalette[color];
  
  const isClickable = !!onClick || !!href;
  const clickableClasses = isClickable 
    ? "cursor-pointer hover:-translate-y-1 active:translate-y-0 transition-transform" 
    : "";

  const subtitleContent = subtitle && subtitleHref ? (
    <a 
      href={subtitleHref} 
      className="text-xs text-red-500 mt-1 truncate hover:underline cursor-pointer inline-block relative z-10"
      onClick={(e) => e.stopPropagation()}
    >
      {subtitle}
    </a>
  ) : subtitle ? (
    <p className="text-xs text-[#4a4a5a] mt-1 truncate dark:text-slate-400">{subtitle}</p>
  ) : null;

  const innerContent = (
    <div className="flex items-center justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[#4a4a5a] truncate dark:text-slate-400">{title}</p>
        <p className="text-xl sm:text-2xl font-bold text-[#1a1a2e] mt-1 dark:text-slate-100">
          {value}
        </p>
        {subtitleContent}
      </div>
      <div className={`p-2 sm:p-3 rounded-xl flex-shrink-0 ${colors.bg} ${colors.text} shadow-sm`}>
        {icon}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="bg-slate-100 rounded-[24px] shadow-sm p-6 animate-pulse dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-slate-200 rounded dark:bg-slate-800" />
            <div className="h-8 w-16 bg-slate-200 rounded dark:bg-slate-800" />
          </div>
          <div className={`p-3 rounded-xl ${colors.bg} opacity-50`}>
            {icon}
          </div>
        </div>
      </div>
    );
  }

  const cardClasses = `bg-slate-100 rounded-[24px] shadow-sm p-6 dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 ${clickableClasses}`;

  if (href && subtitleHref) {
    return (
      <div className={cardClasses} onClick={() => window.location.href = href}>
        {innerContent}
      </div>
    );
  }

  if (href) {
    return (
      <a href={href} className="block no-underline">
        <div className={cardClasses}>
          {innerContent}
        </div>
      </a>
    );
  }

  if (onClick) {
    return (
      <button onClick={onClick} className="w-full text-left">
        <div className={cardClasses}>
          {innerContent}
        </div>
      </button>
    );
  }

  return (
    <div className={cardClasses}>
      {innerContent}
    </div>
  );
}

// ============================================================================
// Icons
// ============================================================================

const Icons = {
  car: (
    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    </svg>
  ),
  motorcycle: (
    <MotorcycleIcon className="w-5 h-5 sm:w-6 sm:h-6" />
  ),
  tuk: (
    <TukTukIcon className="w-5 h-5 sm:w-6 sm:h-6" />
  ),
  search: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  image: (
    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  noImage: (
    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
    </svg>
  ),
  refresh: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  totalVehicles: (
    <div className="flex items-center gap-1">
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="5.5" cy="17.5" r="2.5" strokeWidth={1.5} />
        <circle cx="17.5" cy="17.5" r="2.5" strokeWidth={1.5} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 17h7l3-6H8.5" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 11l2 6" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 11l2-3h3" />
      </svg>
      <TukTukIcon className="w-4 h-4 sm:w-5 sm:h-5" />
    </div>
  ),
};

// Filter out invalid/placeholder brands that aren't real vehicle brands
const INVALID_BRANDS = ['DIRECT_DB', 'TEST', 'UNKNOWN', 'N/A', 'NULL', 'NONE', ''];

// ============================================================================
// Main Dashboard Component
// ============================================================================

export default function Dashboard({
  initialVehicles,
  initialMeta,
  initialError,
  isIOSSafari = false,
}: DashboardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [searchQuery, setSearchQuery] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [meta, setMeta] = useState<DashboardMeta>(initialMeta);
  const [searchResults, setSearchResults] = useState<Vehicle[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  useEffect(() => {
    setVehicles(initialVehicles);
    setMeta(initialMeta);
    setError(initialError);
  }, [initialVehicles, initialMeta, initialError]);

  // Real data search: query API across 100% of database when user types
  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    async function fetchSearchResults() {
      setIsSearching(true);
      try {
        const searchLimit = isIOSSafari ? 300 : 2000;
        const url = `/api/vehicles?searchTerm=${encodeURIComponent(debouncedSearch)}&limit=${searchLimit}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.data || []);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error("[Dashboard] Search error:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }

    fetchSearchResults();
  }, [debouncedSearch, isIOSSafari]);

  const aggregatedStats = useMemo(() => {
    if (!vehicles.length) return null;

    const stats = {
      byCategory: {} as Record<string, number>,
      byCondition: {} as Record<string, number>,
      byBrand: {} as Record<string, number>,
      byMonth: {} as Record<string, number>,
      totalValue: 0,
      withImages: 0,
      withoutImages: 0,
    };

    for (const vehicle of vehicles) {
      const category = (vehicle.Category || "Unknown").toLowerCase().trim();
      const normalizedCategory = category.includes("car") ? "Cars" :
                                  category.includes("motor") ? "Motorcycles" :
                                  category.includes("tuk") ? "TukTuks" : "Other";
      
      stats.byCategory[normalizedCategory] = (stats.byCategory[normalizedCategory] || 0) + 1;

      const condition = (vehicle.Condition || "Unknown").toLowerCase().trim();
      const normalizedCondition = condition.includes("new") ? "New" :
                                   condition.includes("used") ? "Used" : "Other";
      stats.byCondition[normalizedCondition] = (stats.byCondition[normalizedCondition] || 0) + 1;

      const brand = (vehicle.Brand || "Unknown").toUpperCase();
      stats.byBrand[brand] = (stats.byBrand[brand] || 0) + 1;

      if (vehicle.Time) {
        const monthKey = safeGetMonthKey(vehicle.Time);
        if (monthKey) {
          stats.byMonth[monthKey] = (stats.byMonth[monthKey] || 0) + 1;
        }
      }

      const price = parseFloat(vehicle.Price40?.toString() || "0");
      if (price > 0) stats.totalValue += price;

      if (vehicle.Image && vehicle.Image.length > 0) {
        stats.withImages++;
      } else {
        stats.withoutImages++;
      }
    }

    return stats;
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    if (debouncedSearch.trim()) {
      // Real data search: use API results that query 100% of the database
      return searchResults;
    }
    return vehicles;
  }, [vehicles, debouncedSearch, searchResults]);

  const categoryChartData = useMemo(() => {
    if (!meta) return [];
    return [
      { name: "Cars", value: meta.countsByCategory.Cars || 0, color: CATEGORY_COLORS.Cars },
      { name: "Motorcycles", value: meta.countsByCategory.Motorcycles || 0, color: CATEGORY_COLORS.Motorcycles },
      { name: "Tuk Tuks", value: meta.countsByCategory.TukTuks || 0, color: CATEGORY_COLORS.TukTuks },
    ].filter((item) => item.value > 0);
  }, [meta]);

  const conditionChartData = useMemo(() => {
    if (!meta) return [];
    return [
      { name: "New", value: meta.countsByCondition.New || 0, color: "#10b981" },
      { name: "Used", value: meta.countsByCondition.Used || 0, color: "#6b7280" },
    ].filter((item) => item.value > 0);
  }, [meta]);

  const brandChartData = useMemo(() => {
    if (!aggregatedStats) return [];
    return Object.entries(aggregatedStats.byBrand)
      .filter(([name]) => !INVALID_BRANDS.includes(name))
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [aggregatedStats]);

  const monthlyChartData = useMemo(() => {
    if (!aggregatedStats) return [];
    return Object.entries(aggregatedStats.byMonth)
      .sort()
      .slice(-12)
      .map(([month, count]) => ({
        name: month,
        value: count,
      }));
  }, [aggregatedStats]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      window.location.reload();
    } catch {
      setError("Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  if (error) {
    return (
      <div className="p-4 sm:p-6 dark:bg-slate-950">
        <div className="bg-slate-100 rounded-[24px] shadow-sm p-6 dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
          <p className="text-red-600">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-6 py-3 bg-[#e74c3c] text-white rounded-[16px] shadow-sm active:bg-slate-100 font-semibold transition-all dark:active:bg-slate-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const totalVehicles = meta.total;
  const carsCount = meta.countsByCategory.Cars;
  const motorcyclesCount = meta.countsByCategory.Motorcycles;
  const tukTuksCount = meta.countsByCategory.TukTuks;
  const noImageCount = meta.noImageCount;

  const isLoading = isRefreshing;
  const useMobileSafeCharts = isIOSSafari;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto bg-slate-100 min-h-screen dark:bg-slate-950">
      {/* Header Section */}
      <div className="bg-slate-100 rounded-[30px] shadow-sm p-6 sm:p-8 dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1a1a2e] dark:text-slate-100">
              Dashboard
            </h1>
            <p className="text-sm text-[#4a4a5a] mt-2 dark:text-slate-400">
              {isLoading ? (
                <span className="inline-block w-24 h-4 bg-slate-200 rounded animate-pulse dark:bg-slate-800" />
              ) : (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {totalVehicles.toLocaleString()} total vehicles in inventory
                </span>
              )}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-6 py-3 bg-[#2ecc71] text-white font-semibold rounded-[16px] shadow-sm active:bg-slate-100 transition-all flex items-center gap-2 disabled:opacity-50 dark:active:bg-slate-800"
          >
            <span className={isRefreshing ? "animate-spin" : ""}>{Icons.refresh}</span>
            {isRefreshing ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        <DashboardStatCard
          title="Total Vehicles"
          value={totalVehicles.toLocaleString()}
          subtitle={`${noImageCount} without images`}
          subtitleHref="/vehicles?noImage=1"
          icon={Icons.totalVehicles}
          color="emerald"
          isLoading={isRefreshing}
          href="/vehicles"
        />
        <DashboardStatCard
          title="Cars"
          value={carsCount.toLocaleString()}
          subtitle="All car types"
          icon={Icons.car}
          color="blue"
          isLoading={isRefreshing}
          href="/vehicles?category=Cars"
        />
        <DashboardStatCard
          title="Motorcycles"
          value={motorcyclesCount.toLocaleString()}
          subtitle="All motorcycle types"
          icon={Icons.motorcycle}
          color="purple"
          isLoading={isRefreshing}
          href="/vehicles?category=Motorcycles"
        />
        <DashboardStatCard
          title="Tuk Tuks"
          value={tukTuksCount.toLocaleString()}
          subtitle="All tuk tuk types"
          icon={Icons.tuk}
          color="orange"
          isLoading={isRefreshing}
          href="/vehicles?category=Tuk+Tuk"
        />
        <DashboardStatCard
          title="No Images"
          value={noImageCount.toLocaleString()}
          subtitle="Click to view"
          icon={Icons.noImage}
          color="red"
          isLoading={isRefreshing}
          href="/vehicles?noImage=1"
        />
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#4a4a5a] dark:text-slate-400">
          {Icons.search}
        </div>
        <input
          type="text"
          placeholder="Search vehicles (Brand, Model, Category, Plate...)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 rounded-[20px] bg-slate-100 shadow-sm text-[#1a1a2e] placeholder-[#4a4a5a] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm sm:text-base dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:ring-1 dark:ring-slate-800"
        />
        {debouncedSearch !== searchQuery && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Search Results Count */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-[#4a4a5a] dark:text-slate-400">
        <span className="font-medium text-[#1a1a2e] dark:text-slate-100">
          {filteredVehicles.length.toLocaleString()}
        </span>
        <span>of</span>
        <span className="font-medium text-[#1a1a2e] dark:text-slate-100">
          {meta.total.toLocaleString()}
        </span>
        <span>vehicles</span>
        {debouncedSearch && (
          <span className="text-[#4a4a5a] dark:text-slate-400">
            matching &quot;{debouncedSearch}&quot;
          </span>
        )}
        {vehicles.length < meta.total && (
          <span className="text-amber-600 ml-1">
            (loaded {vehicles.length} of {meta.total.toLocaleString()} total)
          </span>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vehicles by Category */}
        <div className="bg-slate-100 rounded-[30px] shadow-sm p-6 sm:p-8 dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
          <h3 className="text-base sm:text-lg font-semibold text-[#1a1a2e] mb-6 dark:text-slate-100">
            Vehicles by Category
          </h3>
          <div className="w-full h-[250px] sm:h-[300px]">
            {isLoading ? (
              <ChartSkeleton height={300} />
            ) : useMobileSafeCharts ? (
              <MobileSafeChartSummary data={categoryChartData} />
            ) : (
              <VehiclesByCategoryChart data={categoryChartData} />
            )}
          </div>
        </div>

        {/* New vs Used */}
        <div className="bg-slate-100 rounded-[30px] shadow-sm p-6 sm:p-8 dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
          <h3 className="text-base sm:text-lg font-semibold text-[#1a1a2e] mb-6 dark:text-slate-100">
            New vs Used
          </h3>
          <div className="w-full h-[250px] sm:h-[300px]">
            {isLoading ? (
              <ChartSkeleton height={300} />
            ) : useMobileSafeCharts ? (
              <MobileSafeChartSummary data={conditionChartData} />
            ) : (
              <NewVsUsedChart data={conditionChartData} />
            )}
          </div>
        </div>

        {/* Top Brands */}
        <div className="bg-slate-100 rounded-[30px] shadow-sm p-6 sm:p-8 dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
          <h3 className="text-base sm:text-lg font-semibold text-[#1a1a2e] mb-6 dark:text-slate-100">
            Top Brands
          </h3>
          <div className="w-full h-[250px] sm:h-[300px]">
            {isLoading ? (
              <ChartSkeleton height={300} />
            ) : useMobileSafeCharts ? (
              <MobileSafeChartSummary data={brandChartData} />
            ) : (
              <VehiclesByBrandChart data={brandChartData} />
            )}
          </div>
        </div>

        {/* Monthly Added */}
        <div className="bg-slate-100 rounded-[30px] shadow-sm p-6 sm:p-8 dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
          <h3 className="text-base sm:text-lg font-semibold text-[#1a1a2e] mb-6 dark:text-slate-100">
            Monthly Added
          </h3>
          <div className="w-full h-[250px] sm:h-[300px]">
            {isLoading ? (
              <ChartSkeleton height={300} />
            ) : useMobileSafeCharts ? (
              <MobileSafeChartSummary data={monthlyChartData} />
            ) : (
              <MonthlyAddedChart data={monthlyChartData} />
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-6">
        <div className="bg-slate-100 rounded-[24px] shadow-sm p-6 text-center dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
          <p className="text-2xl sm:text-3xl font-bold text-emerald-600">
            {(meta.total - meta.noImageCount).toLocaleString()}
          </p>
          <p className="text-xs sm:text-sm text-[#4a4a5a] dark:text-slate-400">With Images</p>
        </div>
        <div className="bg-slate-100 rounded-[24px] shadow-sm p-6 text-center dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
          <p className="text-2xl sm:text-3xl font-bold text-red-600">
            {meta.noImageCount.toLocaleString()}
          </p>
          <p className="text-xs sm:text-sm text-[#4a4a5a] dark:text-slate-400">Without Images</p>
        </div>
        <div className="bg-slate-100 rounded-[24px] shadow-sm p-6 text-center dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
          <p className="text-2xl sm:text-3xl font-bold text-blue-600">
            ${Math.round(meta.avgPrice).toLocaleString()}
          </p>
          <p className="text-xs sm:text-sm text-[#4a4a5a] dark:text-slate-400">Avg Price</p>
        </div>
        <div className="bg-slate-100 rounded-[24px] shadow-sm p-6 text-center dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
          <p className="text-2xl sm:text-3xl font-bold text-purple-600">
            {aggregatedStats ? Object.keys(aggregatedStats.byBrand).length : '-'}
          </p>
          <p className="text-xs sm:text-sm text-[#4a4a5a] dark:text-slate-400">Unique Brands (sample)</p>
        </div>
      </div>
    </div>
  );
}
