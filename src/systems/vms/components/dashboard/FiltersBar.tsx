"use client";

import { useMemo, useState, useCallback } from "react";
import { cn } from "@/shared/utils/ui";
import type { Vehicle } from "@/shared/types/types";
import { COLOR_OPTIONS } from "@/shared/types/types";

interface FilterState {
  search: string;
  category: string;
  brand: string;
  yearMin: string;
  yearMax: string;
  priceMin: string;
  priceMax: string;
  condition: string;
  color: string;
  dateFrom: string;
  dateTo: string;
  withoutImage: boolean;
}

interface FiltersBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  vehicles: Vehicle[];
  resultCount: number;
  totalCount: number;
  isFiltered?: boolean;
  onClearFilters?: () => void;
}

const CATEGORIES = ["All", "Cars", "Motorcycles", "TukTuks"];
const CONDITIONS = ["All", "New", "Used"];

// Neumorphism Icons
const Icons = {
  search: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3" />
    </svg>
  ),
  filter: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M6 10h12M9 16h6" />
    </svg>
  ),
  chevronDown: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  ),
  chevronUp: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m18 15-6-6-6 6" />
    </svg>
  ),
  close: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12" />
    </svg>
  ),
  reset: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 3v5h-5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H3v5" />
    </svg>
  ),
  image: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  ),
  calendar: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  dollar: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  tag: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
      <circle cx="7" cy="7" r="2" />
    </svg>
  ),
  car: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 6 9 17l-5-5" />
    </svg>
  ),
  sliders: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 12h18M3 18h18" />
      <circle cx="9" cy="6" r="2" />
      <circle cx="15" cy="12" r="2" />
      <circle cx="9" cy="18" r="2" />
    </svg>
  ),
};

