"use client";

import { useLanguage } from "@/shared/hooks/LanguageContext";
import { useTranslation, type Language, type Translations } from "@/shared/utils/i18n";
import { useAuthUser } from "@/shared/hooks/AuthContext";

import { ConfirmDeleteModal } from "@/systems/vms/components/vehicles/ConfirmDeleteModal";

import { useDeleteVehicle } from "@/systems/vms/components/vehicles/useDeleteVehicle";
import { useToast } from "@/shared/components/ui/glass/GlassToast";
import { isDriveHostedImageUrl } from "@/shared/utils/drive";
import { getVehicleThumbnailUrl, isCloudinaryUrl } from "@/systems/vms/utils/vehicle-helpers";
import { getVehicleColorHex, translateVehicleColor } from "@/systems/vms/utils/vehicleColors";
import type { Vehicle } from "@/shared/types/types";
import { cn } from "@/shared/utils/ui";
import { useVehiclesNeon } from "@/systems/vms/hooks/useVehiclesNeon";
import { getFuzzySuggestions } from "@/systems/vms/utils/fuzzySearch";
import {
  getVehicleGroupKey,
  getVehicleGroupValue,
  getVehicleListItemElementId,
  normalizeVehicleGroupText,
  parseVehicleGroupByParam,
  parseVehicleListPageParam,
  parseVehicleListPageSizeParam,
  setVehicleListQueryValue,
  VEHICLE_LIST_FOCUS_PARAM,
  VEHICLE_LIST_PAGE_PARAM,
  VEHICLE_LIST_PAGE_SIZE_PARAM,
  withVehicleListQuery,
  type VehicleGroupByOption
} from "@/systems/vms/utils/vehicleListState";
import SearchSuggestions from "@/shared/components/SearchSuggestions";
import { TukTukIcon } from "@/shared/components/icons/TukTukIcon";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Bike,
  Car,
  CheckCircle2,
  ChevronDown,
  Clock,
  Columns,
  Eye,
  Filter,
  Grid3X3,
  List,
  Pen,
  Plus,
  Package,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  X
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

const AddVehicleModalOptimistic = dynamic(
  () => import("@/systems/vms/components/vehicles/AddVehicleModalOptimistic"),
  {
    ssr: false,
    loading: () => null,
  }
);

// ============================================================================
// Types & Interfaces
// ============================================================================

type ColumnKey = "id" | "image" | "category" | "brand" | "model" | "year" | "plate" | "priceNew" | "price40" | "price70" | "taxType" | "bodyType" | "color" | "condition" | "actions";

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  width?: string;
  sortable: boolean;
  defaultVisible: boolean;
}

type ViewMode = "grid" | "list";
type TotalsMode = "all" | "filtered";
type GroupByOption = VehicleGroupByOption;

interface FilterState {
  search: string;
  category: string;
  condition: string;
  brand: string;
  model: string;
  year: string;
  plate: string;
  minPrice: string;
  maxPrice: string;
  taxType: string;
  hasImage: string;
}

// ============================================================================
// Configuration
// ============================================================================

const COLUMNS: ColumnConfig[] = [
  { key: "id", label: "ID", width: "80px", sortable: true, defaultVisible: false },
  { key: "image", label: "Vehicle", width: "80px", sortable: false, defaultVisible: true },
  { key: "category", label: "Category", width: "110px", sortable: true, defaultVisible: true },
  { key: "brand", label: "Brand", width: "130px", sortable: true, defaultVisible: true },
  { key: "model", label: "Model", width: "140px", sortable: true, defaultVisible: true },
  { key: "year", label: "Year", width: "90px", sortable: true, defaultVisible: true },
  { key: "plate", label: "Plate", width: "110px", sortable: true, defaultVisible: true },
  { key: "priceNew", label: "Market Price", width: "120px", sortable: true, defaultVisible: true },
  { key: "price40", label: "Price 40%", width: "120px", sortable: true, defaultVisible: false },
  { key: "price70", label: "Price 70%", width: "120px", sortable: true, defaultVisible: false },
  { key: "taxType", label: "Tax Type", width: "110px", sortable: true, defaultVisible: false },
  { key: "bodyType", label: "Body Type", width: "110px", sortable: true, defaultVisible: false },
  { key: "color", label: "Color", width: "100px", sortable: true, defaultVisible: false },
  { key: "condition", label: "Condition", width: "110px", sortable: true, defaultVisible: true },
  { key: "actions", label: "Actions", width: "140px", sortable: false, defaultVisible: true },
];

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 30, 50, 100, 500, 2000];
const DEFAULT_ITEMS_PER_PAGE = 10;
const MOBILE_VEHICLE_FETCH_LIMIT = 200;
const DESKTOP_VEHICLE_FETCH_LIMIT = 2000;
const FILTER_LABEL_CLASS = "mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400";
const FILTER_FIELD_CLASS =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition-all placeholder-slate-400 focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder-slate-500";

const normalizeGroupKey = (value: string, groupBy: GroupByOption): string => {
  const normalizedValue = normalizeVehicleGroupText(value);
  return groupBy === "year" ? normalizedValue : normalizedValue.toLocaleLowerCase("en-US");
};

function detectMobileSafariLike(): boolean {
  if (typeof navigator === "undefined") return false;

  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const isIOS =
    /iP(hone|ad|od)/i.test(userAgent) ||
    (platform === "MacIntel" && maxTouchPoints > 1);

  return isIOS || maxTouchPoints > 1;
}

