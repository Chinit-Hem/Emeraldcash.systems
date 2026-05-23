"use client";

import { useLanguage } from "@/lib/LanguageContext";
import { useTranslation } from "@/lib/i18n";

import { derivePrices } from "@/lib/pricing";
import type { Vehicle } from "@/lib/types";
import { cn } from "@/lib/ui";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { formatPrice, getVehicleThumbnailUrl } from "@/lib/vehicle-helpers";
import { getVehicleColorHex, translateVehicleColor } from "@/lib/vehicleColors";
import { useOptimisticVehicles } from "@/lib/useOptimisticVehicles";
import { OptimizedImage } from "@/components/OptimizedImage";

// Color name to hex mapping for visual indicators
const getColorHex = (colorName: string): string => {
  const colorMap: Record<string, string> = {
    // Basic colors
    "red": "#ef4444",
    "blue": "#3b82f6",
    "green": "#10b981",
    "yellow": "#f59e0b",
    "orange": "#f97316",
    "purple": "#8b5cf6",
    "pink": "#ec4899",
    "black": "#1a1a2e",
    "white": "#f8fafc",
    "gray": "#6b7280",
    "grey": "#6b7280",
    "silver": "#9ca3af",
    "gold": "#fbbf24",
    "brown": "#92400e",
    "beige": "#d4c5b0",
    "navy": "#1e3a8a",
    "teal": "#14b8a6",
    "cyan": "#06b6d4",
    "lime": "#84cc16",
    "maroon": "#991b1b",
    "olive": "#65a30d",
    "coral": "#f87171",
    "ivory": "#fffff0",
    "khaki": "#c3b091",
    "lavender": "#c4b5fd",
    "magenta": "#d946ef",
    "mint": "#6ee7b7",
    "peach": "#fdba74",
    "plum": "#a855f7",
    "tan": "#d2b48c",
    "turquoise": "#40e0d0",
    "violet": "#8b5cf6",
    "indigo": "#6366f1",
    "charcoal": "#374151",
    "cream": "#fffdd0",
    "burgundy": "#9f1239",
    "champagne": "#f7e7ce",
    "bronze": "#cd7f32",
    "copper": "#b87333",
    "rose": "#fb7185",
    "slate": "#475569",
    "emerald": "#10b981",
    "ruby": "#e11d48",
    "sapphire": "#1d4ed8",
    "amber": "#f59e0b",
    "jade": "#00a86b",
    "pearl": "#f0e6d2",
    "graphite": "#4b5563",
    "midnight": "#191970",
    "shadow": "#2d3748",
    "storm": "#4a5568",
    "frost": "#e2e8f0",
    "mist": "#cbd5e1",
    "cloud": "#94a3b8",
    "smoke": "#64748b",
    "ash": "#475569",
    "obsidian": "#0f172a",
    "onyx": "#1e293b",
    "jet": "#0a0a0a",
    "coal": "#1f2937",
    "ebony": "#18181b",
    "raven": "#111827",
    "ink": "#1e1b4b",
    "denim": "#1e40af",
    "cobalt": "#1d4ed8",
    "azure": "#0ea5e9",
    "sky": "#38bdf8",
    "ocean": "#0066cc",
    "sea": "#0891b2",
    "lake": "#0284c7",
    "river": "#0ea5e9",
    "wave": "#22d3ee",
    "aqua": "#06b6d4",
    "marine": "#0077be",
    "lagoon": "#4fd1c5",
    "reef": "#2dd4bf",
    "sand": "#c2b280",
    "dune": "#a89f91",
    "desert": "#edc9af",
    "clay": "#b66a50",
    "terracotta": "#e2725b",
    "rust": "#b7410e",
    "sienna": "#a0522d",
    "umber": "#635147",
    "ochre": "#cc7722",
    "mustard": "#ffdb58",
    "honey": "#eb9605",
    "wheat": "#f5deb3",
    "barley": "#a89880",
    "oat": "#d4c4a8",
    "birch": "#f4e8d0",
    "maple": "#c4a484",
    "oak": "#8b6f47",
    "walnut": "#5c4033",
    "mahogany": "#c04000",
    "cherry": "#de3163",
    "crimson": "#dc2626",
    "scarlet": "#ff2400",
    "vermilion": "#e34234",
    "cardinal": "#c41e3a",
    "claret": "#7f1734",
    "garnet": "#733635",
    "wine": "#722f37",
    "berry": "#873260",
    "mulberry": "#c54b8c",
    "fuchsia": "#ff00ff",
    "orchid": "#da70d6",
    "lilac": "#c8a2c8",
    "mauve": "#e0b0ff",
    "thistle": "#d8bfd8",
    "heather": "#9e7bb5",
    "wisteria": "#c9a0dc",
    "iris": "#5a4fcf",
    "periwinkle": "#ccccff",
    "cornflower": "#6495ed",
    "cerulean": "#007ba7",
    "capri": "#00bfff",
    "electric": "#7df9ff",
    "neon": "#39ff14",
    "fluorescent": "#ccff00",
    "chartreuse": "#7fff00",
    "spring": "#00ff7f",
    "grass": "#7cb518",
    "forest": "#228b22",
    "moss": "#8a9a5b",
    "sage": "#9dc183",
    "fern": "#4f7942",
    "pine": "#01796f",
    "spruce": "#2f5d50",
    "fir": "#3a7d44",
    "cedar": "#4a3728",
    "bamboo": "#d2b48c",
    "palm": "#608d56",
    "jungle": "#29ab87",
    "rainforest": "#00755e",
    "tropic": "#ff6b6b",
    "paradise": "#ff7f50",
    "sunset": "#fd5e53",
    "sunrise": "#ff6f61",
    "dawn": "#9ed2c6",
    "dusk": "#8b7d6b",
    "twilight": "#4a6741",
    "midday": "#f4a460",
    "noon": "#ffa500",
    "daybreak": "#ffdbac",
    "eventide": "#6b5b73",
    "gloaming": "#704c5e",
    "nightfall": "#2c3e50",
    "midnightblue": "#191970",
    "moonlight": "#d4d4d8",
    "starlight": "#f0f0f0",
    "sunlight": "#fffacd",
    "daylight": "#87ceeb",
    "firelight": "#ff4500",
    "candlelight": "#f4c430",
    "lantern": "#f4a460",
    "torch": "#ff8c00",
    "ember": "#ff4d00",
    "flame": "#e25822",
    "blaze": "#ff6700",
    "inferno": "#ff4500",
    "magma": "#ff4d00",
    "lava": "#cf1020",
    "volcanic": "#8b0000",
    "ashgray": "#b2beb5",
    "smokegray": "#848884",
    "fog": "#a8a8a8",
    "haze": "#c8c8c8",
    "mistgray": "#b8b8b8",
    "steam": "#f5f5f5",
    "vapor": "#e8e8e8",
    "cloudgray": "#b0c4de",
    "rain": "#a4b0be",
    "stormgray": "#708090",
    "thunder": "#4a4a4a",
    "lightning": "#ffff00",
    "ice": "#d6ecef",
    "frostwhite": "#f0f8ff",
    "snow": "#fffafa",
    "blizzard": "#f0f0f0",
    "glacier": "#c6e2ff",
    "arctic": "#e0ffff",
    "polar": "#f0ffff",
    "tundra": "#e8e8e8",
    "alpine": "#d3d3d3",
    "mountain": "#8b7355",
    "peak": "#f5f5f5",
    "summit": "#ffffff",
    "valley": "#8fbc8f",
    "canyon": "#a0522d",
    "ravine": "#8b4513",
    "glen": "#9acd32",
    "meadow": "#7cfc00",
    "prairie": "#bdb76b",
    "savanna": "#c2b280",
    "steppe": "#b8b8b8",
    "tundra2": "#e0e0e0",
    "taiga": "#2f4f4f",
    "boreal": "#4a6741",
    "conifer": "#2d5016",
    "deciduous": "#d2691e",
    "evergreen": "#2e8b57",
    "seasonal": "#ff6347",
    "autumn": "#ff8c00",
    "fall": "#d2691e",
    "winter": "#b0e0e6",
    "spring2": "#00ff7f",
    "summer": "#ffd700",
    "monsoon": "#4682b4",
    "harvest": "#daa520",
    "solstice": "#ff4500",
    "equinox": "#ff8c00",
  };
  
  // Try exact match first
  const normalizedColor = colorName.toLowerCase().trim();
  if (colorMap[normalizedColor]) {
    return colorMap[normalizedColor];
  }
  
  // Try partial match
  for (const [name, hex] of Object.entries(colorMap)) {
    if (normalizedColor.includes(name) || name.includes(normalizedColor)) {
      return hex;
    }
  }
  
  // Default fallback - generate a consistent color based on string
  let hash = 0;
  for (let i = 0; i < colorName.length; i++) {
    hash = colorName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 50%)`;
};

interface VehicleTableProps {
  vehicles: Vehicle[];
  isAdmin: boolean;
  disableImages?: boolean;
  onEdit?: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
  sortField: keyof Vehicle | null;
  sortDirection: "asc" | "desc";
  onSort: (field: keyof Vehicle) => void;
}


type SortableField = "Brand" | "Model" | "Year" | "PriceNew" | "Condition" | "Category" | "Plate";

// SortHeader component - defined outside of VehicleTable to avoid "created during render" error
interface SortHeaderProps {
  field: SortableField;
  children: React.ReactNode;
  sortField: keyof Vehicle | null;
  sortDirection: "asc" | "desc";
  onSort: (field: keyof Vehicle) => void;
}

const SortHeader = ({ field, children, sortField, sortDirection, onSort }: SortHeaderProps) => {
  const isActive = sortField === field;
  return (
    <th
      onClick={() => onSort(field)}
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#4a4a5a] bg-slate-100 cursor-pointer select-none transition-all duration-200 hover:bg-slate-50"
      )}
    >
      <div className="flex items-center gap-1">
        {children}
        <span className="inline-flex flex-col">
          <svg
            className={`h-3 w-3 ${
              isActive && sortDirection === "asc"
                ? "text-[#10b981]"
                : "text-[#4a4a5a]/45"
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="m18 15-6-6-6 6" />
          </svg>
          <svg
            className={`-mt-1 h-3 w-3 ${
              isActive && sortDirection === "desc"
                ? "text-[#10b981]"
                : "text-[#4a4a5a]/45"
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </div>
    </th>
  );
};

const COLUMNS = [
  { key: "id", label: "ID", visible: true },
  { key: "image", label: "Image", visible: true },
  { key: "category", label: "Category", visible: true },
  { key: "brand", label: "Brand", visible: true },
  { key: "model", label: "Model", visible: true },
  { key: "year", label: "Year", visible: true },
  { key: "plate", label: "Plate", visible: true },
  { key: "priceNew", label: "Market Price", visible: true },
  { key: "price40", label: "D.O.C. 40%", visible: true },
  { key: "price70", label: "Vehicles 70%", visible: true },
  { key: "taxType", label: "Tax Type", visible: true },
  { key: "condition", label: "Condition", visible: true },
  { key: "bodyType", label: "Body Type", visible: true },
  { key: "color", label: "Color", visible: true },
  { key: "actions", label: "Actions", visible: true },
];

export default function VehicleTable({
  vehicles: initialVehicles,
  isAdmin,
  disableImages = false,
  onEdit,
  onDelete,
  sortField,
  sortDirection,
  onSort,
}: VehicleTableProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const { t } = useTranslation(language);

  // Use optimistic vehicles hook for instant UI updates
  const {
    vehicles,
    optimisticDelete,
    isPending,
  } = useOptimisticVehicles(initialVehicles);

  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState(COLUMNS.map(c => c.key));
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const columnMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setImageErrors(new Set());
  }, [vehicles]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setShowColumnMenu(false);
      }
    };

    if (showColumnMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnMenu]);

  const handleImageError = (vehicleId: string) => {
    setImageErrors((prev) => new Set(prev).add(vehicleId));
  };

  const toggleColumn = (columnKey: string) => {
    setVisibleColumns(prev =>
      prev.includes(columnKey)
        ? prev.filter(k => k !== columnKey)
        : [...prev, columnKey]
    );
  };

  // Optimistic delete handler
  const handleOptimisticDelete = useCallback(async (vehicle: Vehicle) => {
    const vehicleId = vehicle.VehicleId;
    setDeletingId(vehicleId);
    
    // Call the optimistic delete
    await optimisticDelete(vehicleId, async () => {
      // This is the actual API call
      await onDelete(vehicle);
    });
    
    setDeletingId(null);
  }, [optimisticDelete, onDelete]);

  return (
    <div className="hidden lg:block">
      {/* Column Visibility Menu - Premium Professional Design */}
      <div className="flex justify-end mb-3" ref={columnMenuRef}>
        <div className="relative">
          <button
            onClick={() => setShowColumnMenu(!showColumnMenu)}
            className={cn(
              "group flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-xl bg-[#f0f4f8]",
              "shadow-sm",
              "text-slate-600 font-semibold text-sm",
              "transition-all duration-200 ease-out",
              "hover:bg-slate-50 hover:text-slate-800",
              "hover:-translate-y-0.5",
              "active:bg-slate-100 active:translate-y-0",
              showColumnMenu && "shadow-sm text-emerald-600 translate-y-0"
            )}
          >
            {/* Premium Sliders Icon */}
            <div className={cn(
              "flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200",
              "bg-gradient-to-br from-slate-100 to-slate-200",
              "shadow-sm",
              showColumnMenu && "shadow-sm from-emerald-50 to-emerald-100"
            )}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <line x1="4" x2="4" y1="21" y2="14" />
                <line x1="4" x2="4" y1="10" y2="3" />
                <line x1="12" x2="12" y1="21" y2="12" />
                <line x1="12" x2="12" y1="8" y2="3" />
                <line x1="20" x2="20" y1="21" y2="16" />
                <line x1="20" x2="20" y1="12" y2="3" />
                <line x1="2" x2="6" y1="14" y2="14" />
                <line x1="10" x2="14" y1="8" y2="8" />
                <line x1="18" x2="22" y1="16" y2="16" />
              </svg>
            </div>
            
            <span>Columns</span>
            
            {/* Premium Count Badge */}
            <span className={cn(
              "flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-xs font-bold",
              "bg-gradient-to-br from-emerald-400 to-emerald-500 text-white",
              "shadow-sm",
              "transition-all duration-200",
              showColumnMenu && "shadow-sm from-emerald-500 to-emerald-600"
            )}>
              {visibleColumns.length}
            </span>
            
            {/* Animated Chevron */}
            <svg 
              className={cn(
                "w-4 h-4 ml-1 transition-transform duration-300 ease-out",
                showColumnMenu && "rotate-180"
              )}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
            </svg>
          </button>
          {showColumnMenu && (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 z-30 mt-2 w-64 bg-slate-100 rounded-[24px] shadow-sm p-6 flex flex-col"
            >
              {/* Header */}
              <div className="mb-4">
                <div className="text-xs font-bold uppercase tracking-wider text-[#4a4a5a]">
                  Visible Columns
                </div>
                <div className="text-[10px] text-[#718096] mt-1">
                  {visibleColumns.length} of {COLUMNS.length} selected
                </div>
              </div>
              
              {/* Column Items - Scrollable with min height */}
              <div className="space-y-2 max-h-[320px] min-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                {COLUMNS.map((column) => (
                  <label 
                    key={column.key} 
                    onClick={() => toggleColumn(column.key)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 p-2 rounded-xl transition-all duration-200",
                      "hover:bg-[#dee2e9]",
                      visibleColumns.includes(column.key) && "bg-slate-100"
                    )}
                  >
                    {/* Neumorphic Checkbox */}
                    <div className={cn(
                      "flex items-center justify-center w-5 h-5 rounded-md transition-all duration-200",
                      visibleColumns.includes(column.key)
                        ? "bg-slate-100 shadow-sm"
                        : "bg-slate-100 shadow-sm"
                    )}>
                      {visibleColumns.includes(column.key) && (
                        <svg className="w-3 h-3 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </div>
                    <span className={cn(
                      "text-sm font-medium transition-colors",
                      visibleColumns.includes(column.key) ? "text-[#2d3748]" : "text-[#718096]"
                    )}>
                      {column.label}
                    </span>
                  </label>
                ))}
              </div>
              
              {/* Empty State Message */}
              {visibleColumns.length === 0 && (
                <div className="mt-3 px-2 py-2 rounded-xl bg-slate-100 shadow-sm">
                  <p className="text-xs text-[#e53e3e] text-center font-medium">
                    No columns selected. Please select at least one.
                  </p>
                </div>
              )}
              
              {/* Action Buttons - Neumorphic Style - Always Visible */}
              <div className="mt-4 pt-4 border-t border-slate-200 flex gap-3">
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Only select all if not all columns are already selected
                    if (visibleColumns.length !== COLUMNS.length) {
                      setVisibleColumns(COLUMNS.map(c => c.key));
                    }
                  }}
                  disabled={visibleColumns.length === COLUMNS.length}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200",
                    visibleColumns.length === COLUMNS.length
                      ? "bg-slate-100 shadow-sm text-[#718096] cursor-default"
                      : "bg-slate-100 shadow-sm text-[#10b981] hover:bg-slate-50 active:bg-slate-100"
                  )}
                >
                  {visibleColumns.length === COLUMNS.length ? "All Selected" : "Select All"}
                </button>
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setVisibleColumns([]);
                  }}
                  disabled={visibleColumns.length === 0}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200",
                    visibleColumns.length === 0
                      ? "bg-slate-100 shadow-sm text-[#718096] cursor-default"
                      : "bg-slate-100 shadow-sm text-[#e53e3e] hover:bg-slate-50 active:bg-slate-100"
                  )}
                >
                  {visibleColumns.length === 0 ? "All Cleared" : "Clear"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Table Container - Both Horizontal & Vertical */}
      <div className="rounded-2xl bg-slate-100 shadow-sm overflow-hidden">
        <div 
          className="overflow-auto max-h-[65vh] custom-scrollbar"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#94a3b8 #f1f5f9'
          }}
        >
          <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100 shadow-sm">
              {visibleColumns.includes('id') && (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#4a4a5a]">
                  ID
                </th>
              )}
              {visibleColumns.includes('image') && (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#4a4a5a] w-16">
                  Image
                </th>
              )}
              {visibleColumns.includes('category') && (
                <SortHeader field="Category" sortField={sortField} sortDirection={sortDirection} onSort={onSort}>Category</SortHeader>
              )}
              {visibleColumns.includes('brand') && (
                <SortHeader field="Brand" sortField={sortField} sortDirection={sortDirection} onSort={onSort}>{t.brand}</SortHeader>
              )}
              {visibleColumns.includes('model') && (
                <SortHeader field="Model" sortField={sortField} sortDirection={sortDirection} onSort={onSort}>{t.model}</SortHeader>
              )}
              {visibleColumns.includes('year') && (
                <SortHeader field="Year" sortField={sortField} sortDirection={sortDirection} onSort={onSort}>Year</SortHeader>
              )}
              {visibleColumns.includes('plate') && (
                <SortHeader field="Plate" sortField={sortField} sortDirection={sortDirection} onSort={onSort}>Plate</SortHeader>
              )}
              {visibleColumns.includes('priceNew') && (
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#4a4a5a]">
                  Market Price
                </th>
              )}
              {visibleColumns.includes('price40') && (
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#4a4a5a]">
                  D.O.C. 40%
                </th>
              )}
              {visibleColumns.includes('price70') && (
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#4a4a5a]">
                  Vehicles 70%
                </th>
              )}
              {visibleColumns.includes('taxType') && (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#4a4a5a]">
                  Tax Type
                </th>
              )}
              {visibleColumns.includes('condition') && (
                <SortHeader field="Condition" sortField={sortField} sortDirection={sortDirection} onSort={onSort}>Condition</SortHeader>
              )}
              {visibleColumns.includes('bodyType') && (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#4a4a5a]">
                  Body Type
                </th>
              )}
              {visibleColumns.includes('color') && (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#4a4a5a]">
                  Color
                </th>
              )}
              {visibleColumns.includes('actions') && (
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[#4a4a5a] w-32">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {vehicles.map((vehicle, index) => {
              const derived = derivePrices(vehicle.PriceNew);
              const price40 = vehicle.Price40 ?? derived.Price40;
              const price70 = vehicle.Price70 ?? derived.Price70;
              const vehicleId = vehicle.VehicleId;
              
              // Use centralized utility for image URL
              const thumbUrl = !disableImages && !imageErrors.has(vehicleId)
                ? getVehicleThumbnailUrl(vehicle.Image)
                : null;

              return (
              <tr
                key={vehicleId || `row-${index}`}
                onClick={() => router.push(`/vehicles/${encodeURIComponent(vehicleId)}/view`)}
                className={cn(
                  "transition-all duration-150 cursor-pointer hover:bg-slate-50",
                  index % 2 !== 0 && "bg-slate-100/50"
                )}
              >
                {visibleColumns.includes('id') && (
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-[#4a4a5a]">
                    {vehicle.VehicleId || "-"}
                  </td>
                )}

                {visibleColumns.includes('image') && (
                  <td className="px-4 py-3 whitespace-nowrap">
                    {thumbUrl ? (
                      <OptimizedImage
                        src={thumbUrl}
                        alt={`${vehicle.Brand} ${vehicle.Model}`}
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-lg shadow-sm bg-slate-100 object-cover"
                        onError={() => handleImageError(vehicleId)}
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg shadow-sm bg-slate-100">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          className="h-5 w-5 text-[#4a4a5a]"
                        >
                          <rect width="18" height="18" x="3" y="3" rx="2" />
                          <circle cx="9" cy="9" r="2" />
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                      </div>
                    )}
                  </td>
                )}

                {visibleColumns.includes('category') && (
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-[#4a4a5a]">
                    {vehicle.Category || "-"}
                  </td>
                )}

                {visibleColumns.includes('brand') && (
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[#1a1a2e]">
                    {vehicle.Brand || "-"}
                  </td>
                )}

                {visibleColumns.includes('model') && (
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-[#4a4a5a]">
                    {vehicle.Model || "-"}
                  </td>
                )}

                {visibleColumns.includes('year') && (
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-[#4a4a5a]">
                    {vehicle.Year || "-"}
                  </td>
                )}

                {visibleColumns.includes('plate') && (
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-[#4a4a5a]">
                    {vehicle.Plate || "-"}
                  </td>
                )}

                {visibleColumns.includes('priceNew') && (
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-[#10b981]">
                    {formatPrice(vehicle.PriceNew)}
                  </td>
                )}

                {visibleColumns.includes('price40') && (
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-[#ef4444]">
                    {formatPrice(price40)}
                  </td>
                )}

                {visibleColumns.includes('price70') && (
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-[#10b981]">
                    {formatPrice(price70)}
                  </td>
                )}

                {visibleColumns.includes('taxType') && (
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-[#4a4a5a]">
                    {vehicle.TaxType || "-"}
                  </td>
                )}

                {visibleColumns.includes('condition') && (
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shadow-sm ${
                        vehicle.Condition === "New"
                          ? "bg-slate-100 text-[#10b981]"
                          : vehicle.Condition === "Used"
                          ? "bg-slate-100 text-[#ef4444]"
                          : "bg-slate-100 text-[#4a4a5a]"
                      }`}
                    >
                      {vehicle.Condition || "Unknown"}
                    </span>
                  </td>
                )}

                {visibleColumns.includes('bodyType') && (
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-[#4a4a5a]">
                    {vehicle.BodyType || "-"}
                  </td>
                )}

                {visibleColumns.includes('color') && (
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {vehicle.Color ? (
                        <>
                          <div 
                            className="w-4 h-4 rounded-full shadow-sm border-2 border-slate-200"
                            style={{ 
                              backgroundColor: getVehicleColorHex(vehicle.Color),
                              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.12)"
                            }}
                            title={translateVehicleColor(vehicle.Color, language)}
                          />
                          <span className="text-sm text-[#4a4a5a] font-medium">
                            {translateVehicleColor(vehicle.Color, language)}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-[#4a4a5a]">-</span>
                      )}
                    </div>
                  </td>
                )}

                {visibleColumns.includes('actions') && (
                  <td className="px-4 py-3 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/vehicles/${encodeURIComponent(vehicleId)}/view`);
                        }}
                        className="rounded-lg p-2 text-[#4a4a5a] transition-all duration-200 hover:bg-slate-50 hover:text-[#1a1a2e]"
                        title="View"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          className="h-4 w-4"
                        >
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onEdit) {
                                onEdit(vehicle);
                              } else {
                                router.push(`/vehicles/${encodeURIComponent(vehicleId)}/edit`);
                              }
                            }}
                            className="rounded-lg p-2 text-[#10b981] transition-all duration-200 hover:bg-slate-50"
                            title="Edit"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              className="h-4 w-4"
                            >
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOptimisticDelete(vehicle);
                            }}
                            disabled={deletingId === vehicleId}
                            className={cn(
                              "rounded-lg p-2 transition-all duration-200",
                              deletingId === vehicleId
                                ? "text-[#9ca3af] cursor-not-allowed"
                                : "text-[#ef4444] hover:bg-slate-50"
                            )}
                            title={deletingId === vehicleId ? "Deleting..." : "Delete"}
                          >
                            {deletingId === vehicleId ? (
                              <svg
                                className="h-4 w-4 animate-spin"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                            ) : (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                className="h-4 w-4"
                              >
                                <path d="M3 6h18" />
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                              </svg>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