export default function FiltersBar({
  filters,
  onFilterChange,
  vehicles,
  resultCount,
  totalCount,
  isFiltered: propIsFiltered,
  onClearFilters,
}: FiltersBarProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Extract unique brands from vehicles
  const brands = useMemo(() => {
    const brandSet = new Set(vehicles.map((v) => v.Brand).filter(Boolean));
    return ["All", ...Array.from(brandSet).sort()];
  }, [vehicles]);

  const handleChange = useCallback((key: keyof FilterState, value: string | boolean) => {
    onFilterChange({ ...filters, [key]: value });
  }, [filters, onFilterChange]);

  const handleClear = useCallback(() => {
    onFilterChange({
      search: "",
      category: "All",
      brand: "All",
      yearMin: "",
      yearMax: "",
      priceMin: "",
      priceMax: "",
      condition: "All",
      color: "All",
      dateFrom: "",
      dateTo: "",
      withoutImage: false,
    });
  }, [onFilterChange]);

  // Check if any filters are active
  const hasActiveFilters = propIsFiltered !== undefined
    ? propIsFiltered
    : filters.search ||
      filters.category !== "All" ||
      filters.brand !== "All" ||
      filters.yearMin ||
      filters.yearMax ||
      filters.priceMin ||
      filters.priceMax ||
      filters.condition !== "All" ||
      filters.color !== "All" ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.withoutImage;

  // Generate active filter chips
  const activeFilters = useMemo(() => {
    const chips: { key: keyof FilterState; label: string; icon: React.ReactNode }[] = [];

    if (filters.search) {
      chips.push({ key: "search", label: `"${filters.search}"`, icon: Icons.search });
    }
    if (filters.category !== "All") {
      chips.push({ key: "category", label: filters.category, icon: Icons.tag });
    }
    if (filters.brand !== "All") {
      chips.push({ key: "brand", label: filters.brand, icon: Icons.car });
    }
    if (filters.condition !== "All") {
      chips.push({ key: "condition", label: filters.condition, icon: Icons.tag });
    }
    if (filters.color !== "All") {
      chips.push({ key: "color", label: filters.color, icon: Icons.tag });
    }
    if (filters.yearMin || filters.yearMax) {
      const label = filters.yearMin && filters.yearMax
        ? `${filters.yearMin} - ${filters.yearMax}`
        : filters.yearMin
          ? `From ${filters.yearMin}`
          : `To ${filters.yearMax}`;
      chips.push({ key: "yearMin", label: `Year: ${label}`, icon: Icons.calendar });
    }
    if (filters.priceMin || filters.priceMax) {
      const label = filters.priceMin && filters.priceMax
        ? `$${Number(filters.priceMin).toLocaleString()} - $${Number(filters.priceMax).toLocaleString()}`
        : filters.priceMin
          ? `From $${Number(filters.priceMin).toLocaleString()}`
          : `To $${Number(filters.priceMax).toLocaleString()}`;
      chips.push({ key: "priceMin", label: label, icon: Icons.dollar });
    }
    if (filters.dateFrom || filters.dateTo) {
      const label = filters.dateFrom && filters.dateTo
        ? `${filters.dateFrom} to ${filters.dateTo}`
        : filters.dateFrom
          ? `From ${filters.dateFrom}`
          : `To ${filters.dateTo}`;
      chips.push({ key: "dateFrom", label: `Date: ${label}`, icon: Icons.calendar });
    }
    if (filters.withoutImage) {
      chips.push({ key: "withoutImage", label: "No Images", icon: Icons.image });
    }

    return chips;
  }, [filters]);

  const removeFilter = useCallback((key: keyof FilterState) => {
    if (key === "yearMin") {
      handleChange("yearMin", "");
      handleChange("yearMax", "");
    } else if (key === "priceMin") {
      handleChange("priceMin", "");
      handleChange("priceMax", "");
    } else if (key === "dateFrom") {
      handleChange("dateFrom", "");
      handleChange("dateTo", "");
    } else if (key === "search") {
      handleChange("search", "");
    } else if (key === "category" || key === "brand" || key === "condition" || key === "color") {
      handleChange(key, "All");
    } else if (key === "withoutImage") {
      handleChange("withoutImage", false);
    }
  }, [handleChange]);

  return (
    <div className="w-full bg-white rounded-[24px] shadow-sm overflow-hidden">
      {/* Header Section */}
      <div className="px-6 py-5 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          {/* Title & Count */}
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-white shadow-sm text-[#2ecc71]">
              {Icons.filter}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#1a1a2e]">
                Filters
              </h2>
              <p className="text-sm text-[#4a4a5a] mt-0.5">
                Showing <span className="font-semibold text-[#2ecc71]">{resultCount.toLocaleString()}</span>
                <span className="mx-1.5">of</span>
                <span className="font-semibold text-[#1a1a2e]">{totalCount.toLocaleString()}</span>
                <span className="ml-1.5">vehicles</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            {/* Toggle Filters Button */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium",
                "bg-white text-[#1a1a2e]",
                "shadow-sm",
                "hover:bg-slate-50",
                "active:bg-slate-100",
                "transition-all duration-200",
                showAdvancedFilters && "shadow-sm text-[#2ecc71]"
              )}
            >
              <span className="hidden sm:inline">{showAdvancedFilters ? "Hide Filters" : "More Filters"}</span>
              <span className="sm:hidden">Filters</span>
              <span className={cn("transition-transform duration-200", showAdvancedFilters ? "rotate-180" : "")}>
                {showAdvancedFilters ? Icons.chevronUp : Icons.chevronDown}
              </span>
            </button>

            {/* Reset Button */}
            <button
              onClick={onClearFilters || handleClear}
              disabled={!hasActiveFilters}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium",
                "transition-all duration-200",
                hasActiveFilters
                  ? "bg-white text-[#e74c3c] shadow-sm hover:bg-slate-50 active:bg-slate-100"
                  : "bg-white text-[#4a4a5a]/50 cursor-not-allowed shadow-sm"
              )}
            >
              {Icons.reset}
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar Section - Professional Neumorphism */}
      <div className="px-6 py-4">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4a4a5a] z-10">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search all fields: brand, model, plate, color, year, price, condition..."
            value={filters.search}
            onChange={(e) => handleChange("search", e.target.value)}
            className={cn(
              "w-full h-12 pl-12 pr-4 rounded-xl text-sm font-medium",
              "bg-white text-[#1a1a2e] placeholder:text-[#4a4a5a]/60",
              "shadow-sm",
              "focus:ring-2 focus:ring-emerald-500/20",
              "border-none outline-none focus:outline-none focus:ring-0",
              "transition-all duration-200"
            )}
          />
          {filters.search && (
            <button
              onClick={() => handleChange("search", "")}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2",
                "flex items-center justify-center w-7 h-7 rounded-lg",
                "bg-white text-[#4a4a5a]",
                "shadow-sm",
                "hover:bg-slate-50",
                "hover:text-[#e74c3c]",
                "transition-all duration-200"
              )}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18" />
                <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Quick Filter Chips */}
      {activeFilters.length > 0 && (
        <div className="px-6 pb-5">
          <div className="flex flex-wrap items-center gap-3">
            {activeFilters.map((filter, index) => (
              <button
                key={`${filter.key}-${index}`}
                onClick={() => removeFilter(filter.key)}
                className={cn(
                  "group inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl text-xs font-medium",
                  "bg-white text-[#1a1a2e]",
                  "shadow-sm",
                  "hover:bg-slate-50",
                  "active:bg-slate-100",
                  "transition-all duration-200"
                )}
              >
                <span className="text-[#2ecc71]">{filter.icon}</span>
                <span className="max-w-[150px] truncate">{filter.label}</span>
                <span className="ml-1 flex items-center justify-center w-5 h-5 rounded-md bg-white shadow-sm text-[#4a4a5a] group-hover:text-[#e74c3c] group-hover:bg-slate-50 transition-all">
                  {Icons.close}
                </span>
              </button>
            ))}
            {activeFilters.length > 1 && (
              <button
                onClick={onClearFilters || handleClear}
                className="text-xs font-medium text-[#e74c3c] hover:text-[#c0392b] ml-2 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Advanced Filters Section */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          showAdvancedFilters ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-6 pb-6 border-t border-slate-200 pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* Category */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-[#4a4a5a] uppercase tracking-wider">
                Category
              </label>
              <div className="relative">
                <select
                  value={filters.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl text-sm font-medium appearance-none cursor-pointer",
                    "bg-white text-[#1a1a2e]",
                    "shadow-sm",
                    "border-none outline-none",
                    "hover:bg-slate-50",
                    "focus:ring-2 focus:ring-emerald-500/20",
                    "transition-all duration-200"
                  )}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#4a4a5a]">
                  {Icons.chevronDown}
                </div>
              </div>
            </div>

            {/* Brand */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-[#4a4a5a] uppercase tracking-wider">
                Brand
              </label>
              <div className="relative">
                <select
                  value={filters.brand}
                  onChange={(e) => handleChange("brand", e.target.value)}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl text-sm font-medium appearance-none cursor-pointer",
                    "bg-white text-[#1a1a2e]",
                    "shadow-sm",
                    "border-none outline-none",
                    "hover:bg-slate-50",
                    "focus:ring-2 focus:ring-emerald-500/20",
                    "transition-all duration-200"
                  )}
                >
                  {brands.map((brand) => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#4a4a5a]">
                  {Icons.chevronDown}
                </div>
              </div>
            </div>

            {/* Condition */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-[#4a4a5a] uppercase tracking-wider">
                Condition
              </label>
              <div className="relative">
                <select
                  value={filters.condition}
                  onChange={(e) => handleChange("condition", e.target.value)}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl text-sm font-medium appearance-none cursor-pointer",
                    "bg-white text-[#1a1a2e]",
                    "shadow-sm",
                    "border-none outline-none",
                    "hover:bg-slate-50",
                    "focus:ring-2 focus:ring-emerald-500/20",
                    "transition-all duration-200"
                  )}
                >
                  {CONDITIONS.map((cond) => (
                    <option key={cond} value={cond}>{cond}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#4a4a5a]">
                  {Icons.chevronDown}
                </div>
              </div>
            </div>

            {/* Color */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-[#4a4a5a] uppercase tracking-wider">
                Color
              </label>
              <div className="relative">
                <select
                  value={filters.color}
                  onChange={(e) => handleChange("color", e.target.value)}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl text-sm font-medium appearance-none cursor-pointer",
                    "bg-white text-[#1a1a2e]",
                    "shadow-sm",
                    "border-none outline-none",
                    "hover:bg-slate-50",
                    "focus:ring-2 focus:ring-emerald-500/20",
                    "transition-all duration-200"
                  )}
                >
                  <option value="All">All Colors</option>
                  {COLOR_OPTIONS.map((color) => (
                    <option key={color.value} value={color.value}>{color.value}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#4a4a5a]">
                  {Icons.chevronDown}
                </div>
              </div>
            </div>

            {/* Year Range */}
            <div className="space-y-3 sm:col-span-2">
              <label className="text-xs font-semibold text-[#4a4a5a] uppercase tracking-wider">
                Year Range
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  placeholder="Min Year"
                  value={filters.yearMin}
                  onChange={(e) => handleChange("yearMin", e.target.value)}
                  className={cn(
                    "flex-1 px-4 py-2.5 rounded-xl text-sm font-medium",
                    "bg-white text-[#1a1a2e] placeholder:text-[#4a4a5a]/50",
                    "shadow-sm",
                    "border-none outline-none",
                    "hover:bg-slate-50",
                    "focus:ring-2 focus:ring-emerald-500/20",
                    "transition-all duration-200"
                  )}
                />
                <span className="text-[#4a4a5a] font-medium">—</span>
                <input
                  type="number"
                  placeholder="Max Year"
                  value={filters.yearMax}
                  onChange={(e) => handleChange("yearMax", e.target.value)}
                  className={cn(
                    "flex-1 px-4 py-2.5 rounded-xl text-sm font-medium",
                    "bg-white text-[#1a1a2e] placeholder:text-[#4a4a5a]/50",
                    "shadow-sm",
                    "border-none outline-none",
                    "hover:bg-slate-50",
                    "focus:ring-2 focus:ring-emerald-500/20",
                    "transition-all duration-200"
                  )}
                />
              </div>
            </div>

            {/* Price Range */}
            <div className="space-y-3 sm:col-span-2">
              <label className="text-xs font-semibold text-[#4a4a5a] uppercase tracking-wider">
                Price Range ($)
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a4a5a] font-medium">$</span>
                  <input
                    type="number"
                    placeholder="Min Price"
                    value={filters.priceMin}
                    onChange={(e) => handleChange("priceMin", e.target.value)}
                    className={cn(
                      "w-full pl-8 pr-4 py-2.5 rounded-xl text-sm font-medium",
                      "bg-white text-[#1a1a2e] placeholder:text-[#4a4a5a]/50",
                      "shadow-sm",
                      "border-none outline-none",
                      "hover:bg-slate-50",
                      "focus:ring-2 focus:ring-emerald-500/20",
                      "transition-all duration-200"
                    )}
                  />
                </div>
                <span className="text-[#4a4a5a] font-medium">—</span>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a4a5a] font-medium">$</span>
                  <input
                    type="number"
                    placeholder="Max Price"
                    value={filters.priceMax}
                    onChange={(e) => handleChange("priceMax", e.target.value)}
                    className={cn(
                      "w-full pl-8 pr-4 py-2.5 rounded-xl text-sm font-medium",
                      "bg-white text-[#1a1a2e] placeholder:text-[#4a4a5a]/50",
                      "shadow-sm",
                      "border-none outline-none",
                      "hover:bg-slate-50",
                      "focus:ring-2 focus:ring-emerald-500/20",
                      "transition-all duration-200"
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-3 sm:col-span-2">
              <label className="text-xs font-semibold text-[#4a4a5a] uppercase tracking-wider">
                Date Range
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleChange("dateFrom", e.target.value)}
                    className={cn(
                      "w-full px-4 py-2.5 rounded-xl text-sm font-medium",
                      "bg-white text-[#1a1a2e]",
                      "shadow-sm",
                      "border-none outline-none",
                      "hover:bg-slate-50",
                    "focus:ring-2 focus:ring-emerald-500/20",
                    "transition-all duration-200"
                    )}
                  />
                </div>
                <span className="text-[#4a4a5a] font-medium">—</span>
                <div className="relative flex-1">
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleChange("dateTo", e.target.value)}
                    className={cn(
                      "w-full px-4 py-2.5 rounded-xl text-sm font-medium",
                      "bg-white text-[#1a1a2e]",
                      "shadow-sm",
                      "border-none outline-none",
                      "hover:bg-slate-50",
                      "focus:ring-2 focus:ring-emerald-500/20",
                      "transition-all duration-200"
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Image Status Toggle */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-[#4a4a5a] uppercase tracking-wider">
                Image Status
              </label>
              <button
                onClick={() => handleChange("withoutImage", !filters.withoutImage)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium",
                  "bg-white border-none outline-none",
                  "transition-all duration-200",
                  filters.withoutImage
                    ? "shadow-sm text-[#e74c3c]"
                    : "shadow-sm text-[#1a1a2e] hover:bg-slate-50"
                )}
              >
                <span className="flex items-center gap-2">
                  {Icons.image}
                  {filters.withoutImage ? "No Images Only" : "All Vehicles"}
                </span>
                <div className={cn(
                  "w-10 h-5 rounded-full relative transition-colors duration-200",
                  filters.withoutImage 
                    ? "bg-[#e74c3c] shadow-sm"
                    : "bg-[#2ecc71] shadow-sm"
                )}>
                  <div className={cn(
                    "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                    filters.withoutImage ? "translate-x-5" : "translate-x-0.5"
                  )} />
                </div>
              </button>
            </div>
          </div>

          {/* Apply Button for Mobile */}
          <div className="mt-8 lg:hidden">
            <button
              onClick={() => setShowAdvancedFilters(false)}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold",
                "bg-[#2ecc71] text-white",
                "shadow-sm",
                "hover:bg-slate-50",
                "active:bg-slate-100",
                "transition-all duration-200"
              )}
            >
              {Icons.check}
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