function normalizeVehicleImageValue(imageValue: unknown): string {
  if (Array.isArray(imageValue)) {
    return normalizeVehicleImageValue(imageValue.find(Boolean));
  }

  if (typeof imageValue !== "string") return "";

  const trimmed = imageValue.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return "";

  const unquoted = trimmed.replace(/^["']|["']$/g, "");
  if (
    unquoted.startsWith("http://") ||
    unquoted.startsWith("https://") ||
    unquoted.startsWith("data:image/") ||
    unquoted.startsWith("blob:")
  ) {
    return unquoted;
  }

  if (
    (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
    (trimmed.startsWith("{") && trimmed.endsWith("}"))
  ) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return normalizeVehicleImageValue(parsed.find(Boolean));
      }
      if (parsed && typeof parsed === "object") {
        const record = parsed as Record<string, unknown>;
        return normalizeVehicleImageValue(
          record.url ?? record.src ?? record.image ?? record.Image ?? record.thumbnail
        );
      }
    } catch {
      // Fall through to delimiter handling for malformed imported values.
    }
  }

  const firstValue = unquoted
    .split(/[\n;]/)
    .map((value) => value.trim().replace(/^["']|["']$/g, ""))
    .find(Boolean);

  return firstValue ?? "";
}

function isTruthyQueryParam(value: string | null): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase().trim();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function vehicleHasDisplayableImage(imageValue: unknown): boolean {
  const normalizedValue = normalizeVehicleImageValue(imageValue);
  if (!normalizedValue) return false;

  const resolvedUrl = getVehicleThumbnailUrl(normalizedValue, "w400-h300");
  if (resolvedUrl) return true;

  return /^[a-zA-Z0-9\-_/\\.]+$/.test(normalizedValue);
}

function shouldBypassNextImageOptimization(imageUrl: string): boolean {
  return isDriveHostedImageUrl(imageUrl) || isCloudinaryUrl(imageUrl);
}

function categoryFilterToApiCategory(value: string | null | undefined): string | undefined {
  const normalized = value?.toLowerCase().trim();
  if (!normalized || normalized === "all") return undefined;
  if (normalized.includes("motor") || normalized.includes("bike")) return "Motorcycles";
  if (normalized.includes("tuk") || normalized.includes("rickshaw")) return "TukTuks";
  if (normalized.includes("car")) return "Cars";
  return undefined;
}

function categoryMatchesFilter(category: string | undefined, filter: string): boolean {
  const targetCategory = categoryFilterToApiCategory(filter);
  if (!targetCategory) return true;
  return categoryFilterToApiCategory(category) === targetCategory;
}

function formatCategoryFilterValue(value: string): string {
  return categoryFilterToApiCategory(value) || value;
}

// ============================================================================
// UI Components
// ============================================================================

function NeuCard({
  children,
  className,
  hover = true,
  active = false,
  onClick,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  hover?: boolean;
  active?: boolean;
}) {
  return (
    <div
      {...props}
      onClick={onClick}
      className={cn(
        "rounded-2xl border border-slate-200/70 bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] transition-all duration-150 dark:border-slate-700/70 dark:from-slate-900 dark:to-slate-800",
        active
          ? "shadow-[inset_4px_4px_8px_#cbd5e1,inset_-4px_-4px_8px_#ffffff] dark:shadow-[inset_4px_4px_10px_rgba(2,6,23,0.72),inset_-4px_-4px_10px_rgba(51,65,85,0.22)]"
          : "shadow-[6px_6px_12px_#cbd5e1,-6px_-6px_12px_#ffffff] dark:shadow-[0_14px_30px_rgba(2,6,23,0.45)]",
        hover && !active && "hover:-translate-y-0.5 hover:shadow-[8px_8px_16px_#cbd5e1,-8px_-8px_16px_#ffffff] dark:hover:shadow-[0_18px_38px_rgba(2,6,23,0.6)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function NeuButton({
  children,
  onClick,
  variant = "default",
  size = "md",
  className,
  disabled = false,
  icon: Icon,
  loading = false
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "danger" | "ghost" | "secondary";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}) {
  const sizeClasses = {
    sm: "px-3 py-2 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base"
  };

  const variantClasses = {
    default: cn(
      "bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] text-slate-600 dark:from-slate-900 dark:to-slate-800 dark:text-slate-200",
      "shadow-[4px_4px_8px_#cbd5e1,-4px_-4px_8px_#ffffff]",
      "dark:shadow-[0_10px_24px_rgba(2,6,23,0.45)]",
      "hover:shadow-[6px_6px_12px_#cbd5e1,-6px_-6px_12px_#ffffff]",
      "dark:hover:shadow-[0_14px_30px_rgba(2,6,23,0.58)]",
      "active:shadow-[inset_3px_3px_6px_#cbd5e1,inset_-3px_-3px_6px_#ffffff]",
      "dark:active:shadow-[inset_3px_3px_8px_rgba(2,6,23,0.7),inset_-3px_-3px_8px_rgba(51,65,85,0.22)]",
      "transition-all duration-200"
    ),
    primary: cn(
      "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white",
      "shadow-[4px_4px_8px_#cbd5e1,-4px_-4px_8px_#ffffff,0_4px_15px_rgba(16,185,129,0.3)]",
      "dark:shadow-[0_10px_24px_rgba(16,185,129,0.18)]",
      "hover:shadow-[6px_6px_12px_#cbd5e1,-6px_-6px_12px_#ffffff,0_6px_20px_rgba(16,185,129,0.4)]",
      "dark:hover:shadow-[0_14px_30px_rgba(16,185,129,0.26)]",
      "hover:from-emerald-600 hover:to-emerald-700",
      "active:scale-[0.98]",
      "transition-all duration-200"
    ),
    secondary: cn(
      "bg-gradient-to-r from-blue-500 to-blue-600 text-white",
      "shadow-[4px_4px_8px_#cbd5e1,-4px_-4px_8px_#ffffff,0_4px_15px_rgba(59,130,246,0.3)]",
      "dark:shadow-[0_10px_24px_rgba(59,130,246,0.18)]",
      "hover:shadow-[6px_6px_12px_#cbd5e1,-6px_-6px_12px_#ffffff,0_6px_20px_rgba(59,130,246,0.4)]",
      "dark:hover:shadow-[0_14px_30px_rgba(59,130,246,0.26)]",
      "hover:from-blue-600 hover:to-blue-700",
      "active:scale-[0.98]",
      "transition-all duration-200"
    ),
    danger: cn(
      "bg-gradient-to-r from-red-500 to-red-600 text-white",
      "shadow-[4px_4px_8px_#cbd5e1,-4px_-4px_8px_#ffffff,0_4px_15px_rgba(239,68,68,0.3)]",
      "dark:shadow-[0_10px_24px_rgba(239,68,68,0.18)]",
      "hover:shadow-[6px_6px_12px_#cbd5e1,-6px_-6px_12px_#ffffff,0_6px_20px_rgba(239,68,68,0.4)]",
      "dark:hover:shadow-[0_14px_30px_rgba(239,68,68,0.26)]",
      "hover:from-red-600 hover:to-red-700",
      "active:scale-[0.98]",
      "transition-all duration-200"
    ),
    ghost: cn(
      "text-slate-500 hover:bg-slate-100/50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100",
      "transition-all duration-200"
    )
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl font-medium",
        sizeClasses[size],
        variantClasses[variant],
        (disabled || loading) && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {loading ? (
        <RefreshCw className="w-4 h-4 animate-spin" />
      ) : Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}

function NeuInput({
  value,
  onChange,
  placeholder,
  type = "text",
  icon: Icon,
  className
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />}
      <input
        type={type}
        title={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-2xl border border-slate-200/70 bg-white transition-all duration-200 dark:border-slate-700/70 dark:bg-slate-900",
          "shadow-[4px_4px_8px_#e2e8f0,-4px_-4px_8px_#ffffff]",
          "dark:shadow-[0_10px_24px_rgba(2,6,23,0.45)]",
          "focus:shadow-[6px_6px_12px_#e2e8f0,-6px_-6px_12px_#ffffff]",
          "dark:focus:shadow-[0_14px_30px_rgba(2,6,23,0.58)]",
          "focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40",
          "text-slate-700 placeholder-slate-400 outline-none dark:text-slate-100 dark:placeholder-slate-500",
          Icon ? "pl-12 pr-4 py-3" : "px-4 py-3"
        )}
      />
    </div>
  );
}

function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.floor(easeOutQuart * value));
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{displayValue.toLocaleString()}</span>;
}

// ============================================================================
// Quick Filter Card Component
// ============================================================================

function QuickFilterCard({
  active,
  onClick,
  icon: Icon,
  label,
  count,
  color,
  index = 0
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  color: "emerald" | "blue" | "purple" | "orange" | "slate";
  index?: number;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const colorClasses = {
    emerald: {
      gradient: "from-emerald-500 via-emerald-600 to-emerald-700",
      bg: "bg-emerald-500",
      light: "bg-emerald-100 dark:bg-emerald-500/15",
      text: "text-emerald-700",
      shadow: "shadow-emerald-500/30",
      glow: "shadow-emerald-500/50",
      ring: "ring-emerald-200"
    },
    blue: {
      gradient: "from-blue-500 via-blue-600 to-blue-700",
      bg: "bg-blue-500",
      light: "bg-blue-100 dark:bg-blue-500/15",
      text: "text-blue-700",
      shadow: "shadow-blue-500/30",
      glow: "shadow-blue-500/50",
      ring: "ring-blue-200"
    },
    purple: {
      gradient: "from-purple-500 via-purple-600 to-purple-700",
      bg: "bg-purple-500",
      light: "bg-purple-100 dark:bg-purple-500/15",
      text: "text-purple-700",
      shadow: "shadow-purple-500/30",
      glow: "shadow-purple-500/50",
      ring: "ring-purple-200"
    },
    orange: {
      gradient: "from-orange-500 via-orange-600 to-orange-700",
      bg: "bg-orange-500",
      light: "bg-orange-100 dark:bg-orange-500/15",
      text: "text-orange-700",
      shadow: "shadow-orange-500/30",
      glow: "shadow-orange-500/50",
      ring: "ring-orange-200"
    },
    slate: {
      gradient: "from-slate-500 via-slate-600 to-slate-700",
      bg: "bg-slate-500",
      light: "bg-slate-100 dark:bg-slate-700/70",
      text: "text-slate-700",
      shadow: "shadow-slate-500/30",
      glow: "shadow-slate-500/50",
      ring: "ring-slate-200"
    },
  };

  const colors = colorClasses[color];

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      className={cn(
        "group relative flex flex-col items-start gap-3 p-5 rounded-2xl transition-all duration-500 w-full overflow-hidden border backdrop-blur-xl",
        active
          ? cn("bg-gradient-to-br text-white border-white/20", colors.gradient, colors.shadow, "shadow-lg scale-[1.02]")
          : cn("border-white/60 bg-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:-translate-y-1 hover:scale-[1.02] hover:bg-white/95 hover:shadow-xl hover:shadow-slate-200/50 dark:border-slate-700/70 dark:bg-slate-900/80 dark:shadow-[0_14px_30px_rgba(2,6,23,0.4)] dark:hover:bg-slate-800/90 dark:hover:shadow-black/30"),
        isPressed && "scale-[0.98] transition-transform duration-150"
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className={cn(
        "absolute inset-0 opacity-0 transition-opacity duration-500",
        active ? "opacity-100" : "group-hover:opacity-100",
        "bg-gradient-to-br from-white/10 to-transparent"
      )} />

      <div className="relative flex items-center justify-between w-full">
<div className={cn(
          "flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-150",
          active
            ? "bg-white/20 shadow-inner"
            : cn("bg-gradient-to-br shadow-md", colors.light, "group-hover:shadow-lg group-hover:scale-110")
        )}>
          {Icon && <Icon className="w-6 h-6 transition-all duration-150" />}
        </div>
        {active && <CheckCircle2 className="w-5 h-5 text-white/80" />}
      </div>

      <div className="relative w-full text-left">
        <div className={cn(
"text-3xl font-bold tracking-tight transition-all duration-150",
          active ? "text-white" : "text-slate-800 dark:text-slate-100"
        )}>
          <AnimatedCounter value={count} duration={800 + index * 100} />
        </div>
        <div className={cn(
"text-sm font-medium transition-all duration-150",
          active ? "text-white/80" : "text-slate-500 dark:text-slate-400"
        )}>
          {label}
        </div>
      </div>

      <div className={cn(
        "absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 pointer-events-none",
        isHovered && !active && colors.glow,
        isHovered && "opacity-20 blur-xl"
      )} />
    </button>
  );
}

// ============================================================================
// View Toggle Component
// ============================================================================

function ViewToggle({
  view,
  onChange,
  t
}: {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-slate-100/80 p-1 shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] dark:bg-slate-800/80 dark:shadow-[inset_2px_2px_6px_rgba(2,6,23,0.65),inset_-2px_-2px_6px_rgba(51,65,85,0.22)]">
      <button
        type="button"
        onClick={() => onChange("grid")}
        aria-label={t.grid}
        title={t.grid}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
          view === "grid"
            ? "bg-white text-emerald-600 shadow-[2px_2px_4px_#cbd5e1,-2px_-2px_4px_#ffffff] dark:bg-slate-900 dark:text-emerald-300 dark:shadow-[0_6px_14px_rgba(2,6,23,0.4)]"
            : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
        )}
      >
        <Grid3X3 className="w-4 h-4" />
        <span className="hidden sm:inline">{t.grid}</span>
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-label={t.list}
        title={t.list}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
          view === "list"
            ? "bg-white text-emerald-600 shadow-[2px_2px_4px_#cbd5e1,-2px_-2px_4px_#ffffff] dark:bg-slate-900 dark:text-emerald-300 dark:shadow-[0_6px_14px_rgba(2,6,23,0.4)]"
            : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
        )}
      >
        <List className="w-4 h-4" />
        <span className="hidden sm:inline">{t.list}</span>
      </button>
    </div>
  );
}

// ============================================================================
// Totals Toggle Component
// ============================================================================

function TotalsToggle({
  mode,
  onChange
}: {
  mode: TotalsMode;
  onChange: (mode: TotalsMode) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={cn("font-medium transition-colors", mode === "all" ? "text-slate-800 dark:text-slate-100" : "text-slate-500 dark:text-slate-400")}>
        All-time
      </span>
      <button
        type="button"
        onClick={() => onChange(mode === "all" ? "filtered" : "all")}
        aria-label="Toggle totals mode"
        aria-pressed={mode === "filtered" ? "true" : "false"}
        title="Toggle totals mode"
        className={cn(
"relative w-12 h-6 rounded-full transition-colors duration-150 shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff]",
          mode === "filtered" ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"
        )}
      >
        <span
          className={cn(
"absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-150 dark:bg-slate-200",
            mode === "filtered" ? "translate-x-6" : "translate-x-0"
          )}
        />
      </button>
      <span className={cn("font-medium transition-colors", mode === "filtered" ? "text-slate-800 dark:text-slate-100" : "text-slate-500 dark:text-slate-400")}>
        Filtered
      </span>
    </div>
  );
}

// ============================================================================
// Filter Tag Component
// ============================================================================

