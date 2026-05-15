/**
 * Enhanced Dashboard Component - Beautiful, Clean, Professional, Advanced, Standard
 *
 * Design Philosophy:
 * - Glassmorphism + Neumorphism fusion for modern tactile feel
 * - Professional color palette with emerald accents
 * - Advanced micro-interactions and smooth animations
 * - Clean typography hierarchy with Inter font
 * - Standard component patterns for maintainability
 *
 * @module EnhancedDashboard
 */

"use client";

import ChartErrorBoundary from "@/app/components/dashboard/ChartErrorBoundary";
import { useLanguage } from "@/lib/LanguageContext";
import { CATEGORY_COLORS } from "@/lib/categoryColors";
import { useTranslation } from "@/lib/i18n";
import type { Vehicle } from "@/lib/types";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { safeGetMonthKey } from "@/lib/safeDate";
import {
  Bike,
  Car,
  ChevronRight,
  DollarSign,
  Download,
  Filter,
  Image as ImageIcon,
  ImageOff,
  LucideIcon,
  MoreHorizontal,
  Package,
  RefreshCw,
  Search,
  TrendingUp
} from "lucide-react";
import Link from "next/link";

// TukTuk Icon Component - From Sidebar Menu (IconTukTuk)
function TukTukIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 16v-3a2 2 0 0 1 2-2h8l3 3v3" />
      <path d="M14 13V9a2 2 0 0 1 2-2h2" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}
import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

// ============================================================================
// Dynamic Chart Imports with Loading States
// ============================================================================

const VehiclesByCategoryChart = dynamic(
  () => import("./charts/VehiclesByCategoryChart"),
  {
    ssr: false,
    loading: () => <ChartSkeleton height={320} title="Loading category data..." />
  }
);

const NewVsUsedChart = dynamic(
  () => import("./charts/NewVsUsedChart"),
  {
    ssr: false,
    loading: () => <ChartSkeleton height={320} title="Loading condition data..." />
  }
);

const VehiclesByBrandChart = dynamic(
  () => import("./charts/VehiclesByBrandChart"),
  {
    ssr: false,
    loading: () => <ChartSkeleton height={320} title="Loading brand data..." />
  }
);

const MonthlyAddedChart = dynamic(
  () => import("./charts/MonthlyAddedChart"),
  {
    ssr: false,
    loading: () => <ChartSkeleton height={320} title="Loading timeline data..." />
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
  initialVehicles?: Vehicle[];
  initialMeta?: DashboardMeta;
  initialError?: string | null;
  isIOSSafari?: boolean;
};

type ChartDatum = {
  name: string;
  value: number;
  color?: string;
};

// ============================================================================
// Professional Color Palette
// ============================================================================

const Colors = {
  primary: {
    50: "#ecfdf5",
    100: "#d1fae5",
    200: "#a7f3d0",
    300: "#6ee7b7",
    400: "#34d399",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
    800: "#065f46",
    900: "#064e3b",
  },
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
  }
};

// ============================================================================
// Vehicle Category Configurations
// ============================================================================

const VEHICLE_CATEGORIES = {
  all: {
    label: "All Vehicles",
    icon: Package,
    color: "#10b981",
    gradient: "from-emerald-500 to-teal-600",
    shadowColor: "shadow-emerald-500/30",
    bgGradient: "from-emerald-50 to-teal-50",
    ringColor: "ring-emerald-500/20",
  },
  cars: {
    label: "Cars",
    icon: Car,
    color: "#3b82f6",
    gradient: "from-blue-500 to-indigo-600",
    shadowColor: "shadow-blue-500/30",
    bgGradient: "from-blue-50 to-indigo-50",
    ringColor: "ring-blue-500/20",
  },
  motorcycles: {
    label: "Motorcycles",
    icon: Bike,
    color: "#8b5cf6",
    gradient: "from-violet-500 to-purple-600",
    shadowColor: "shadow-violet-500/30",
    bgGradient: "from-violet-50 to-purple-50",
    ringColor: "ring-violet-500/20",
  },
  tuktuks: {
    label: "Tuk Tuks",
    icon: TukTukIcon,
    color: "#f59e0b",
    gradient: "from-amber-500 to-orange-600",
    shadowColor: "shadow-amber-500/30",
    bgGradient: "from-amber-50 to-orange-50",
    ringColor: "ring-amber-500/20",
  },
};