function FilterTag({
  label,
  value,
  onRemove
}: {
  label: string;
  value: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
      <span className="text-emerald-500 dark:text-emerald-300">{label}:</span>
      <span className="font-semibold">{value}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        title={`Remove ${label} filter`}
        className="ml-1 rounded-full p-0.5 text-emerald-600 transition-colors hover:bg-emerald-200 hover:text-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-100"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

// ============================================================================
// Action Button Component
// ============================================================================

function ActionButton({
  onClick,
  icon: Icon,
  label,
  variant = "default"
}: {
  onClick: (e: React.MouseEvent) => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  variant?: "default" | "edit" | "delete";
}) {
  const variantClasses = {
    default: "text-slate-500 hover:text-emerald-600 hover:ring-emerald-200 dark:text-slate-400 dark:hover:text-emerald-300 dark:hover:ring-emerald-500/30",
    edit: "text-slate-500 hover:text-blue-600 hover:ring-blue-200 dark:text-slate-400 dark:hover:text-blue-300 dark:hover:ring-blue-500/30",
    delete: "text-slate-500 hover:text-red-600 hover:ring-red-200 dark:text-slate-400 dark:hover:text-red-300 dark:hover:ring-red-500/30"
  };

return (
    <button
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className={cn(
        "group relative flex h-9 w-9 items-center justify-center rounded-xl bg-white dark:bg-slate-800",
        "shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_18px_rgba(2,6,23,0.45)] dark:hover:shadow-[0_10px_24px_rgba(2,6,23,0.6)]",
        "hover:scale-105 active:scale-95 transition-all duration-200",
        "ring-1 ring-slate-100 dark:ring-slate-700",
        variantClasses[variant]
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg z-50">
        {label}
      </span>
    </button>
  );
}

// ============================================================================
// Vehicle Card Component (Grid View)
// ============================================================================

function VehicleCard({
  vehicle,
  isAdmin,
  onView,
  onEdit,
  onDelete,
  getImageUrl,
  t,
  language
}: {
  vehicle: Vehicle;
  isAdmin: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (vehicle: Vehicle) => void;
  getImageUrl: (imageValue: unknown) => string | null;
  t: Translations;
  language: Language;
}) {
  const getCategoryColor = (category: string) => {
    const cat = category?.toLowerCase() || "";
    if (cat.includes("car")) return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/30";
    if (cat.includes("motor") || cat.includes("bike")) return "bg-purple-50 text-purple-700 ring-purple-100 dark:bg-purple-500/15 dark:text-purple-300 dark:ring-purple-500/30";
    if (cat.includes("tuk") || cat.includes("rickshaw")) return "bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-500/30";
    return "bg-slate-50 text-slate-700 ring-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
  };

  const getConditionColor = (condition: string) => {
    return condition?.toLowerCase() === "new"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30"
      : "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30";
  };

  const imageUrl = getImageUrl(vehicle.Image);
  const colorLabel = translateVehicleColor(vehicle.Color, language);

return (
    <div
      id={getVehicleListItemElementId(vehicle.VehicleId)}
      data-vehicle-list-item-id={vehicle.VehicleId}
      tabIndex={-1}
      className="group scroll-mt-24 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all duration-150 hover:border-emerald-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] focus:outline-none focus:ring-2 focus:ring-emerald-400/40 dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-[0_16px_32px_rgba(2,6,23,0.45)] dark:hover:border-emerald-500/35 dark:hover:shadow-[0_20px_42px_rgba(2,6,23,0.62)]"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
        {imageUrl ? (
            <Image
              src={imageUrl}
              alt={`${vehicle.Brand} ${vehicle.Model}`}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              unoptimized={shouldBypassNextImageOptimization(imageUrl)}
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                console.warn('[Image onError]', imageUrl);
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-slate-800">
              <Car className="h-10 w-10 text-slate-300 dark:text-slate-600" aria-hidden="true" />
            </div>
          )}
        <div className="absolute top-3 left-3">
          <span className={cn(
            "px-2.5 py-1 rounded-lg text-xs font-medium ring-1",
            getCategoryColor(vehicle.Category)
          )}>
            {vehicle.Category}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <span className={cn(
            "px-2.5 py-1 rounded-full text-xs font-medium ring-1 flex items-center gap-1.5",
            getConditionColor(vehicle.Condition)
          )}>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              vehicle.Condition?.toLowerCase() === "new" ? "bg-emerald-500" : "bg-amber-500"
            )} />
            {vehicle.Condition}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{vehicle.Brand}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{vehicle.Model}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-emerald-600 text-lg">
              ${vehicle.PriceNew?.toLocaleString() || "-"}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{t.marketPrice}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <span className="text-slate-400 dark:text-slate-500">{t.year}:</span>
            <span className="font-medium">{vehicle.Year || "-"}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <span className="text-slate-400 dark:text-slate-500">{t.plate}:</span>
            <span className="font-medium font-mono">{vehicle.Plate || "-"}</span>
          </div>
          {vehicle.Color && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <span className="text-slate-400 dark:text-slate-500">{t.color}:</span>
              <span
                className="h-4 w-4 rounded-full border border-slate-200 dark:border-slate-600"
                style={{ backgroundColor: getVehicleColorHex(vehicle.Color) }}
                title={colorLabel}
              />
              <span className="font-medium">{colorLabel}</span>
            </div>
          )}
          {vehicle.TaxType && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <span className="text-slate-400 dark:text-slate-500">{t.taxType}:</span>
              <span className="font-medium">{vehicle.TaxType}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <ActionButton
            onClick={() => onView(vehicle.VehicleId)}
            icon={Eye}
            label={t.view}
          />
          {isAdmin && (
            <>
              <ActionButton
                onClick={() => onEdit(vehicle.VehicleId)}
                icon={Pen}
                label={t.edit}
                variant="edit"
              />
              <ActionButton
                onClick={() => onDelete(vehicle)}
                icon={Trash2}
                label={t.delete}
                variant="delete"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MobileVehicleListCard({
  vehicle,
  isAdmin,
  onView,
  onEdit,
  onDelete,
  getImageUrl,
}: {
  vehicle: Vehicle;
  isAdmin: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (vehicle: Vehicle) => void;
  getImageUrl: (imageValue: unknown) => string | null;
}) {
  const imageUrl = getImageUrl(vehicle.Image);

  const getMobileCategoryClass = (category: string) => {
    const cat = category?.toLowerCase() || "";
    if (cat.includes("car")) return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/30";
    if (cat.includes("motor") || cat.includes("bike")) return "bg-purple-50 text-purple-700 ring-purple-100 dark:bg-purple-500/15 dark:text-purple-300 dark:ring-purple-500/30";
    if (cat.includes("tuk") || cat.includes("rickshaw")) return "bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-500/30";
    return "bg-slate-50 text-slate-700 ring-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
  };

  return (
    <article
      data-vehicle-list-item-id={vehicle.VehicleId}
      tabIndex={-1}
      onClick={() => onView(vehicle.VehicleId)}
      className="scroll-mt-24 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.07)] transition-transform focus:outline-none focus:ring-2 focus:ring-emerald-400/40 active:scale-[0.99] dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-[0_14px_30px_rgba(2,6,23,0.45)]"
    >
      <div className="flex items-start gap-3">
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 shadow-sm dark:bg-slate-800">
          <Car className="absolute inset-0 m-auto h-6 w-6 text-slate-300 dark:text-slate-600" aria-hidden="true" />
          {imageUrl && (
            <Image
              src={imageUrl}
              alt={vehicle.Model || "Vehicle"}
              fill
              sizes="64px"
              unoptimized={shouldBypassNextImageOptimization(imageUrl)}
              className="object-cover"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-slate-900 dark:text-slate-100">
                {vehicle.Brand || "-"} {vehicle.Model || "-"}
              </h3>
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                {vehicle.Year || "-"} {vehicle.Plate ? `- ${vehicle.Plate}` : ""}
              </p>
            </div>
            <span className={cn(
              "flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
              getMobileCategoryClass(vehicle.Category)
            )}>
              {vehicle.Category || "-"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/80">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Brand</div>
              <div className="truncate font-semibold text-slate-800 dark:text-slate-100">{vehicle.Brand || "-"}</div>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/80">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Model</div>
              <div className="truncate font-semibold text-slate-800 dark:text-slate-100">{vehicle.Model || "-"}</div>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/80">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Price</div>
              <div className="truncate font-bold text-emerald-600">
                {vehicle.PriceNew == null ? "-" : `$${vehicle.PriceNew.toLocaleString()}`}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/80">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Condition</div>
              <div className="truncate font-semibold text-slate-800 dark:text-slate-100">{vehicle.Condition || "-"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={() => onView(vehicle.VehicleId)}
          className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 text-sm font-bold text-slate-700 transition-colors active:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:active:bg-slate-700"
        >
          <Eye className="h-4 w-4" />
          View
        </button>
        {isAdmin && (
          <>
            <button
              type="button"
              onClick={() => onEdit(vehicle.VehicleId)}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 text-sm font-bold text-emerald-700 transition-colors active:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:active:bg-emerald-500/25"
            >
              <Pen className="h-4 w-4" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(vehicle)}
              className="flex min-h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 transition-colors active:bg-red-100 dark:bg-red-500/15 dark:text-red-300 dark:active:bg-red-500/25"
              aria-label={`Delete ${vehicle.Brand || "vehicle"} ${vehicle.Model || ""}`.trim()}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </article>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function VehiclesClientEnhanced() {
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthUser();
  const { success, error: showError } = useToast();
  const isAdmin = user?.role === "Admin";
  const [isMobileSafeMode, setIsMobileSafeMode] = useState(detectMobileSafariLike);
  const userSelectedViewModeRef = useRef(false);
  const skipNextFilterPageResetRef = useRef(
    Boolean(searchParams.get(VEHICLE_LIST_PAGE_PARAM) || searchParams.get(VEHICLE_LIST_FOCUS_PARAM))
  );

  // ==========================================================================
  // State Management
  // ==========================================================================

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [totalsMode, setTotalsMode] = useState<TotalsMode>("all");
  const [currentPage, setCurrentPage] = useState(() =>
    parseVehicleListPageParam(searchParams.get(VEHICLE_LIST_PAGE_PARAM))
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    category: "all",
    condition: "all",
    brand: "",
    model: "",
    year: "",
    plate: "",
    minPrice: "",
    maxPrice: "",
    taxType: "",
    hasImage: isTruthyQueryParam(searchParams.get("withoutImage") ?? searchParams.get("noImage")) ? "no" : "",
  });

  // Quick filter - read from URL query param
  const [quickFilter, setQuickFilter] = useState<string | null>(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam) {
      const normalized = categoryParam.toLowerCase();
      if (normalized.includes("car")) return "cars";
      if (normalized.includes("motor")) return "motorcycles";
      if (normalized.includes("tuk")) return "tuktuks";
    }
    return null;
  });
  const filterResetValuesRef = useRef({
    hasImage: filters.hasImage,
    quickFilter,
  });

  useEffect(() => {
    filterResetValuesRef.current = {
      hasImage: filters.hasImage,
      quickFilter,
    };
  }, [filters.hasImage, quickFilter]);

  // Visible columns - load from localStorage or use defaults
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vehiclesVisibleColumns');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as ColumnKey[];
          // Validate that all saved columns exist in COLUMNS
          const validColumns = parsed.filter(key => COLUMNS.some(c => c.key === key));
          if (validColumns.length > 0) return validColumns;
        } catch {
          // Invalid JSON, fall back to defaults
        }
      }
    }
    return COLUMNS.filter(c => c.defaultVisible).map(c => c.key);
  });

  // Save visible columns to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vehiclesVisibleColumns', JSON.stringify(visibleColumns));
    }
  }, [visibleColumns]);

  // Sorting
  const [sortField, setSortField] = useState<keyof Vehicle>("Time");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Group By
  const [groupBy, setGroupBy] = useState<GroupByOption>(() => parseVehicleGroupByParam(searchParams.get("groupBy")));

  // Items Per Page
  const [itemsPerPage, setItemsPerPage] = useState<number>(() => {
    const pageSizeParam = parseVehicleListPageSizeParam(
      searchParams.get(VEHICLE_LIST_PAGE_SIZE_PARAM),
      ITEMS_PER_PAGE_OPTIONS
    );
    if (pageSizeParam) return pageSizeParam;

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vehiclesItemsPerPage');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (ITEMS_PER_PAGE_OPTIONS.includes(parsed)) return parsed;
      }
    }
    return DEFAULT_ITEMS_PER_PAGE;
  });

  // Save items per page to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vehiclesItemsPerPage', itemsPerPage.toString());
    }
  }, [itemsPerPage]);

  // Refs for click outside
  const columnMenuRef = useRef<HTMLDivElement>(null);
  const columnsButtonRef = useRef<HTMLButtonElement>(null);

  // Add Vehicle Modal state
  const [showAddModal, setShowAddModal] = useState(false);

  // Delete Vehicle Modal state
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    setIsMobileSafeMode(detectMobileSafariLike());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const applyDefaultView = () => {
      if (userSelectedViewModeRef.current) return;
      setViewMode(mediaQuery.matches ? "grid" : "list");
    };

    applyDefaultView();
    mediaQuery.addEventListener("change", applyDefaultView);
    return () => mediaQuery.removeEventListener("change", applyDefaultView);
  }, []);

  // ==========================================================================
  // Data Fetching
  // ==========================================================================

  // Desktop can keep the full local dataset. Mobile Safari needs a smaller
  // payload to avoid tab reloads on memory-constrained devices.
  const apiCategoryFilter = useMemo(
    () => categoryFilterToApiCategory(
      quickFilter ?? (filters.category !== "all" ? filters.category : null)
    ),
    [quickFilter, filters.category]
  );

  const { vehicles, meta, loading, error, refresh, isValidating } = useVehiclesNeon({
    limit: isMobileSafeMode ? MOBILE_VEHICLE_FETCH_LIMIT : DESKTOP_VEHICLE_FETCH_LIMIT,
    category: apiCategoryFilter,
    withoutImage: filters.hasImage === "no",
    refreshInterval: 0,
  });
  const isInitialVehiclesLoad = loading && vehicles.length === 0;

  // The vehicles endpoint already includes aggregate stats in its meta payload.
  // Using that avoids a duplicate dashboard-stats request during page load.
  const safeStats = useMemo(() => ({
    total: meta?.total || vehicles.length || 0,
    cars: meta?.countsByCategory?.Cars || 0,
    motorcycles: meta?.countsByCategory?.Motorcycles || 0,
    tuktuks: meta?.countsByCategory?.TukTuks || 0,
  }), [meta, vehicles.length]);

  // Delete vehicle hook
  const { deleteVehicle, isDeleting } = useDeleteVehicle(
    () => {
      success(t.deleteSuccess);
      setIsDeleteModalOpen(false);
      setVehicleToDelete(null);
      refresh(); // Refresh the vehicle list
    },
    (error) => {
      showError(error || t.deleteError);
    }
  );

  // Listen for custom event to open modal from other components
  useEffect(() => {
    const handleOpenModal = () => setShowAddModal(true);
    window.addEventListener('openAddVehicleModal', handleOpenModal);
    return () => window.removeEventListener('openAddVehicleModal', handleOpenModal);
  }, []);

  // Sync quickFilter with URL changes (for sidebar navigation)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const categoryParam = searchParams.get("category");
      const noImageParam = searchParams.get("withoutImage") ?? searchParams.get("noImage");
      const nextHasImage = isTruthyQueryParam(noImageParam) ? "no" : "";
      const nextGroupBy = parseVehicleGroupByParam(searchParams.get("groupBy"));
      const nextPage = parseVehicleListPageParam(searchParams.get(VEHICLE_LIST_PAGE_PARAM));
      const nextPageSize = parseVehicleListPageSizeParam(
        searchParams.get(VEHICLE_LIST_PAGE_SIZE_PARAM),
        ITEMS_PER_PAGE_OPTIONS
      );
      const hasPositionQuery = Boolean(
        searchParams.get(VEHICLE_LIST_PAGE_PARAM) || searchParams.get(VEHICLE_LIST_FOCUS_PARAM)
      );
      const nextQuickFilter = (() => {
        if (!categoryParam) return null;

        const normalized = categoryParam.toLowerCase();
        if (normalized.includes("car")) return "cars";
        if (normalized.includes("motor")) return "motorcycles";
        if (normalized.includes("tuk")) return "tuktuks";
        return null;
      })();
      const willUpdateFilterState =
        filterResetValuesRef.current.hasImage !== nextHasImage ||
        filterResetValuesRef.current.quickFilter !== nextQuickFilter;

      if (hasPositionQuery && willUpdateFilterState) {
        skipNextFilterPageResetRef.current = true;
      }

      setFilters(prev =>
        prev.hasImage === nextHasImage
          ? prev
          : { ...prev, hasImage: nextHasImage }
      );

      setQuickFilter(prev => (prev === nextQuickFilter ? prev : nextQuickFilter));

      setGroupBy(prev => (prev === nextGroupBy ? prev : nextGroupBy));
      setCurrentPage(prev => (prev === nextPage ? prev : nextPage));
      if (nextPageSize) {
        setItemsPerPage(prev => (prev === nextPageSize ? prev : nextPageSize));
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [searchParams]);

  // ==========================================================================
  // Effects
  // ==========================================================================

  // Update last sync time when data refreshes
  useEffect(() => {
    if (isValidating || loading) return;
    const timeoutId = setTimeout(() => setLastSync(new Date()), 0);
    return () => clearTimeout(timeoutId);
  }, [isValidating, loading]);

  // Reset page when filters change
  useEffect(() => {
    if (skipNextFilterPageResetRef.current) {
      skipNextFilterPageResetRef.current = false;
      return;
    }

    const timeoutId = setTimeout(() => setCurrentPage(1), 0);
    return () => clearTimeout(timeoutId);
  }, [filters, quickFilter]);

  // Click outside to close menus
  useEffect(() => {
    function handlePointerOutside(event: MouseEvent) {
      const target = event.target as Node;
      // Close column menu if click is outside both the menu and the button
      if (
        showColumnMenu &&
        columnMenuRef.current &&
        !columnMenuRef.current.contains(target) &&
        columnsButtonRef.current &&
        !columnsButtonRef.current.contains(target)
      ) {
        setShowColumnMenu(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (showColumnMenu && event.key === "Escape") {
        setShowColumnMenu(false);
      }
    }

    document.addEventListener("mousedown", handlePointerOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showColumnMenu]);

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

const isCarCategory = useCallback((cat: string | undefined): boolean => {
    return cat?.toLowerCase().includes('car') || false;
  }, []);

const isMotorcycleCategory = useCallback((cat: string | undefined): boolean => {
    return cat?.toLowerCase().includes('motor') || cat?.toLowerCase().includes('bike') || false;
  }, []);

const isTukTukCategory = useCallback((cat: string | undefined): boolean => {
    return cat?.toLowerCase().includes('tuk') || false;
  }, []);

  // ==========================================================================
  // Grouping Logic
  // ==========================================================================

  interface GroupedVehicles {
    key: string;
    label: string;
    count: number;
    avgPrice: number;
    vehicles: Vehicle[];
  }

  interface VehicleGroupBucket {
    label: string;
    vehicles: Vehicle[];
  }

  const getGroupLabel = useCallback((value: string, groupBy: GroupByOption): string => {
    if (groupBy === "none") return "All Vehicles";
    const normalizedValue = normalizeGroupKey(value, groupBy);
    if (!value || normalizedValue === "undefined" || normalizedValue === "null") {
      switch (groupBy) {
        case "category": return "Uncategorized";
        case "brand": return "Unknown Brand";
        case "year": return "Unknown Year";
        case "condition": return "Unknown Condition";
        case "color": return "Unknown Color";
      }
    }
    if (groupBy === "color") return translateVehicleColor(value, language);
    return value;
  }, [language]);

  const groupVehicles = useCallback((vehicles: Vehicle[], groupBy: GroupByOption): GroupedVehicles[] => {
    if (groupBy === "none") {
      return [{
        key: "all",
        label: "All Vehicles",
        count: vehicles.length,
        avgPrice: vehicles.reduce((sum, v) => sum + (v.PriceNew || 0), 0) / (vehicles.length || 1),
        vehicles
      }];
    }

    const groups = new Map<string, VehicleGroupBucket>();

    vehicles.forEach(vehicle => {
      const groupValue = getVehicleGroupValue(vehicle, groupBy);
      const key = getVehicleGroupKey(vehicle, groupBy);
      if (!groups.has(key)) {
        groups.set(key, {
          label: getGroupLabel(groupValue, groupBy),
          vehicles: []
        });
      }
      groups.get(key)!.vehicles.push(vehicle);
    });

    // Sort groups alphabetically or numerically
    const sortedEntries = Array.from(groups.entries()).sort((a, b) => {
      if (groupBy === "year") {
        return parseInt(b[0]) - parseInt(a[0]); // Descending for years
      }
      return a[1].label.localeCompare(b[1].label, undefined, { sensitivity: "base" });
    });

    return sortedEntries.map(([key, group]) => ({
      key,
      label: group.label,
      count: group.vehicles.length,
      avgPrice: group.vehicles.reduce((sum, v) => sum + (v.PriceNew || 0), 0) / (group.vehicles.length || 1),
      vehicles: group.vehicles
    }));
  }, [getGroupLabel]);

  // ==========================================================================
  // Filtering Logic
  // ==========================================================================

  const deferredFilters = useDeferredValue(filters);
  const deferredQuickFilter = useDeferredValue(quickFilter);

  const filteredVehicles = useMemo(() => {
    if (!vehicles) return [];

    let result = [...vehicles];

    // Apply quick filter
    if (deferredQuickFilter) {
      switch (deferredQuickFilter) {
        case "cars":
          result = result.filter(v => categoryMatchesFilter(v.Category, "cars"));
          break;
        case "motorcycles":
          result = result.filter(v => categoryMatchesFilter(v.Category, "motorcycles"));
          break;
        case "tuktuks":
          result = result.filter(v => categoryMatchesFilter(v.Category, "tuktuks"));
          break;
      }
    }

    // Apply advanced filters
    if (deferredFilters.search) {
      const searchTerms = deferredFilters.search.toLowerCase().trim().split(/\s+/).filter(term => term.length > 0);

      if (searchTerms.length > 0) {
        result = result.filter(v => {
          // Create a searchable string from all vehicle fields
          const searchableText = [
            v.Brand,
            v.Model,
            v.Plate,
            v.Category,
            v.Year?.toString(),
            v.Color,
            v.Condition,
            v.BodyType,
            v.TaxType
          ].filter(Boolean).join(' ').toLowerCase();

          // ALL search terms must match somewhere in the vehicle data
          return searchTerms.every(term => searchableText.includes(term));
        });
      }
    }

    if (deferredFilters.category && deferredFilters.category !== "all") {
      result = result.filter(v => categoryMatchesFilter(v.Category, deferredFilters.category));
    }

    if (deferredFilters.condition && deferredFilters.condition !== "all") {
      result = result.filter(v => v.Condition?.toLowerCase() === deferredFilters.condition.toLowerCase());
    }

    if (deferredFilters.brand) {
      result = result.filter(v => v.Brand?.toLowerCase().includes(deferredFilters.brand.toLowerCase()));
    }

    if (deferredFilters.model) {
      result = result.filter(v => v.Model?.toLowerCase().includes(deferredFilters.model.toLowerCase()));
    }

    if (deferredFilters.year) {
      result = result.filter(v => v.Year?.toString().includes(deferredFilters.year));
    }

    if (deferredFilters.plate) {
      result = result.filter(v => v.Plate?.toLowerCase().includes(deferredFilters.plate.toLowerCase()));
    }

    if (deferredFilters.minPrice) {
      const minPrice = parseFloat(deferredFilters.minPrice);
      if (!isNaN(minPrice)) {
        result = result.filter(v => (v.PriceNew || 0) >= minPrice);
      }
    }

    if (deferredFilters.maxPrice) {
      const maxPrice = parseFloat(deferredFilters.maxPrice);
      if (!isNaN(maxPrice)) {
        result = result.filter(v => (v.PriceNew || 0) <= maxPrice);
      }
    }

    if (deferredFilters.taxType) {
      result = result.filter(v => v.TaxType?.toLowerCase().includes(deferredFilters.taxType.toLowerCase()));
    }

    // Apply image filter
    if (deferredFilters.hasImage === 'no') {
      result = result.filter(v => !vehicleHasDisplayableImage(v.Image));
    }

    // Apply sorting
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === null || aVal === undefined) return sortDirection === "asc" ? -1 : 1;
      if (bVal === null || bVal === undefined) return sortDirection === "asc" ? 1 : -1;

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [vehicles, deferredQuickFilter, deferredFilters, sortField, sortDirection]);

  // ==========================================================================
  // Fuzzy Suggestions (when search returns no exact matches)
  // ==========================================================================

  const fuzzySuggestions = useMemo(() => {
    if (!vehicles || vehicles.length === 0) return [];
    if (!filters.search || filters.search.trim().length < 2) return [];
    if (filteredVehicles.length > 0) return [];

    return getFuzzySuggestions(filters.search, vehicles, {
      limit: 5,
      minScore: 0.3,
    });
  }, [vehicles, filters.search, filteredVehicles.length]);

  // ==========================================================================
  // Stats Calculation
  // ==========================================================================

  const displayStats = useMemo(() => {
    if (totalsMode === "all") {
      return safeStats;
    }

    // Calculate from filtered vehicles (local counts)
    return {
      total: filteredVehicles.length,
      ...filteredVehicles.reduce(
        (counts, vehicle) => {
          if (isCarCategory(vehicle.Category)) counts.cars += 1;
          else if (isMotorcycleCategory(vehicle.Category)) counts.motorcycles += 1;
          else if (isTukTukCategory(vehicle.Category)) counts.tuktuks += 1;
          return counts;
        },
        { cars: 0, motorcycles: 0, tuktuks: 0 }
      ),
    };
  }, [totalsMode, safeStats, filteredVehicles, isCarCategory, isMotorcycleCategory, isTukTukCategory]);

  // ==========================================================================
  // Pagination
  // ==========================================================================

  const paginatedVehicles = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredVehicles.slice(start, start + itemsPerPage);
  }, [filteredVehicles, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage);
  const focusedVehicleId = searchParams.get(VEHICLE_LIST_FOCUS_PARAM) ?? "";

  const visibleVehicleGroups = useMemo(
    () => groupVehicles(groupBy === "none" && !deferredFilters.search ? paginatedVehicles : filteredVehicles, groupBy),
    [deferredFilters.search, filteredVehicles, groupBy, paginatedVehicles, groupVehicles]
  );

  const currentVehicleListSearchParams = useMemo(
    () => setVehicleListQueryValue(searchParams, "groupBy", groupBy === "none" ? null : groupBy),
    [groupBy, searchParams]
  );

  useEffect(() => {
    if (totalPages <= 0 || currentPage <= totalPages) return;
    setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!focusedVehicleId || isInitialVehiclesLoad) return;

    const timeoutId = window.setTimeout(() => {
      const directTarget = document.getElementById(getVehicleListItemElementId(focusedVehicleId));
      const dataTargets = Array.from(
        document.querySelectorAll<HTMLElement>("[data-vehicle-list-item-id]")
      ).filter((element) => element.dataset.vehicleListItemId === focusedVehicleId);
      const target =
        (directTarget?.offsetParent ? directTarget : null) ??
        dataTargets.find((element) => element.offsetParent !== null) ??
        directTarget ??
        dataTargets[0];

      target?.scrollIntoView({ block: "center", behavior: "smooth" });
      target?.focus({ preventScroll: true });
    }, 80);

    return () => window.clearTimeout(timeoutId);
  }, [focusedVehicleId, isInitialVehiclesLoad, paginatedVehicles]);

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  const getVehicleListUrl = useCallback((params: URLSearchParams) => {
    const query = params.toString();
    return query ? `/vehicles?${query}` : "/vehicles";
  }, []);

  const buildVehicleListParams = useCallback((
    options: {
      page?: number;
      pageSize?: number;
      focusVehicleId?: string | null;
    } = {}
  ) => {
    const nextParams = new URLSearchParams(currentVehicleListSearchParams.toString());
    const nextPage = Math.max(1, options.page ?? currentPage);
    const nextPageSize = options.pageSize ?? itemsPerPage;

    if (nextPage > 1) {
      nextParams.set(VEHICLE_LIST_PAGE_PARAM, String(nextPage));
    } else {
      nextParams.delete(VEHICLE_LIST_PAGE_PARAM);
    }

    if (nextPageSize !== DEFAULT_ITEMS_PER_PAGE) {
      nextParams.set(VEHICLE_LIST_PAGE_SIZE_PARAM, String(nextPageSize));
    } else {
      nextParams.delete(VEHICLE_LIST_PAGE_SIZE_PARAM);
    }

    if (options.focusVehicleId) {
      nextParams.set(VEHICLE_LIST_FOCUS_PARAM, options.focusVehicleId);
    } else if (options.focusVehicleId === null) {
      nextParams.delete(VEHICLE_LIST_FOCUS_PARAM);
    }

    return nextParams;
  }, [currentPage, currentVehicleListSearchParams, itemsPerPage]);

  const replaceCurrentHistoryWithListState = useCallback((params: URLSearchParams) => {
    if (typeof window === "undefined") return;
    window.history.replaceState(window.history.state, "", getVehicleListUrl(params));
  }, [getVehicleListUrl]);

  const handlePageChange = useCallback((nextPage: number) => {
    const safeTotalPages = Math.max(1, totalPages);
    const safePage = Math.min(Math.max(1, nextPage), safeTotalPages);
    const nextParams = buildVehicleListParams({ page: safePage, focusVehicleId: null });

    setCurrentPage(safePage);
    router.replace(getVehicleListUrl(nextParams), { scroll: false });
  }, [buildVehicleListParams, getVehicleListUrl, router, totalPages]);

  const handleItemsPerPageChange = useCallback((nextItemsPerPage: number) => {
    const nextParams = buildVehicleListParams({
      page: 1,
      pageSize: nextItemsPerPage,
      focusVehicleId: null,
    });

    setItemsPerPage(nextItemsPerPage);
    setCurrentPage(1);
    router.replace(getVehicleListUrl(nextParams), { scroll: false });
  }, [buildVehicleListParams, getVehicleListUrl, router]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
    setLastSync(new Date());
    success(t.syncSuccess);
  }, [refresh, success, t.syncSuccess]);

  const handleSort = useCallback((field: keyof Vehicle) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }, [sortField]);

  const handleViewModeChange = useCallback((nextViewMode: ViewMode) => {
    userSelectedViewModeRef.current = true;
    setViewMode(nextViewMode);
  }, []);

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      category: "all",
      condition: "all",
      brand: "",
      model: "",
      year: "",
      plate: "",
      minPrice: "",
      maxPrice: "",
      taxType: "",
      hasImage: "",
    });
    setQuickFilter(null);
    setCurrentPage(1);
    router.push("/vehicles", { scroll: false });
  };

  const hasActiveFilters = () => {
    return filters.search || filters.brand || filters.model || filters.year ||
           filters.plate || filters.minPrice || filters.maxPrice || filters.taxType ||
           filters.hasImage ||
           (filters.category && filters.category !== "all") ||
           (filters.condition && filters.condition !== "all") ||
           quickFilter !== null;
  };

  const handleGroupByChange = useCallback((nextGroupBy: GroupByOption) => {
    setGroupBy(nextGroupBy);
    const nextParams = setVehicleListQueryValue(
      searchParams,
      "groupBy",
      nextGroupBy === "none" ? null : nextGroupBy
    );
    nextParams.delete(VEHICLE_LIST_PAGE_PARAM);
    nextParams.delete(VEHICLE_LIST_FOCUS_PARAM);
    setCurrentPage(1);
    router.replace(getVehicleListUrl(nextParams), { scroll: false });
  }, [getVehicleListUrl, router, searchParams]);

  const cacheVehicleForDetail = useCallback((id: string) => {
    if (typeof window === "undefined") return;

    const selectedVehicle =
      filteredVehicles.find((vehicle) => vehicle.VehicleId === id) ??
      vehicles.find((vehicle) => vehicle.VehicleId === id);

    if (!selectedVehicle) return;

    try {
      sessionStorage.setItem(`vms-selected-vehicle-${id}`, JSON.stringify(selectedVehicle));
    } catch {
      // Best-effort handoff for detail pages.
    }
  }, [filteredVehicles, vehicles]);

  const handleView = useCallback((id: string) => {
    cacheVehicleForDetail(id);
    const returnParams = buildVehicleListParams({ focusVehicleId: id });
    replaceCurrentHistoryWithListState(returnParams);
    router.push(withVehicleListQuery(`/vehicles/${encodeURIComponent(id)}/view`, returnParams));
  }, [buildVehicleListParams, cacheVehicleForDetail, replaceCurrentHistoryWithListState, router]);

  const handleEdit = useCallback((id: string) => {
    cacheVehicleForDetail(id);
    const returnParams = buildVehicleListParams({ focusVehicleId: id });
    replaceCurrentHistoryWithListState(returnParams);
    router.push(withVehicleListQuery(`/vehicles/${encodeURIComponent(id)}/edit`, returnParams));
  }, [buildVehicleListParams, cacheVehicleForDetail, replaceCurrentHistoryWithListState, router]);

  const handleDelete = (vehicle: Vehicle) => {
    setVehicleToDelete(vehicle);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (vehicleToDelete) {
      await deleteVehicle(vehicleToDelete);
    }
  };

  // ==========================================================================
  // Image URL Helper
  // ==========================================================================

const getVehicleImageUrl = useCallback((imageValue: unknown): string | null => {
    const normalizedValue = normalizeVehicleImageValue(imageValue);

    if (!normalizedValue) return null;

    const trimmed = normalizedValue.trim();
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Image]', trimmed.substring(0, 50) + '...');
    }

    const resolvedUrl = getVehicleThumbnailUrl(trimmed, "w400-h300");
    if (resolvedUrl) return resolvedUrl;

    // Cloudinary public ID (path format)
    if (/^[a-zA-Z0-9\-_/\\.]+$/.test(trimmed)) {
      const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo';
      return `https://res.cloudinary.com/${cloud}/image/upload/w400,h300,c_fill/${trimmed}`;
    }

    if (process.env.NODE_ENV === 'development') {
      console.warn('[Image] Unknown format:', trimmed);
    }
    return null;
  }, []);

  // ==========================================================================
  // Render Helpers
  // ==========================================================================

  const getSortIcon = (field: ColumnKey) => {
    const fieldMapping: Record<ColumnKey, keyof Vehicle | null> = {
      id: "VehicleId",
      image: null,
      category: "Category",
      brand: "Brand",
      model: "Model",
      year: "Year",
      plate: "Plate",
      priceNew: "PriceNew",
      price40: "Price40",
      price70: "Price70",
      taxType: "TaxType",
      bodyType: "BodyType",
      color: "Color",
      condition: "Condition",
      actions: null
    };

    const vehicleField = fieldMapping[field];
    if (!vehicleField || sortField !== vehicleField) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400" />;
    }
    return sortDirection === "asc" ?
      <ArrowUp className="w-3 h-3 text-emerald-500" /> :
      <ArrowDown className="w-3 h-3 text-emerald-500" />;
  };

  const getCategoryBadgeClass = (category: string) => {
    const cat = category?.toLowerCase() || "";
    if (cat.includes("car")) return "bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/30";
    if (cat.includes("motor") || cat.includes("bike")) return "bg-purple-50 text-purple-700 ring-1 ring-purple-100 dark:bg-purple-500/15 dark:text-purple-300 dark:ring-purple-500/30";
    if (cat.includes("tuk") || cat.includes("rickshaw")) return "bg-orange-50 text-orange-700 ring-1 ring-orange-100 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-500/30";
    return "bg-slate-50 text-slate-700 ring-1 ring-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  if (error && vehicles.length === 0) {
    return (
      <div className="ec-dark-scope min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-4 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <NeuCard className="p-8 text-center" hover={false}>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-red-100 to-red-50 shadow-[6px_6px_12px_#cbd5e1,-6px_-6px_12px_#ffffff] dark:from-red-500/15 dark:to-red-500/5 dark:shadow-[0_14px_30px_rgba(127,29,29,0.25)]">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-slate-800 dark:text-slate-100">{t.errorLoadingVehicles}</h2>
            <p className="mb-8 text-slate-500 dark:text-slate-400">{error}</p>
            <NeuButton onClick={handleRefresh} variant="primary">{t.retry}</NeuButton>
          </NeuCard>
        </div>
      </div>
    );
  }

  return (
    <div className="ec-dark-scope min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-4 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 sm:p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* Header Section */}
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-800 dark:text-slate-100">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Car className="w-6 h-6 text-white" />
              </span>
              Vehicle Inventory
            </h1>
            <p className="ml-13 mt-2 text-slate-500 dark:text-slate-400">{t.manageTrackVehicles}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isInitialVehiclesLoad && (
              <span className="inline-flex items-center gap-2 rounded-xl border border-slate-100 bg-white/80 px-3 py-2 text-xs font-medium text-slate-500 shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-400 dark:shadow-[0_10px_24px_rgba(2,6,23,0.4)]">
                <RefreshCw className="h-4 w-4 animate-spin text-emerald-500" />
                Loading
              </span>
            )}

            {/* Last Sync */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white/80 px-3 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-[0_10px_24px_rgba(2,6,23,0.4)]">
              <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Last sync: {lastSync.toLocaleTimeString()}
              </span>
            </div>

            {/* Totals Toggle */}
            <TotalsToggle mode={totalsMode} onChange={setTotalsMode} />

            {/* Refresh Button */}
            <NeuButton
              variant="default"
              size="sm"
              onClick={handleRefresh}
              loading={isRefreshing}
              icon={RefreshCw}
            >
              Refresh
            </NeuButton>

            {/* Add Vehicle - Admin only */}
            {isAdmin && (
              <NeuButton
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setShowAddModal(true)}
              >
                Add Vehicle
              </NeuButton>
            )}
          </div>
        </div>

        {/* Quick Filter Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickFilterCard
            active={quickFilter === null}
            onClick={() => {
              router.push("/vehicles", { scroll: false });
            }}
            icon={Package}
            label={t.totalVehicles}
            count={displayStats.total}
            color="emerald"
            index={0}
          />
          <QuickFilterCard
            active={quickFilter === "cars"}
            onClick={() => {
              const newFilter = quickFilter === "cars" ? null : "cars";
              if (newFilter) {
                router.push("/vehicles?category=cars", { scroll: false });
              } else {
                router.push("/vehicles", { scroll: false });
              }
            }}
            icon={Car}
            label={t.cars}
            count={displayStats.cars}
            color="blue"
            index={1}
          />
          <QuickFilterCard
            active={quickFilter === "motorcycles"}
            onClick={() => {
              const newFilter = quickFilter === "motorcycles" ? null : "motorcycles";
              if (newFilter) {
                router.push("/vehicles?category=motorcycles", { scroll: false });
              } else {
                router.push("/vehicles", { scroll: false });
              }
            }}
            icon={Bike}
            label={t.motorcycles}
            count={displayStats.motorcycles}
            color="purple"
            index={2}
          />
          <QuickFilterCard
            active={quickFilter === "tuktuks"}
            onClick={() => {
              const newFilter = quickFilter === "tuktuks" ? null : "tuktuks";
              if (newFilter) {
                router.push("/vehicles?category=tuktuks", { scroll: false });
              } else {
                router.push("/vehicles", { scroll: false });
              }
            }}
            icon={TukTukIcon}
            label={t.tuktuks}
            count={displayStats.tuktuks}
            color="orange"
            index={3}
          />
        </div>

          {/* Search and Filters Bar */}
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1">
                <NeuInput
                  value={filters.search}
                  onChange={(val) => setFilters(prev => ({ ...prev, search: val }))}
                  placeholder={t.searchByBrandModel}
                  icon={Search}
                />
              </div>

              {/* Category Dropdown - Quick Access */}
              <div className="w-full sm:w-48">
                <div className="relative">