// ============================================================================
// Utility Components
// ============================================================================

/**
 * Professional Chart Skeleton with pulse animation
 */
function ChartSkeleton({ height = 320, title = "Loading..." }: { height?: number; title?: string }) {
  return (
    <div
      className="w-full flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-[#e8ecf1] to-[#dce2e8] shadow-sm"
      style={{ height: `${height}px` }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30 flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
          <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 animate-ping" />
        </div>
        <span className="text-sm font-medium text-slate-500">{title}</span>
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
      <div className="h-full min-h-[240px] rounded-2xl bg-slate-50 p-5 flex items-center justify-center text-sm text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="h-full min-h-[240px] rounded-2xl bg-slate-50 p-5 flex flex-col justify-center gap-4">
      {visibleData.map((item) => {
        const width = Math.max((item.value / maxValue) * 100, 6);

        return (
          <div key={item.name} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-slate-800 truncate">{item.name}</span>
              <span className="font-semibold text-slate-800 tabular-nums">{item.value.toLocaleString()}</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
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

// Filter Invalid Brands
const INVALID_BRANDS = ['DIRECT_DB', 'TEST', 'UNKNOWN', 'N/A', 'NULL', 'NONE', ''];

/**
 * Professional Stat Card with glassmorphism + neumorphism fusion
 */
function StatCard({
  title,
  value,
  subtitle,
  subtitleHref,
  icon: Icon,
  color = "emerald",
  isRefreshing = false,
  onClick,
  href,
  trend,
  trendUp
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  subtitleHref?: string;
  icon: LucideIcon;
  color?: "emerald" | "blue" | "purple" | "orange" | "red" | "amber";
  isRefreshing?: boolean;
  onClick?: () => void;
  href?: string;
  trend?: string;
  trendUp?: boolean;
}) {
  const colorClasses = {
    emerald: "from-emerald-500 to-emerald-600 shadow-emerald-500/25",
    blue: "from-blue-500 to-blue-600 shadow-blue-500/25",
    purple: "from-purple-500 to-purple-600 shadow-purple-500/25",
    orange: "from-orange-500 to-orange-600 shadow-orange-500/25",
    red: "from-red-500 to-red-600 shadow-red-500/25",
    amber: "from-amber-500 to-amber-600 shadow-amber-500/25",
  };

  const isClickable = !!onClick || !!href;

  // Handle subtitle click without nesting anchors
  const handleSubtitleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (subtitleHref) {
      window.location.href = subtitleHref;
    }
  };

  const content = (
    <div
      className={`
        relative overflow-hidden rounded-3xl p-6
        bg-gradient-to-br from-[#f0f4f8] to-[#e6e9ef]
        shadow-sm
        ${isClickable ? 'cursor-pointer hover:-translate-y-1 active:translate-y-0' : ''}
        transition-all duration-300
        hover:bg-slate-50
        group
      `}
    >
      {/* Background gradient accent */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClasses[color]} opacity-10 rounded-full blur-3xl transform translate-x-16 -translate-y-16 transition-opacity group-hover:opacity-20`} />

      {/* Refresh indicator - Tiny dot */}
      {isRefreshing && (
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-500 rounded-full animate-ping ring-2 ring-emerald-500/50" />
      )}

      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-800 tracking-tight">
            {value}
          </p>

          {trend && (
            <div className={`mt-2 flex items-center gap-1 text-sm font-medium ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
              <TrendingUp className={`w-4 h-4 ${trendUp ? '' : 'rotate-180'}`} />
              {trend}
            </div>
          )}

          {subtitle && (
            subtitleHref ? (
              <span
                onClick={handleSubtitleClick}
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-600 transition-colors cursor-pointer"
              >
                {subtitle}
                <ChevronRight className="w-4 h-4" />
              </span>
            ) : (
              <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
            )
          )}
        </div>

        <div className={`
          flex-shrink-0 p-3 rounded-2xl
          bg-gradient-to-br ${colorClasses[color]}
          text-white shadow-lg
          transform transition-transform group-hover:scale-110
        `}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );

  if (href && !onClick) {
    return <Link href={href} className="block no-underline">{content}</Link>;
  }

  if (onClick) {
    return <button onClick={onClick} className="w-full text-left">{content}</button>;
  }

  return content;
}


// ============================================================================
// Main Enhanced Dashboard Component
// ============================================================================

export default function EnhancedDashboard({
  initialVehicles = [],
  initialMeta = {
    total: 0,
    countsByCategory: { Cars: 0, Motorcycles: 0, TukTuks: 0 },
    countsByCondition: { New: 0, Used: 0 },
    noImageCount: 0,
    avgPrice: 0,
  },
  initialError = null,
  isIOSSafari = false,
}: DashboardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [searchQuery, setSearchQuery] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [meta, setMeta] = useState<DashboardMeta>(initialMeta);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Vehicle[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { language } = useLanguage();
  const { t } = useTranslation(language);

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  useEffect(() => {
    setVehicles(initialVehicles);
    setMeta(initialMeta);
  }, [initialVehicles, initialMeta]);

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
        const url = `/api/vehicles/edge?search=${encodeURIComponent(debouncedSearch)}&limit=2000`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.data || []);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error("[EnhancedDashboard] Search error:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }

    fetchSearchResults();
  }, [debouncedSearch]);

  // Compute aggregated stats from real vehicle data
  const aggregatedStats = useMemo(() => {
    if (!vehicles.length) return null;

    const stats = {
      byBrand: {} as Record<string, number>,
      byMonth: {} as Record<string, number>,
    };

    for (const vehicle of vehicles) {
      const brand = (vehicle.Brand || "Unknown").toUpperCase();
      if (!INVALID_BRANDS.includes(brand)) {
        stats.byBrand[brand] = (stats.byBrand[brand] || 0) + 1;
      }

      if (vehicle.Time) {
        const monthKey = safeGetMonthKey(vehicle.Time);
        if (monthKey) {
          stats.byMonth[monthKey] = (stats.byMonth[monthKey] || 0) + 1;
        }
      }
    }

    return stats;
  }, [vehicles]);

  // Use API results for real 100% database search; fallback to all vehicles
  const filteredVehicles = useMemo(() => {
    if (debouncedSearch.trim()) {
      return searchResults;
    }
    return vehicles;
  }, [vehicles, debouncedSearch, searchResults]);

  // Chart data preparation
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
      { name: "Used", value: meta.countsByCondition.Used || 0, color: "#64748b" },
    ].filter((item) => item.value > 0);
  }, [meta]);

  // Real chart data computed from actual vehicle data
  const brandChartData = useMemo(() => {
    if (!aggregatedStats) return [];
    return Object.entries(aggregatedStats.byBrand)
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

  // Handlers
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

  const handleFilterClick = useCallback((filter: string) => {
    setActiveFilter(activeFilter === filter ? null : filter);
  }, [activeFilter]);

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl p-8 text-center animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <ImageOff className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{t.error}</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all active:scale-95"
          >
            {t.refresh}
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
  const useMobileSafeCharts = isIOSSafari;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{t.dashboard}</h1>
              <p className="text-xs text-slate-500">{language === 'km' ? 'វិភាគស្តុកយានយន្តពេលវេលាពិត' : 'Real-time inventory analytics'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all active:scale-95 disabled:opacity-50"
              title={t.refresh}
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <button className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-all active:scale-95">
              <Download className="w-4 h-4" />
              {language === 'km' ? 'ទាញយក' : 'Export'}
            </button>

            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all active:scale-95">
              <Filter className="w-4 h-4" />
              {t.filter}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8 animate-fade-in">
          {/* Quick Filters - Beautiful Vehicle Category Cards */}
          <div className="space-y-6">
            {/* Section Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Quick Filters</h2>
                <p className="text-sm text-slate-500 mt-1">Filter vehicles by category</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Total Inventory</span>
                <span className="text-2xl font-bold text-slate-800">{totalVehicles.toLocaleString()}</span>
              </div>
            </div>

            {/* Vehicle Category Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* All Vehicles Card */}
              <Link
                href="/vehicles"
                className="group relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-white to-slate-50 shadow-sm hover:bg-slate-50 transition-all duration-500 hover:-translate-y-1"
              >
                {/* Animated Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Content */}
                <div className="relative">
                  {/* Icon & Count Row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/40 group-hover:scale-110 transition-all duration-300">
                      <Package className="w-7 h-7 text-white" />
                    </div>
                    <div className="text-right">
                      <span className="text-4xl font-bold text-slate-800 group-hover:text-emerald-600 transition-colors duration-300">
                        {totalVehicles.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Label & Action */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">All Vehicles</h3>
                    <p className="text-sm text-slate-500 mb-3">View complete inventory</p>

                    {/* Progress Bar */}
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full w-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
                    </div>
                  </div>

                  {/* Hover Arrow */}
                  <div className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                    <ChevronRight className="w-6 h-6 text-emerald-500" />
                  </div>
                </div>
              </Link>

              {/* Cars Card */}
              <Link
                href="/vehicles?category=Cars"
                className="group relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-white to-blue-50/30 shadow-sm hover:bg-slate-50 transition-all duration-500 hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/40 group-hover:scale-110 transition-all duration-300">
                      <Car className="w-7 h-7 text-white" />
                    </div>
                    <div className="text-right">
                      <span className="text-4xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors duration-300">
                        {carsCount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Cars</h3>
                    <p className="text-sm text-slate-500 mb-3">Sedans, SUVs, Trucks</p>

                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min((carsCount / totalVehicles) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                    <ChevronRight className="w-6 h-6 text-blue-500" />
                  </div>
                </div>
              </Link>

              {/* Motorcycles Card */}
              <Link
                href="/vehicles?category=Motorcycles"
                className="group relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-white to-violet-50/30 shadow-sm hover:bg-slate-50 transition-all duration-500 hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30 group-hover:shadow-violet-500/40 group-hover:scale-110 transition-all duration-300">
                      <Bike className="w-7 h-7 text-white" />
                    </div>
                    <div className="text-right">
                      <span className="text-4xl font-bold text-slate-800 group-hover:text-violet-600 transition-colors duration-300">
                        {motorcyclesCount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Motorcycles</h3>
                    <p className="text-sm text-slate-500 mb-3">Scooters, Bikes</p>

                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min((motorcyclesCount / totalVehicles) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                    <ChevronRight className="w-6 h-6 text-violet-500" />
                  </div>
                </div>
              </Link>

              {/* Tuk Tuks Card */}
              <Link
                href="/vehicles?category=Tuk+Tuk"
                className="group relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-white to-amber-50/30 shadow-sm hover:bg-slate-50 transition-all duration-500 hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30 group-hover:shadow-amber-500/40 group-hover:scale-110 transition-all duration-300">
                      <TukTukIcon className="w-7 h-7 text-white" />
                    </div>
                    <div className="text-right">
                      <span className="text-4xl font-bold text-slate-800 group-hover:text-amber-600 transition-colors duration-300">
                        {tukTuksCount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Tuk Tuks</h3>
                    <p className="text-sm text-slate-500 mb-3">Three-wheelers</p>

                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min((tukTuksCount / totalVehicles) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                    <ChevronRight className="w-6 h-6 text-amber-500" />
                  </div>
                </div>
              </Link>
            </div>

            {/* Missing Images Alert Card */}
            {noImageCount > 0 && (
              <Link
href="/vehicles?withoutImage=true"
                className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-red-50 to-rose-50 border border-red-100 shadow-sm hover:shadow-md transition-all duration-300 group"
              >
                <div className="p-3 rounded-xl bg-red-100 text-red-600 group-hover:bg-red-200 transition-colors">
                  <ImageOff className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-red-700">{noImageCount.toLocaleString()}</span>
                    <span className="text-sm font-medium text-red-600">vehicles missing images</span>
                  </div>
                  <p className="text-sm text-red-500">Click to view and upload images</p>
                </div>
                <ChevronRight className="w-5 h-5 text-red-400 group-hover:text-red-600 group-hover:translate-x-1 transition-all" />
              </Link>
            )}
          </div>

          {/* Search & Filter Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Search by brand, model, category, plate number, or year..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-14 py-4 rounded-2xl bg-white shadow-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:ring-2 focus:ring-emerald-500/20 transition-all text-base"
            />
            {debouncedSearch !== searchQuery && (
              <div className="absolute inset-y-0 right-0 pr-5 flex items-center">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Results Summary */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="font-medium text-slate-700">
                {filteredVehicles.length.toLocaleString()}
              </span>
              <span>of</span>
              <span className="font-medium text-slate-700">
                {meta.total.toLocaleString()}
              </span>
              <span>vehicles</span>
              {debouncedSearch && (
                <span className="text-slate-400">
                  matching &quot;{debouncedSearch}&quot;
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {['Cars', 'Motorcycles', 'TukTuks', 'New', 'Used'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => handleFilterClick(filter)}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                    ${activeFilter === filter
                      ? 'bg-emerald-100 text-emerald-700 shadow-inner'
                      : 'bg-white text-slate-600 hover:bg-slate-50 shadow-sm'}
                  `}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Vehicles by Category */}
            <div className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Vehicles by Category</h3>
                  <p className="text-sm text-slate-500">Distribution across vehicle types</p>
                </div>
                <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              <div className="w-full h-[300px] sm:h-[320px]">
                <ChartErrorBoundary title="Category Chart" height={320}>
                  <Suspense fallback={<ChartSkeleton height={320} />}>
                    {useMobileSafeCharts ? (
                      <MobileSafeChartSummary data={categoryChartData} />
                    ) : (
                      <VehiclesByCategoryChart data={categoryChartData} />
                    )}
                  </Suspense>
                </ChartErrorBoundary>
              </div>
            </div>

            {/* New vs Used */}
            <div className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Condition Distribution</h3>
                  <p className="text-sm text-slate-500">New vs used vehicles</p>
                </div>
                <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              <div className="w-full h-[300px] sm:h-[320px]">
                <ChartErrorBoundary title="Condition Chart" height={320}>
                  <Suspense fallback={<ChartSkeleton height={320} />}>
                    {useMobileSafeCharts ? (
                      <MobileSafeChartSummary data={conditionChartData} />
                    ) : (
                      <NewVsUsedChart data={conditionChartData} />
                    )}
                  </Suspense>
                </ChartErrorBoundary>
              </div>
            </div>

            {/* Top Brands */}
            <div className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Top Brands</h3>
                  <p className="text-sm text-slate-500">Most popular manufacturers</p>
                </div>
                <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              <div className="w-full h-[300px] sm:h-[320px]">
                <ChartErrorBoundary title="Brand Chart" height={320}>
                  <Suspense fallback={<ChartSkeleton height={320} />}>
                    {useMobileSafeCharts ? (
                      <MobileSafeChartSummary data={brandChartData} />
                    ) : (
                      <VehiclesByBrandChart data={brandChartData} />
                    )}
                  </Suspense>
                </ChartErrorBoundary>
              </div>
            </div>

            {/* Monthly Added */}
            <div className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Monthly Trends</h3>
                  <p className="text-sm text-slate-500">Vehicles added over time</p>
                </div>
                <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              <div className="w-full h-[300px] sm:h-[320px]">
                <ChartErrorBoundary title="Monthly Trends Chart" height={320}>
                  <Suspense fallback={<ChartSkeleton height={320} />}>
                    {useMobileSafeCharts ? (
                      <MobileSafeChartSummary data={monthlyChartData} />
                    ) : (
                      <MonthlyAddedChart data={monthlyChartData} />
                    )}
                  </Suspense>
                </ChartErrorBoundary>
              </div>
            </div>
          </div>

          {/* Quick Stats Footer */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {[
              {
                label: "With Images",
                value: (meta.total - meta.noImageCount).toLocaleString(),
                icon: ImageIcon,
                color: "text-emerald-600",
                bgColor: "bg-emerald-50"
              },
              {
                label: "Without Images",
                value: meta.noImageCount.toLocaleString(),
                icon: ImageOff,
                color: "text-red-600",
                bgColor: "bg-red-50"
              },
              {
                label: "Average Price",
                value: `$${Math.round(meta.avgPrice).toLocaleString()}`,
                icon: DollarSign,
                color: "text-blue-600",
                bgColor: "bg-blue-50"
              },
              {
                label: "Unique Brands",
                value: aggregatedStats ? Object.keys(aggregatedStats.byBrand).length.toLocaleString() : '-',
                icon: Package,
                color: "text-purple-600",
                bgColor: "bg-purple-50"
              },
            ].map((stat, index) => (
              <div
                key={stat.label}
                className="bg-white rounded-2xl shadow-sm p-5 text-center hover:bg-slate-50 transition-shadow"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`w-12 h-12 mx-auto mb-3 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