<select
                    title="Filter by category"
                    value={quickFilter || filters.category}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "all") {
                        setQuickFilter(null);
                        setFilters(prev => ({ ...prev, category: "all" }));
                        router.push("/vehicles", { scroll: false });
                      } else {
                        setQuickFilter(value);
                        setFilters(prev => ({ ...prev, category: "all" }));
                        router.push(`/vehicles?category=${value}`, { scroll: false });
                      }
                    }}
                    className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-[4px_4px_8px_#e2e8f0,-4px_-4px_8px_#ffffff] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700/70 dark:bg-slate-900 dark:text-slate-100 dark:shadow-[0_10px_24px_rgba(2,6,23,0.45)]"
                  >
                    <option value="all">{t.allCategories}</option>
                    <option value="cars">🚗 Cars</option>
                    <option value="motorcycles">🏍️ Motorcycles</option>
                    <option value="tuktuks">🛺 TukTuks</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                </div>
              </div>

              {/* Filter Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <NeuButton
                  variant={showFilters ? "primary" : "default"}
                  size="md"
                  onClick={() => setShowFilters(!showFilters)}
                  icon={Filter}
                >
                  More Filters
                </NeuButton>

              {hasActiveFilters() && (
                <NeuButton
                  variant="ghost"
                  size="md"
                  onClick={resetFilters}
                  icon={RotateCcw}
                >
                  Reset
                </NeuButton>
              )}

              {/* Group By Dropdown */}
              <div className="relative">
<select
                  title="Group vehicles by"
                  value={groupBy}
                  onChange={(e) => handleGroupByChange(e.target.value as GroupByOption)}
                  className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200/70 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-slate-700 shadow-[4px_4px_8px_#e2e8f0,-4px_-4px_8px_#ffffff] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700/70 dark:bg-slate-900 dark:text-slate-100 dark:shadow-[0_10px_24px_rgba(2,6,23,0.45)]"
                >
                  <option value="none">Group: None</option>
                  <option value="category">Group: Category</option>
                  <option value="brand">Group: Brand</option>
                  <option value="year">Group: Year</option>
                  <option value="condition">Group: Condition</option>
                  <option value="color">Group: Color</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              </div>

              <ViewToggle view={viewMode} onChange={handleViewModeChange} t={t} />

              {/* Columns Dropdown */}
              <div className="relative" ref={columnMenuRef}>
                <button
                  type="button"
                  ref={columnsButtonRef}
                  onClick={() => setShowColumnMenu(!showColumnMenu)}
                  aria-expanded={showColumnMenu ? "true" : "false"}
                  aria-haspopup="dialog"
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm",
                    "bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] text-slate-600 dark:from-slate-900 dark:to-slate-800 dark:text-slate-200",
                    "shadow-[4px_4px_8px_#cbd5e1,-4px_-4px_8px_#ffffff]",
                    "dark:shadow-[0_10px_24px_rgba(2,6,23,0.45)]",
                    "hover:shadow-[6px_6px_12px_#cbd5e1,-6px_-6px_12px_#ffffff]",
                    "dark:hover:shadow-[0_14px_30px_rgba(2,6,23,0.58)]",
                    "active:shadow-[inset_3px_3px_6px_#cbd5e1,inset_-3px_-3px_6px_#ffffff]",
                    "dark:active:shadow-[inset_3px_3px_8px_rgba(2,6,23,0.7),inset_-3px_-3px_8px_rgba(51,65,85,0.22)]",
                    "transition-all duration-200"
                  )}
                >
                  <Columns className="w-4 h-4" />
                  Columns
                </button>

                {showColumnMenu && (
                  <>
                    <button
                      type="button"
                      aria-label="Close columns menu"
                      className="fixed inset-0 z-[900] bg-slate-950/35 backdrop-blur-[1px] sm:hidden"
                      onClick={() => setShowColumnMenu(false)}
                    />
                    <NeuCard
                      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[910] flex max-h-[calc(100dvh-env(safe-area-inset-bottom)-10.5rem)] flex-col overflow-hidden rounded-2xl p-4 sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:z-50 sm:mt-2 sm:w-72 sm:max-h-[34rem] sm:p-4"
                      hover={false}
                      role="dialog"
                      aria-labelledby="vehicle-columns-menu-title"
                    >
                      <div className="flex min-h-0 flex-1 flex-col gap-3">
                        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-700">
                          <span id="vehicle-columns-menu-title" className="font-semibold text-slate-700 dark:text-slate-100">{t.visibleColumns}</span>
                          <span className="ml-auto rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                            {visibleColumns.filter(key => key !== "actions").length}/{COLUMNS.length - 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowColumnMenu(false)}
                            aria-label="Close columns menu"
                            title="Close columns menu"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 active:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:active:bg-slate-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1 sm:max-h-64 sm:flex-none">
                          {COLUMNS.filter(col => col.key !== "actions").map((col) => (
                            <label
                              key={col.key}
                              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800 dark:active:bg-slate-700/70"
                            >
                              <input
                                type="checkbox"
                                checked={visibleColumns.includes(col.key)}
                                onChange={() => toggleColumn(col.key)}
                                className="h-5 w-5 shrink-0 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 dark:border-slate-600"
                              />
                              <span className="min-w-0 text-sm font-medium text-slate-600 dark:text-slate-300">{col.label}</span>
                            </label>
                          ))}
                        </div>

                        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => setVisibleColumns(COLUMNS.map(c => c.key))}
                            className="min-h-11 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-600 transition-colors hover:bg-emerald-100 active:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25 dark:active:bg-emerald-500/35 sm:min-h-0 sm:py-1.5 sm:text-xs"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={() => setVisibleColumns(["image", "brand", "model", "actions"])}
                            className="min-h-11 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:active:bg-slate-600 sm:min-h-0 sm:py-1.5 sm:text-xs"
                          >
                            Minimal
                          </button>
                        </div>
                      </div>
                    </NeuCard>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Advanced Filters Panel */}
{showFilters && (
            <div className="animate-in slide-in-from-top-2 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-lg backdrop-blur-xl duration-300 dark:border-slate-700/80 dark:bg-slate-900/90 dark:shadow-[0_18px_40px_rgba(2,6,23,0.5)]">
              <div className="flex items-center justify-between mb-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-100">
                  <Filter className="w-4 h-4 text-emerald-500" />
                  Advanced Filters
                </h4>
                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  aria-label="Close advanced filters"
                  title="Close advanced filters"
                  className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                <div>
                  <label className={FILTER_LABEL_CLASS}>{t.category}</label>
<select
                    title="Filter by category"
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className={FILTER_FIELD_CLASS}
                  >
                    <option value="all">All Categories</option>
                    <option value="cars">Cars</option>
                    <option value="motorcycles">Motorcycles</option>
                    <option value="tuktuks">TukTuks</option>
                  </select>
                </div>

                <div>
                  <label className={FILTER_LABEL_CLASS}>{t.condition}</label>
<select
                    title="Filter by condition"
                    value={filters.condition}
                    onChange={(e) => setFilters(prev => ({ ...prev, condition: e.target.value }))}
                    className={FILTER_FIELD_CLASS}
                  >
                    <option value="all">All Conditions</option>
                    <option value="new">New</option>
                    <option value="used">Used</option>
                    <option value="certified pre-owned">Certified Pre-Owned</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className={FILTER_LABEL_CLASS}>{t.brand}</label>
                  <input
                    type="text"
                    value={filters.brand}
                    onChange={(e) => setFilters(prev => ({ ...prev, brand: e.target.value }))}
                    placeholder="e.g. Toyota"
                    className={FILTER_FIELD_CLASS}
                  />
                </div>

                <div>
                  <label className={FILTER_LABEL_CLASS}>{t.model}</label>
                  <input
                    type="text"
                    value={filters.model}
                    onChange={(e) => setFilters(prev => ({ ...prev, model: e.target.value }))}
                    placeholder="e.g. Camry"
                    className={FILTER_FIELD_CLASS}
                  />
                </div>

                <div>
                  <label className={FILTER_LABEL_CLASS}>{t.year}</label>
                  <input
                    type="text"
                    value={filters.year}
                    onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
                    placeholder="e.g. 2022"
                    className={FILTER_FIELD_CLASS}
                  />
                </div>

                <div>
                  <label className={FILTER_LABEL_CLASS}>{t.plate}</label>
                  <input
                    type="text"
                    value={filters.plate}
                    onChange={(e) => setFilters(prev => ({ ...prev, plate: e.target.value }))}
                    placeholder="e.g. PP-1234"
                    className={FILTER_FIELD_CLASS}
                  />
                </div>

                <div>
                  <label className={FILTER_LABEL_CLASS}>{t.minPrice}</label>
                  <input
                    type="number"
                    value={filters.minPrice}
                    onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                    placeholder="0"
                    className={FILTER_FIELD_CLASS}
                  />
                </div>

                <div>
                  <label className={FILTER_LABEL_CLASS}>{t.maxPrice}</label>
                  <input
                    type="number"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                    placeholder="999999"
                    className={FILTER_FIELD_CLASS}
                  />
                </div>

                <div>
                  <label className={FILTER_LABEL_CLASS}>{t.taxType}</label>
<select
                    title="Filter by tax type"
                    value={filters.taxType}
                    onChange={(e) => setFilters(prev => ({ ...prev, taxType: e.target.value }))}
                    className={FILTER_FIELD_CLASS}
                  >
                    <option value="">All Tax Types</option>
                    <option value="vat">VAT</option>
                    <option value="non-vat">Non-VAT</option>
                    <option value="exempt">Exempt</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className={FILTER_LABEL_CLASS}>{t.imageStatus}</label>
                  <button
                    onClick={() => {
                      const nextHasImage = filters.hasImage === 'no' ? '' : 'no';
                      setFilters(prev => ({ ...prev, hasImage: nextHasImage }));
                      router.push(nextHasImage === 'no' ? "/vehicles?withoutImage=true" : "/vehicles", { scroll: false });
                    }}
                    className={cn(
                      "w-full px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2",
                      filters.hasImage === 'no'
                        ? "border-2 border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300"
                        : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700"
                    )}
                  >
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      filters.hasImage === 'no' ? "bg-amber-500" : "bg-slate-400"
                    )} />
                    {filters.hasImage === 'no' ? 'No Image Only' : 'No Image Filter'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Filter Tags */}
          {hasActiveFilters() && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.activeFilters}:</span>

              {filters.search && (
                <FilterTag
                  label="Search"
                  value={filters.search}
                  onRemove={() => setFilters(prev => ({ ...prev, search: "" }))}
                />
              )}

              {quickFilter && (
                <FilterTag
                  label="Category"
                  value={formatCategoryFilterValue(quickFilter)}
                  onRemove={() => {
                    setQuickFilter(null);
                    router.push("/vehicles", { scroll: false });
                  }}
                />
              )}

              {filters.category !== "all" && (
                <FilterTag
                  label="Category"
                  value={formatCategoryFilterValue(filters.category)}
                  onRemove={() => setFilters(prev => ({ ...prev, category: "all" }))}
                />
              )}

              {filters.condition !== "all" && (
                <FilterTag
                  label="Condition"
                  value={filters.condition}
                  onRemove={() => setFilters(prev => ({ ...prev, condition: "all" }))}
                />
              )}

              {filters.brand && (
                <FilterTag
                  label="Brand"
                  value={filters.brand}
                  onRemove={() => setFilters(prev => ({ ...prev, brand: "" }))}
                />
              )}

              {filters.model && (
                <FilterTag
                  label="Model"
                  value={filters.model}
                  onRemove={() => setFilters(prev => ({ ...prev, model: "" }))}
                />
              )}

              {filters.year && (
                <FilterTag
                  label="Year"
                  value={filters.year}
                  onRemove={() => setFilters(prev => ({ ...prev, year: "" }))}
                />
              )}

              {filters.plate && (
                <FilterTag
                  label="Plate"
                  value={filters.plate}
                  onRemove={() => setFilters(prev => ({ ...prev, plate: "" }))}
                />
              )}

              {(filters.minPrice || filters.maxPrice) && (
                <FilterTag
                  label="Price"
                  value={`$${filters.minPrice || "0"} - $${filters.maxPrice || "∞"}`}
                  onRemove={() => setFilters(prev => ({ ...prev, minPrice: "", maxPrice: "" }))}
                />
              )}

              {filters.taxType && (
                <FilterTag
                  label="Tax"
                  value={filters.taxType}
                  onRemove={() => setFilters(prev => ({ ...prev, taxType: "" }))}
                />
              )}

              {filters.hasImage === 'no' && (
                <FilterTag
                  label="Image"
                  value="No Image Only"
                  onRemove={() => {
                    setFilters(prev => ({ ...prev, hasImage: "" }));
                    router.push("/vehicles", { scroll: false });
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {isInitialVehiclesLoad ? (
                <>
                  Loading <span className="font-semibold text-slate-800 dark:text-slate-100">vehicles</span>...
                </>
              ) : groupBy !== "none" ? (
                <>
                  Showing all <span className="font-semibold text-slate-800 dark:text-slate-100">{filteredVehicles.length}</span> vehicles
                  <span className="ml-2 rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                    Grouped by {groupBy}
                  </span>
                </>
              ) : (
                <>
                  Showing <span className="font-semibold text-slate-800 dark:text-slate-100">{paginatedVehicles.length}</span> of{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{meta?.total || filteredVehicles.length}</span> vehicles
                </>
              )}
            </span>
            {totalsMode === "filtered" && groupBy === "none" && (
              <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                Filtered view
              </span>
            )}
          </div>

          {viewMode === "list" && groupBy === "none" && (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Sorted by {sortField} ({sortDirection})
            </div>
          )}
        </div>

        {/* Vehicle Display */}
        {viewMode === "grid" ? (
          // Grid View with Grouping
          <div className="space-y-8">
            {filteredVehicles.length > 0 && visibleVehicleGroups.map((group) => (
              <div key={group.key} className="space-y-4">
                {/* Group Header */}
                <div className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-gradient-to-r from-slate-50 to-slate-100/80 px-4 py-3 shadow-sm dark:border-slate-700/70 dark:from-slate-900 dark:to-slate-800/80">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{group.label}</h3>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700 shadow-sm dark:bg-emerald-500/15 dark:text-emerald-300">
                      {group.count} vehicles
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">
                    Avg Price: <span className="font-bold text-emerald-600">${Math.round(group.avgPrice).toLocaleString()}</span>
                  </div>
                </div>
                {/* Group Vehicles Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {group.vehicles.map((vehicle) => (
                    <VehicleCard
                      key={vehicle.VehicleId}
                      vehicle={vehicle}
                      isAdmin={isAdmin}
                      onView={handleView}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      getImageUrl={getVehicleImageUrl}
                      t={t}
                      language={language}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // List View (Table) with Grouping
          <div className="space-y-6">
            {filteredVehicles.length > 0 && visibleVehicleGroups.map((group) => (
              <div key={group.key} className="space-y-3">
                {/* Group Header */}
                <div className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-gradient-to-r from-slate-50 to-slate-100/80 px-4 py-3 shadow-sm dark:border-slate-700/70 dark:from-slate-900 dark:to-slate-800/80">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{group.label}</h3>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700 shadow-sm dark:bg-emerald-500/15 dark:text-emerald-300">
                      {group.count} vehicles
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">
                    Avg Price: <span className="font-bold text-emerald-600">${Math.round(group.avgPrice).toLocaleString()}</span>
                  </div>
                </div>
                {/* Group Vehicles List */}
                <div className="space-y-3 md:hidden">
                  {group.vehicles.map((vehicle) => (
                    <MobileVehicleListCard
                      key={vehicle.VehicleId}
                      vehicle={vehicle}
                      isAdmin={isAdmin}
                      onView={handleView}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      getImageUrl={getVehicleImageUrl}
                    />
                  ))}
                </div>

                <div className="hidden overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-[0_18px_40px_rgba(2,6,23,0.5)] md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 z-10">
                        <tr className="border-b border-slate-200 bg-slate-50/95 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/95">
                          {COLUMNS.filter(col => visibleColumns.includes(col.key)).map((col) => (
                            <th
                              key={col.key}
                              className={cn(
                                "px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300",
                                col.sortable && "cursor-pointer select-none transition-colors hover:bg-slate-100/50 hover:text-slate-900 dark:hover:bg-slate-700/60 dark:hover:text-slate-100"
                              )}
                              style={{ width: col.width }}
                              onClick={() => col.sortable && handleSort(col.key as keyof Vehicle)}
                            >
                              <div className="flex items-center gap-1.5">
                                {col.label}
                                {col.sortable && getSortIcon(col.key)}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {group.vehicles.map((vehicle, index) => (
                          <tr
                            key={vehicle.VehicleId}
                            data-vehicle-list-item-id={vehicle.VehicleId}
                            tabIndex={-1}
                            onClick={() => handleView(vehicle.VehicleId)}
                            className="group scroll-mt-24 cursor-pointer transition-all duration-200 hover:bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-400/40 dark:hover:bg-slate-800/70"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            {visibleColumns.includes("id") && (
                              <td className="px-4 py-3.5 text-sm font-medium text-slate-500 dark:text-slate-400">#{vehicle.VehicleId}</td>
                            )}

                            {visibleColumns.includes("image") && (
                              <td className="px-4 py-3.5">
                                {(() => {
                                  const imageUrl = getVehicleImageUrl(vehicle.Image);
                                  return imageUrl ? (
                                    <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-slate-100 shadow-sm ring-2 ring-white dark:bg-slate-800 dark:ring-slate-700">
                                      <Car className="absolute inset-0 m-auto h-5 w-5 text-slate-300 dark:text-slate-600" aria-hidden="true" />
                                      <Image
                                        src={imageUrl}
                                        alt={vehicle.Model || "Vehicle"}
                                        fill
                                        sizes="48px"
                                        unoptimized={shouldBypassNextImageOptimization(imageUrl)}
                                        className="object-cover"
                                        onError={(e) => {
                                          e.currentTarget.style.display = "none";
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                                      <Car className="h-5 w-5 text-slate-400 dark:text-slate-600" />
                                    </div>
                                  );
                                })()}
                              </td>
                            )}

                            {visibleColumns.includes("category") && (
                              <td className="px-4 py-3.5">
                                <span className={cn(
                                  "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium",
                                  getCategoryBadgeClass(vehicle.Category)
                                )}>
                                  {vehicle.Category}
                                </span>
                              </td>
                            )}

                            {visibleColumns.includes("brand") && (
                              <td className="px-4 py-3.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{vehicle.Brand}</td>
                            )}

                            {visibleColumns.includes("model") && (
                              <td className="px-4 py-3.5 text-sm text-slate-700 dark:text-slate-300">{vehicle.Model}</td>
                            )}

                            {visibleColumns.includes("year") && (
                              <td className="px-4 py-3.5 text-sm font-medium text-slate-600 dark:text-slate-300">{vehicle.Year || "-"}</td>
                            )}

                            {visibleColumns.includes("plate") && (
                              <td className="px-4 py-3.5">
                                <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                                  {vehicle.Plate || "-"}
                                </span>
                              </td>
                            )}

                            {visibleColumns.includes("priceNew") && (
                              <td className="px-4 py-3.5 text-sm font-bold text-emerald-600">
                                ${vehicle.PriceNew?.toLocaleString() || "-"}
                              </td>
                            )}

                            {visibleColumns.includes("price40") && (
                              <td className="px-4 py-3.5 text-sm font-medium text-blue-600">
                                ${vehicle.Price40?.toLocaleString() || "-"}
                              </td>
                            )}

                            {visibleColumns.includes("price70") && (
                              <td className="px-4 py-3.5 text-sm font-medium text-purple-600">
                                ${vehicle.Price70?.toLocaleString() || "-"}
                              </td>
                            )}

                            {visibleColumns.includes("taxType") && (
                              <td className="px-4 py-3.5">
                                <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                                  {vehicle.TaxType || "-"}
                                </span>
                              </td>
                            )}

                            {visibleColumns.includes("bodyType") && (
                              <td className="px-4 py-3.5 text-sm text-slate-700 dark:text-slate-300">{vehicle.BodyType || "-"}</td>
                            )}

                            {visibleColumns.includes("color") && (
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2">
                                  {vehicle.Color && (
                                    <span
                                      className="h-4 w-4 rounded-full border border-slate-200 shadow-sm dark:border-slate-600"
                                      style={{ backgroundColor: getVehicleColorHex(vehicle.Color) }}
                                      title={translateVehicleColor(vehicle.Color, language)}
                                    />
                                  )}
                                  <span className="text-sm text-slate-700 dark:text-slate-300">
                                    {translateVehicleColor(vehicle.Color, language)}
                                  </span>
                                </div>
                              </td>
                            )}

                            {visibleColumns.includes("condition") && (
                              <td className="px-4 py-3.5">
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
                                  vehicle.Condition?.toLowerCase() === "new"
                                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30"
                                    : "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30"
                                )}>
                                  <span className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    vehicle.Condition?.toLowerCase() === "new" ? "bg-emerald-500" : "bg-amber-500"
                                  )} />
                                  {vehicle.Condition}
                                </span>
                              </td>
                            )}

                            {visibleColumns.includes("actions") && (
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-1.5">
                                  <ActionButton
                                    onClick={() => handleView(vehicle.VehicleId)}
                                    icon={Eye}
                                    label="View"
                                  />
                                  {isAdmin && (
                                    <>
                                      <ActionButton
                                        onClick={() => handleEdit(vehicle.VehicleId)}
                                        icon={Pen}
                                        label="Edit"
                                        variant="edit"
                                      />
                                      <ActionButton
                                        onClick={() => handleDelete(vehicle)}
                                        icon={Trash2}
                                        label="Delete"
                                        variant="delete"
                                      />
                                    </>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}

            {filteredVehicles.length === 0 && (
              <div className="space-y-6">
                {/* Fuzzy Suggestions */}
                {fuzzySuggestions.length > 0 && (
                  <SearchSuggestions
                    suggestions={fuzzySuggestions}
                    searchTerm={filters.search}
                    onSelect={(suggestion) => {
                      // Apply the suggested vehicle's brand+model as the new search
                      const suggestedSearch = `${suggestion.vehicle.Brand} ${suggestion.vehicle.Model}`.trim();
                      setFilters(prev => ({ ...prev, search: suggestedSearch }));
                    }}
                  />
                )}

                <div className="rounded-2xl border border-slate-100 bg-white px-6 py-12 text-center shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-[0_18px_40px_rgba(2,6,23,0.5)]">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800">
                    {isInitialVehiclesLoad ? (
                      <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
                    ) : (
                      <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>
                  <h3 className="mb-1 text-lg font-semibold text-slate-700 dark:text-slate-100">
                    {isInitialVehiclesLoad ? "Loading Vehicles" : t.noVehiclesFound}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {isInitialVehiclesLoad
                      ? "Your VMS data will appear here as soon as it finishes loading."
                      : t.tryAdjustingFilters}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pagination - only show when not grouping and not searching */}
        {totalPages > 1 && groupBy === "none" && !filters.search && (
          <div className="rounded-2xl border border-slate-100 bg-white/80 p-3 shadow-[0_4px_16px_rgba(15,23,42,0.07)] dark:border-slate-700/80 dark:bg-slate-900/80 dark:shadow-[0_18px_40px_rgba(2,6,23,0.5)] sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-sm text-slate-500 dark:text-slate-400">
                Page {currentPage} of {totalPages}
                </div>

                {/* Items Per Page Dropdown */}
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Show:</span>
                  <div className="relative">
                    <select
                    title="Items per page"
                    value={itemsPerPage}
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value, 10);
                      handleItemsPerPageChange(newValue);
                    }}
                    className="h-11 cursor-pointer appearance-none rounded-lg border border-slate-200/70 bg-white px-3 pr-8 text-sm font-medium text-slate-700 shadow-[2px_2px_4px_#e2e8f0,-2px_-2px_4px_#ffffff] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700/70 dark:bg-slate-800 dark:text-slate-100 dark:shadow-[0_8px_18px_rgba(2,6,23,0.45)]"
                  >
                    {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  </div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">{t.perPage}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <NeuButton
                  variant="default"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="min-h-11 flex-1 sm:flex-none"
                >
                  Previous
                </NeuButton>

                <div className="order-first flex w-full items-center justify-center gap-1 sm:order-none sm:w-auto">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Show pages around current page
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        type="button"
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        aria-label={`Go to page ${pageNum}`}
                        aria-current={currentPage === pageNum ? "page" : undefined}
                        className={cn(
                          "h-10 w-10 rounded-lg text-sm font-medium transition-colors",
                          currentPage === pageNum
                            ? "bg-emerald-500 text-white shadow-md"
                            : "bg-white text-slate-600 shadow-sm hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <NeuButton
                  variant="default"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="min-h-11 flex-1 sm:flex-none"
                >
                  Next
                </NeuButton>
              </div>
            </div>
          </div>
        )}

        {/* Add Vehicle Modal */}
        {showAddModal && (
          <AddVehicleModalOptimistic
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            onSuccess={() => {
              refresh();
              handlePageChange(1);
              setLastSync(new Date());
            }}
          />
        )}

        {/* Confirm Delete Modal */}
        {vehicleToDelete && (
          <ConfirmDeleteModal
            isOpen={isDeleteModalOpen}
            onCancel={() => {
              setIsDeleteModalOpen(false);
              setVehicleToDelete(null);
            }}
            onConfirm={handleConfirmDelete}
            vehicle={vehicleToDelete}
            isDeleting={isDeleting}
            userRole={user?.role || "Viewer"}
          />
        )}
      </div>
    </div>
  );
}
