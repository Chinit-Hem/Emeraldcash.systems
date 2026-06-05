"use client";

import { useLanguage } from "@/shared/hooks/LanguageContext";
import { useTranslation, type Language, type Translations } from "@/shared/utils/i18n";
import { useAuthUser } from "@/shared/hooks/AuthContext";

import { ConfirmDeleteModal } from "@/systems/vms/components/vehicles/ConfirmDeleteModal";

import { useDeleteVehicle } from "@/systems/vms/components/vehicles/useDeleteVehicle";
import { useToast } from "@/shared/components/ui/glass/GlassToast";
import { isDriveHostedImageUrl } from "@/shared/utils/drive";
import { getVehicleThumbnailUrl, isCloudinaryUrl, mergeVehicleImages } from "@/systems/vms/utils/vehicle-helpers";
import { getVehicleColorHex, translateVehicleColor } from "@/systems/vms/utils/vehicleColors";
import type { Vehicle } from "@/shared/types/types";
import { cn } from "@/shared/utils/ui";
import { formatVehicleId } from "@/shared/utils/format";
import { useVehiclesNeon } from "@/systems/vms/hooks/useVehiclesNeon";
import { getFuzzySuggestions } from "@/systems/vms/utils/fuzzySearch";
import {
  INVALID_BRAND_NAMES,
  brandMatchesFilter,
  getBrandFallbackLabel,
  getBrandKey,
  getBrandLogoSources,
  getCanonicalBrandName,
  getFeaturedBrandNamesForCategory,
  getFeaturedModelNamesForBrand,
  getModelFilterValue,
  getModelKey,
  isBrandAllowedForCategory,
  normalizeModelName,
} from "@/systems/vms/utils/vehicleBrandMetadata";
import {
  getVehicleGroupKey,
  getVehicleGroupValue,
  getVehicleListItemElementId,
  getVehicleListSearchParamsWithFallback,
  getStoredVehicleListScrollPosition,
  getStoredVehicleListScrollSnapshot,
  clearStoredVehicleListState,
  normalizeVehicleGroupText,
  parseVehicleGroupByParam,
  parseVehicleListPageParam,
  parseVehicleListViewParam,
  rememberVehicleListHref,
  rememberVehicleListScrollPosition,
  rememberVehicleListScrollSnapshot,
  setVehicleListQueryValue,
  VEHICLE_LIST_ALL_HREF,
  VEHICLE_LIST_FOCUS_PARAM,
  VEHICLE_LIST_PAGE_PARAM,
  VEHICLE_LIST_URL_CHANGE_EVENT,
  VEHICLE_LIST_VIEW_PARAM,
  withVehicleListFocusHref,
  withVehicleListReturnHref,
  type VehicleGroupByOption,
  type VehicleListScrollSnapshot
} from "@/systems/vms/utils/vehicleListState";
import SearchSuggestions from "@/shared/components/SearchSuggestions";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  Car,
  CarFront,
  CarTaxiFront,
  BusFront,
  Bookmark,
  ChevronDown,
  Clock,
  Columns,
  Eye,
  Filter,
  Grid3X3,
  ImageIcon,
  List,
  MoreVertical,
  Pen,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Share2,
  Shapes,
  Trash2,
  Truck,
  Van,
  X,
  type LucideIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { memo, useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
type GroupByOption = VehicleGroupByOption;

interface FilterState {
  search: string;
  category: string;
  condition: string;
  brand: string;
  model: string;
  year: string;
  plate: string;
  bodyType: string;
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

const DEFAULT_ITEMS_PER_PAGE = 50;
const MOBILE_VEHICLE_FETCH_LIMIT = 2000;
const DESKTOP_VEHICLE_FETCH_LIMIT = 2000;
const FILTER_LABEL_CLASS = "mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400";
const FILTER_FIELD_CLASS =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition-all placeholder-slate-400 focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder-slate-500";
const BRAND_FILTER_VISIBLE_COUNT = 20;
const MODEL_FILTER_VISIBLE_COUNT = 24;
type BrandOption = {
  name: string;
  count: number;
};

type ModelOption = {
  label: string;
  value: string;
  count: number;
};

type BodyTypeOption = {
  label: string;
  value: string;
  aliases: string[];
  icon: LucideIcon;
  tone: string;
  count: number;
};

const BODY_TYPE_OPTIONS: Omit<BodyTypeOption, "count">[] = [
  {
    label: "Sedan",
    value: "Sedan",
    aliases: ["sedan", "saloon"],
    icon: Car,
    tone: "text-sky-600",
  },
  {
    label: "Hatchback",
    value: "Hatchback",
    aliases: ["hatchback", "hatch"],
    icon: CarFront,
    tone: "text-blue-600",
  },
  {
    label: "Pickup",
    value: "Pickup",
    aliases: ["pickup", "pick up", "pick-up", "truck"],
    icon: Truck,
    tone: "text-cyan-700",
  },
  {
    label: "SUV",
    value: "SUV",
    aliases: ["suv", "crossover"],
    icon: Car,
    tone: "text-indigo-600",
  },
  {
    label: "Convertible",
    value: "Convertible",
    aliases: ["convertible", "cabriolet", "roadster"],
    icon: CarTaxiFront,
    tone: "text-blue-500",
  },
  {
    label: "MPV (Minivan)",
    value: "MPV",
    aliases: ["mpv", "minivan", "mini van", "van"],
    icon: Van,
    tone: "text-sky-700",
  },
  {
    label: "Sports",
    value: "Sports",
    aliases: ["sports", "sport", "coupe"],
    icon: CarFront,
    tone: "text-blue-700",
  },
  {
    label: "Station Wagon",
    value: "Station Wagon",
    aliases: ["station wagon", "wagon", "estate"],
    icon: BusFront,
    tone: "text-slate-600",
  },
  {
    label: "Other",
    value: "Other",
    aliases: ["other", "others"],
    icon: Shapes,
    tone: "text-sky-600",
  },
];

function normalizeBodyTypeName(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function getBodyTypeKey(value: string): string {
  return normalizeBodyTypeName(value).toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, "");
}

function getCanonicalBodyTypeName(value: string): string {
  const bodyTypeKey = getBodyTypeKey(value);
  if (!bodyTypeKey) return "";

  const matchedOption = BODY_TYPE_OPTIONS.find((option) =>
    option.aliases.some((alias) => bodyTypeKey.includes(getBodyTypeKey(alias)))
  );

  return matchedOption?.label ?? normalizeBodyTypeName(value);
}

function bodyTypeMatchesFilter(bodyType: unknown, filterValue: string): boolean {
  const rawBodyType = normalizeBodyTypeName(bodyType);
  const rawBodyTypeKey = getBodyTypeKey(rawBodyType);
  const filterKey = getBodyTypeKey(filterValue);
  if (!rawBodyTypeKey || !filterKey) return false;

  const matchedOption = BODY_TYPE_OPTIONS.find((option) =>
    getBodyTypeKey(option.value) === filterKey || getBodyTypeKey(option.label) === filterKey
  );

  if (!matchedOption) {
    return rawBodyTypeKey.includes(filterKey);
  }

  return matchedOption.aliases.some((alias) => rawBodyTypeKey.includes(getBodyTypeKey(alias)));
}

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

function detectMobileVehicleViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
}

function getVehicleListScrollContainer(): HTMLElement | null {
  if (typeof document === "undefined") return null;

  return document.querySelector<HTMLElement>('[data-app-scroll-container="true"]');
}

function getVehicleListScrollSnapshot(): VehicleListScrollSnapshot {
  const scrollContainer = getVehicleListScrollContainer();

  return {
    scrollX: scrollContainer?.scrollLeft ?? window.scrollX,
    scrollY: scrollContainer?.scrollTop ?? window.scrollY,
  };
}

function restoreVehicleListScrollSnapshot(snapshot: VehicleListScrollSnapshot): void {
  const scrollOptions: ScrollToOptions = {
    left: snapshot.scrollX,
    top: snapshot.scrollY,
    behavior: "auto",
  };
  const scrollContainer = getVehicleListScrollContainer();

  if (scrollContainer) {
    scrollContainer.scrollTo(scrollOptions);
  } else {
    window.scrollTo(scrollOptions);
  }
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
      {Icon && <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 sm:left-4 sm:h-5 sm:w-5" />}
      <input
        type={type}
        title={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-xl border border-slate-200/70 bg-white transition-all duration-200 dark:border-slate-700/70 dark:bg-slate-900 sm:rounded-2xl",
          "shadow-[4px_4px_8px_#e2e8f0,-4px_-4px_8px_#ffffff]",
          "dark:shadow-[0_10px_24px_rgba(2,6,23,0.45)]",
          "focus:shadow-[6px_6px_12px_#e2e8f0,-6px_-6px_12px_#ffffff]",
          "dark:focus:shadow-[0_14px_30px_rgba(2,6,23,0.58)]",
          "focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40",
          "text-xs text-slate-700 placeholder-slate-400 outline-none dark:text-slate-100 dark:placeholder-slate-500 sm:text-sm",
          Icon ? "py-2 pl-9 pr-3 sm:py-3 sm:pl-12 sm:pr-4" : "px-3 py-2 sm:px-4 sm:py-3"
        )}
      />
    </div>
  );
}

// ============================================================================
// Brand Filter Component
// ============================================================================

function BrandLogoMark({ brand }: { brand: string }) {
  const logoSources = useMemo(() => getBrandLogoSources(brand), [brand]);
  const fallbackLabel = useMemo(() => getBrandFallbackLabel(brand), [brand]);
  const isOtherBrand = getBrandKey(brand).startsWith("other");
  const [logoSourceIndex, setLogoSourceIndex] = useState(0);

  useEffect(() => {
    setLogoSourceIndex(0);
  }, [brand, logoSources.length]);

  const logoSource = logoSources[logoSourceIndex];

  return (
    <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[#f6fbff] p-1 shadow-[0_5px_10px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/80 dark:bg-[#f6fbff] dark:shadow-[0_8px_18px_rgba(0,0,0,0.35)] dark:ring-transparent sm:h-[72px] sm:w-[72px] sm:p-2">
      {logoSource ? (
        <img
          key={logoSource}
          src={logoSource}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onError={() => setLogoSourceIndex((index) => index + 1)}
          className="h-auto max-h-5 w-auto max-w-6 object-contain saturate-100 sm:max-h-12 sm:max-w-14"
        />
      ) : isOtherBrand ? (
        <Shapes className="h-4 w-4 text-sky-600 sm:h-9 sm:w-9" aria-hidden="true" />
      ) : (
        <span
          aria-hidden="true"
          className="max-w-full px-0.5 text-center text-[7px] font-black leading-none tracking-normal text-slate-700 sm:text-sm"
        >
          {fallbackLabel}
        </span>
      )}
    </span>
  );
}

function BrandFilterSection({
  title,
  brands,
  selectedBrand,
  isExpanded,
  onToggleExpanded,
  onBrandSelect,
}: {
  title: string;
  brands: BrandOption[];
  selectedBrand: string;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onBrandSelect: (brand: string) => void;
}) {
  const selectedBrandKey = getBrandKey(selectedBrand);
  const hasHiddenBrands = brands.length > BRAND_FILTER_VISIBLE_COUNT;
  const visibleBrands = isExpanded ? brands : brands.slice(0, BRAND_FILTER_VISIBLE_COUNT);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 p-4 text-slate-900 shadow-[0_14px_34px_rgba(15,23,42,0.08)] ring-1 ring-white/70 dark:border-slate-800/80 dark:bg-[#111827] dark:text-white dark:shadow-[0_18px_45px_rgba(0,0,0,0.22)] dark:ring-black/20 sm:p-7">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-xl">{title}</h2>

      <div className="mt-4 grid [grid-template-columns:repeat(auto-fit,minmax(46px,1fr))] gap-x-1.5 gap-y-3 sm:mt-7 sm:grid-cols-5 sm:gap-x-3 sm:gap-y-8 md:grid-cols-6 lg:grid-cols-10">
        {visibleBrands.map((brand) => {
          const isActive = selectedBrandKey === getBrandKey(brand.name);

          return (
            <button
              key={brand.name}
              type="button"
              aria-pressed={isActive}
              onClick={() => onBrandSelect(brand.name)}
              className={cn(
                "group flex min-h-[58px] min-w-0 flex-col items-center justify-start gap-1 rounded-xl px-0 py-1 text-center transition sm:min-h-[122px] sm:gap-3 sm:px-2 sm:py-2",
                "hover:bg-slate-100/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:hover:bg-white/5 dark:focus-visible:ring-emerald-400/80",
                isActive && "bg-emerald-50 ring-2 ring-emerald-500/70 dark:bg-white/10 dark:ring-emerald-400/90"
              )}
            >
              <BrandLogoMark brand={brand.name} />
              <span className="line-clamp-2 min-h-[18px] w-full max-w-[54px] break-words text-[7px] font-medium leading-tight text-slate-700 transition group-hover:text-slate-950 dark:text-slate-100 dark:group-hover:text-white sm:min-h-9 sm:max-w-none sm:text-base">
                {brand.name}
              </span>
            </button>
          );
        })}
      </div>

      {hasHiddenBrands && (
        <button
          type="button"
          onClick={onToggleExpanded}
          className="mt-5 flex min-h-10 w-full items-center justify-center rounded-xl bg-slate-100 px-4 text-xs font-medium text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100 dark:focus-visible:ring-emerald-400/80 sm:mt-7 sm:min-h-14 sm:text-sm"
        >
          {isExpanded ? "Show Less" : "Show More"}
        </button>
      )}
    </section>
  );
}

function ModelFilterSection({
  title,
  backLabel,
  models,
  selectedModel,
  isExpanded,
  onBackToBrands,
  onToggleExpanded,
  onModelSelect,
}: {
  title: string;
  backLabel: string;
  models: ModelOption[];
  selectedModel: string;
  isExpanded: boolean;
  onBackToBrands: () => void;
  onToggleExpanded: () => void;
  onModelSelect: (model: string) => void;
}) {
  const selectedModelKey = getModelKey(selectedModel);
  const hasHiddenModels = models.length > MODEL_FILTER_VISIBLE_COUNT;
  const visibleModels = isExpanded ? models : models.slice(0, MODEL_FILTER_VISIBLE_COUNT);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 p-4 text-slate-900 shadow-[0_14px_34px_rgba(15,23,42,0.08)] ring-1 ring-white/70 dark:border-slate-800/80 dark:bg-[#111827] dark:text-white dark:shadow-[0_18px_45px_rgba(0,0,0,0.22)] dark:ring-black/20 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-xl">{title}</h2>
        <button
          type="button"
          onClick={onBackToBrands}
          className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-white dark:focus-visible:ring-emerald-400/80 sm:min-h-10 sm:text-sm"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {backLabel}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-3 lg:grid-cols-6">
        {visibleModels.map((model) => {
          const isActive = selectedModelKey === getModelKey(model.value);

          return (
            <button
              key={model.label}
              type="button"
              aria-pressed={isActive}
              onClick={() => onModelSelect(model.value)}
              className={cn(
                "flex min-h-12 items-center justify-center rounded-xl px-3 py-2 text-center text-xs font-medium leading-tight transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70 sm:min-h-14 sm:text-base",
                "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-950 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:text-white",
                isActive && "text-sky-600 ring-2 ring-sky-500/70 dark:text-sky-400 dark:ring-sky-400/80"
              )}
            >
              {model.label}
            </button>
          );
        })}
      </div>

      {hasHiddenModels && (
        <button
          type="button"
          onClick={onToggleExpanded}
          className="mt-4 flex min-h-10 w-full items-center justify-center rounded-xl bg-slate-100 px-4 text-xs font-medium text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100 dark:focus-visible:ring-emerald-400/80 sm:min-h-14 sm:text-sm"
        >
          {isExpanded ? "Show Less" : "Show More"}
        </button>
      )}
    </section>
  );
}

function BodyTypeVehicleSvg({ type }: { type: string }) {
  const key = getBodyTypeKey(type);
  const isPickup = key === "pickup";
  const isConvertible = key === "convertible";
  const isSports = key === "sports";
  const isMpv = key === "mpv";
  const isWagon = key === "stationwagon";
  const isSuv = key === "suv";
  const isHatchback = key === "hatchback";

  const bodyPath = isPickup
    ? "M10 38 C14 33 20 30 30 30 H50 L57 37 H82 C86 37 90 41 91 46 L87 50 H15 L9 46 Z"
    : isSports
      ? "M8 40 C17 33 30 30 45 30 H68 C78 30 88 36 92 45 L88 49 H14 L8 45 Z"
      : isConvertible
        ? "M10 40 C18 34 27 31 42 31 H67 C79 31 87 37 91 46 L87 50 H15 L9 46 Z"
        : isMpv
          ? "M9 40 C11 31 20 25 33 24 H67 C80 25 88 34 91 46 L87 50 H14 L9 46 Z"
          : isWagon
            ? "M9 40 C13 31 22 27 35 27 H69 C80 28 88 36 91 46 L87 50 H14 L9 46 Z"
            : isSuv
              ? "M9 40 C12 31 22 26 35 26 H67 C80 27 88 36 91 46 L87 50 H14 L9 46 Z"
              : isHatchback
                ? "M10 40 C15 32 24 28 38 28 H66 C78 29 87 37 91 46 L87 50 H15 L9 46 Z"
                : "M9 40 C16 32 27 28 42 28 H68 C79 29 88 37 91 46 L87 50 H14 L9 46 Z";

  const roofPath = isPickup
    ? "M30 30 L38 20 H52 L61 37 H49 L44 28 H32 Z"
    : isSports
      ? "M31 30 L43 22 H60 L72 31 H58 L53 27 H43 L38 31 Z"
      : isConvertible
        ? "M35 31 H63"
        : isMpv
          ? "M31 25 L39 16 H65 L77 34 H36 Z"
          : isWagon
            ? "M31 27 L40 18 H66 L77 35 H36 Z"
            : isSuv
              ? "M32 26 L41 17 H65 L77 35 H37 Z"
              : isHatchback
                ? "M32 28 L42 18 H62 L76 36 H38 Z"
                : "M31 28 L41 18 H60 L74 36 H36 Z";

  return (
    <svg viewBox="0 0 96 64" role="img" aria-hidden="true" className="h-6 w-8 sm:h-12 sm:w-14">
      <ellipse cx="48" cy="51" rx="38" ry="4" fill="#cbd5e1" opacity="0.45" />
      <path d={bodyPath} fill="#0ea5e9" stroke="#0369a1" strokeWidth="2" strokeLinejoin="round" />
      <path
        d={roofPath}
        fill={isConvertible ? "none" : "#e0f2fe"}
        stroke="#0369a1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {!isConvertible && <path d="M43 20 V35 M62 21 V36" stroke="#7dd3fc" strokeWidth="2" opacity="0.8" />}
      {isPickup && <path d="M58 38 H82" stroke="#e0f2fe" strokeWidth="2" strokeLinecap="round" />}
      <circle cx="27" cy="49" r="7" fill="#0f172a" />
      <circle cx="76" cy="49" r="7" fill="#0f172a" />
      <circle cx="27" cy="49" r="3" fill="#e2e8f0" />
      <circle cx="76" cy="49" r="3" fill="#e2e8f0" />
      <path d="M15 41 H8 M91 42 H84" stroke="#fef3c7" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BodyTypeMark({ option }: { option: BodyTypeOption }) {
  const isOtherBodyType = getBodyTypeKey(option.value) === "other";

  return (
    <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#f6fbff] shadow-[0_5px_10px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/80 dark:bg-[#f6fbff] dark:shadow-[0_8px_18px_rgba(0,0,0,0.35)] dark:ring-transparent sm:h-[72px] sm:w-[72px]">
      {isOtherBodyType ? (
        <Shapes className="h-5 w-5 text-sky-600 sm:h-9 sm:w-9" aria-hidden="true" />
      ) : (
        <BodyTypeVehicleSvg type={option.value} />
      )}
    </span>
  );
}

function BodyTypeFilterSection({
  title,
  bodyTypes,
  selectedBodyType,
  onBodyTypeSelect,
}: {
  title: string;
  bodyTypes: BodyTypeOption[];
  selectedBodyType: string;
  onBodyTypeSelect: (bodyType: string) => void;
}) {
  const selectedBodyTypeKey = getBodyTypeKey(selectedBodyType);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 p-4 text-slate-900 shadow-[0_14px_34px_rgba(15,23,42,0.08)] ring-1 ring-white/70 dark:border-slate-800/80 dark:bg-[#111827] dark:text-white dark:shadow-[0_18px_45px_rgba(0,0,0,0.22)] dark:ring-black/20 sm:p-7">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-xl">{title}</h2>

      <div className="mt-4 grid [grid-template-columns:repeat(auto-fit,minmax(48px,1fr))] gap-x-1.5 gap-y-3 sm:mt-7 sm:grid-cols-5 sm:gap-x-3 sm:gap-y-8 md:grid-cols-6 lg:grid-cols-9">
        {bodyTypes.map((bodyType) => {
          const isActive =
            selectedBodyTypeKey === getBodyTypeKey(bodyType.value) ||
            selectedBodyTypeKey === getBodyTypeKey(bodyType.label);

          return (
            <button
              key={bodyType.label}
              type="button"
              aria-pressed={isActive}
              onClick={() => onBodyTypeSelect(bodyType.value)}
              className={cn(
                "group flex min-h-[58px] min-w-0 flex-col items-center justify-start gap-1 rounded-xl px-0 py-1 text-center transition sm:min-h-[122px] sm:gap-3 sm:px-2 sm:py-2",
                "hover:bg-slate-100/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:hover:bg-white/5 dark:focus-visible:ring-emerald-400/80",
                isActive && "bg-emerald-50 ring-2 ring-emerald-500/70 dark:bg-white/10 dark:ring-emerald-400/90"
              )}
            >
              <BodyTypeMark option={bodyType} />
              <span className="line-clamp-2 min-h-[18px] w-full max-w-[56px] break-words text-[7px] font-medium leading-tight text-slate-700 transition group-hover:text-slate-950 dark:text-slate-100 dark:group-hover:text-white sm:min-h-9 sm:max-w-none sm:text-base">
                {bodyType.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
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
    <div className="flex items-center gap-1 rounded-xl bg-slate-100/80 p-0.5 shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] dark:bg-slate-800/80 dark:shadow-[inset_2px_2px_6px_rgba(2,6,23,0.65),inset_-2px_-2px_6px_rgba(51,65,85,0.22)] sm:rounded-2xl sm:p-1">
      <button
        type="button"
        onClick={() => onChange("grid")}
        aria-label={t.grid}
        title={t.grid}
        className={cn(
          "flex min-h-8 items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-all duration-200 sm:min-h-0 sm:rounded-xl sm:px-3 sm:py-2",
          view === "grid"
            ? "bg-white text-emerald-600 shadow-[2px_2px_4px_#cbd5e1,-2px_-2px_4px_#ffffff] dark:bg-slate-900 dark:text-emerald-300 dark:shadow-[0_6px_14px_rgba(2,6,23,0.4)]"
            : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
        )}
      >
        <Grid3X3 className="h-4 w-4" />
        <span className="hidden sm:inline">{t.grid}</span>
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-label={t.list}
        title={t.list}
        className={cn(
          "flex min-h-8 items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-all duration-200 sm:min-h-0 sm:rounded-xl sm:px-3 sm:py-2",
          view === "list"
            ? "bg-white text-emerald-600 shadow-[2px_2px_4px_#cbd5e1,-2px_-2px_4px_#ffffff] dark:bg-slate-900 dark:text-emerald-300 dark:shadow-[0_6px_14px_rgba(2,6,23,0.4)]"
            : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
        )}
      >
        <List className="h-4 w-4" />
        <span className="hidden sm:inline">{t.list}</span>
      </button>
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

type VehicleActionMenuPosition = {
  top: number;
  left: number;
  width: number;
};

function getVehicleActionMenuPosition(trigger: HTMLElement): VehicleActionMenuPosition {
  const rect = trigger.getBoundingClientRect();
  const isSmallScreen = window.matchMedia("(max-width: 639px)").matches;
  const width = isSmallScreen ? 96 : 160;
  const estimatedHeight = isSmallScreen ? 88 : 156;
  const margin = 8;
  const left = Math.min(Math.max(rect.right - width, margin), window.innerWidth - width - margin);
  const topBelow = rect.bottom + 6;
  const hasRoomBelow = topBelow + estimatedHeight <= window.innerHeight - margin;
  const top = hasRoomBelow ? topBelow : Math.max(margin, rect.top - estimatedHeight - 6);

  return { top, left, width };
}

function VehicleImageActions({ vehicle, photoCount }: { vehicle: Vehicle; photoCount: number }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [menuPosition, setMenuPosition] = useState<VehicleActionMenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMenuOpen) return;

    const closeMenu = () => setIsMenuOpen(false);
    const closeMenuOnOutsidePress = (event: PointerEvent) => {
      const target = event.target instanceof Node ? event.target : null;
      if (!target) return;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setIsMenuOpen(false);
    };
    const closeMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };

    document.addEventListener("pointerdown", closeMenuOnOutsidePress);
    document.addEventListener("keydown", closeMenuOnEscape);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);

    return () => {
      document.removeEventListener("pointerdown", closeMenuOnOutsidePress);
      document.removeEventListener("keydown", closeMenuOnEscape);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [isMenuOpen]);

  const handleMenuToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (isMenuOpen) {
      setIsMenuOpen(false);
      return;
    }

    setMenuPosition(getVehicleActionMenuPosition(event.currentTarget));
    setIsMenuOpen(true);
  };

  const handleSave = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsSaved(prev => !prev);
    setIsMenuOpen(false);
  };

  const handleShare = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const vehiclePath = `/vehicles/${encodeURIComponent(vehicle.VehicleId)}/view`;
    const shareUrl = typeof window === "undefined" ? vehiclePath : `${window.location.origin}${vehiclePath}`;
    const browserNavigator =
      typeof navigator === "undefined"
        ? null
        : (navigator as Navigator & {
            share?: (data: ShareData) => Promise<void>;
            clipboard?: Clipboard;
          });

    try {
      if (browserNavigator?.share) {
        await browserNavigator.share({
          title: `${vehicle.Brand || ""} ${vehicle.Model || ""}`.trim() || "Vehicle",
          url: shareUrl,
        });
      } else if (browserNavigator?.clipboard) {
        await browserNavigator.clipboard.writeText(shareUrl);
      }
    } catch {
      // Share can be cancelled by the user.
    } finally {
      setIsMenuOpen(false);
    }
  };

  const handleReport = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsMenuOpen(false);
  };

  const menu =
    isMenuOpen && menuPosition && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-[1000] overflow-hidden rounded-sm bg-[#2f2f2f] py-1 text-white shadow-2xl ring-1 ring-white/10"
            style={{ top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleSave}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[11px] transition hover:bg-white/10 sm:gap-3 sm:px-4 sm:py-3 sm:text-base"
            >
              <Bookmark className={cn("h-3 w-3 sm:h-5 sm:w-5", isSaved && "fill-white")} />
              <span>Save</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[11px] transition hover:bg-white/10 sm:gap-3 sm:px-4 sm:py-3 sm:text-base"
            >
              <Share2 className="h-3 w-3 sm:h-5 sm:w-5" />
              <span>Share</span>
            </button>
            <button
              type="button"
              onClick={handleReport}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[11px] transition hover:bg-white/10 sm:gap-3 sm:px-4 sm:py-3 sm:text-base"
            >
              <AlertCircle className="h-3 w-3 sm:h-5 sm:w-5" />
              <span>Report</span>
            </button>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleMenuToggle}
        aria-label="Vehicle actions"
        aria-expanded={isMenuOpen}
        className="absolute right-0.5 top-0.5 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-slate-950/82 text-white shadow-sm backdrop-blur-sm transition hover:bg-slate-950 active:scale-95 sm:right-2 sm:top-2 sm:h-9 sm:w-9"
      >
        <MoreVertical className="h-3 w-3 sm:h-5 sm:w-5" />
      </button>

      {menu}

      {photoCount > 0 && (
        <div className="absolute bottom-1 right-1 z-20 flex items-center gap-0.5 rounded bg-slate-950/75 px-1 py-0.5 text-[9px] font-semibold leading-none text-white shadow-md backdrop-blur-sm sm:bottom-2 sm:right-2 sm:gap-1.5 sm:px-2 sm:py-1 sm:text-xs">
          <ImageIcon className="h-2.5 w-2.5 sm:h-4 sm:w-4" />
          <span>{photoCount}</span>
        </div>
      )}
    </>
  );
}

function VehicleGroupHeader({
  label,
  count,
  avgPrice,
}: {
  label: string;
  count: number;
  avgPrice: number;
}) {
  return (
    <div className="grid gap-2 rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/90 px-3 py-3 shadow-sm dark:border-slate-700/70 dark:from-slate-900 dark:to-slate-800/80 sm:flex sm:items-center sm:justify-between sm:px-4">
      <h3 className="min-w-0 break-words text-base font-bold leading-snug text-slate-800 dark:text-slate-100 sm:text-lg">
        {label}
      </h3>
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs sm:justify-end sm:text-sm">
        <span className="inline-flex max-w-full items-center rounded-full bg-emerald-100 px-3 py-1 font-semibold leading-tight text-emerald-700 shadow-sm dark:bg-emerald-500/15 dark:text-emerald-300">
          <span className="font-bold">{count.toLocaleString()}</span>
          <span className="ml-1">vehicles</span>
        </span>
        <span className="inline-flex max-w-full items-center rounded-full bg-slate-100 px-3 py-1 leading-tight text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <span>Avg:</span>
          <span className="ml-1 font-bold text-emerald-600 dark:text-emerald-300">
            ${Math.round(avgPrice).toLocaleString()}
          </span>
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Vehicle Card Component (Grid View)
// ============================================================================

const VehicleCard = memo(function VehicleCard({
  vehicle,
  onView,
  getImageUrl,
  t,
  language
}: {
  vehicle: Vehicle;
  onView: (id: string) => void;
  getImageUrl: (imageValue: unknown) => string | null;
  t: Translations;
  language: Language;
}) {
  const imageUrl = getImageUrl(vehicle.Image);
  const photoCount = Math.max(mergeVehicleImages(vehicle.Images, vehicle.Image).length, imageUrl ? 1 : 0);
  const colorLabel = translateVehicleColor(vehicle.Color, language);

return (
    <div
      id={getVehicleListItemElementId(vehicle.VehicleId)}
      data-vehicle-list-item-id={vehicle.VehicleId}
      role="button"
      tabIndex={0}
      aria-label={`View ${vehicle.Brand || "vehicle"} ${vehicle.Model || ""}`.trim()}
      onClick={() => onView(vehicle.VehicleId)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onView(vehicle.VehicleId);
      }}
      className="group scroll-mt-24 cursor-pointer overflow-hidden rounded-md border border-slate-100 bg-white shadow-[0_3px_12px_rgba(0,0,0,0.08)] transition-all duration-150 hover:border-emerald-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] focus:outline-none focus:ring-2 focus:ring-emerald-400/40 active:scale-[0.98] dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-[0_16px_32px_rgba(2,6,23,0.45)] dark:hover:border-emerald-500/35 dark:hover:shadow-[0_20px_42px_rgba(2,6,23,0.62)] sm:rounded-xl sm:shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
        {imageUrl ? (
            <Image
              src={imageUrl}
              alt={`${vehicle.Brand} ${vehicle.Model}`}
              fill
              sizes="(max-width: 640px) 25vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, (max-width: 1536px) 20vw, 16vw"
              unoptimized={shouldBypassNextImageOptimization(imageUrl)}
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-slate-800">
              <Car className="h-6 w-6 text-slate-300 dark:text-slate-600 sm:h-10 sm:w-10" aria-hidden="true" />
            </div>
          )}
        <VehicleImageActions vehicle={vehicle} photoCount={photoCount} />
      </div>

      {/* Content */}
      <div className="p-1 sm:p-2.5">
        <div className="mb-0.5 flex min-w-0 flex-col gap-0.5 sm:mb-1 sm:gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="truncate text-[9px] font-bold leading-tight text-slate-800 dark:text-slate-100 sm:text-base">{vehicle.Brand}</h3>
            <p className="truncate text-[8px] leading-tight text-slate-500 dark:text-slate-400 sm:text-xs">{vehicle.Model}</p>
          </div>
          <div className="min-w-0 sm:text-right">
            <p className="truncate text-[9px] font-bold leading-tight text-emerald-600 sm:text-base">
              ${vehicle.PriceNew?.toLocaleString() || "-"}
            </p>
            <p className="hidden text-xs text-slate-400 dark:text-slate-500 sm:block">{t.marketPrice}</p>
          </div>
        </div>

        <div className="mb-1.5 hidden grid-cols-2 gap-1 text-[11px] sm:grid">
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

      </div>
    </div>
  );
});

const MobileVehicleListCard = memo(function MobileVehicleListCard({
  vehicle,
  onView,
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
  const photoCount = Math.max(mergeVehicleImages(vehicle.Images, vehicle.Image).length, imageUrl ? 1 : 0);

  const getMobileCategoryClass = (category: string) => {
    const cat = category?.toLowerCase() || "";
    if (cat.includes("car")) return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/30";
    if (cat.includes("motor") || cat.includes("bike")) return "bg-purple-50 text-purple-700 ring-purple-100 dark:bg-purple-500/15 dark:text-purple-300 dark:ring-purple-500/30";
    if (cat.includes("tuk") || cat.includes("rickshaw")) return "bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-500/30";
    return "bg-slate-50 text-slate-700 ring-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
  };

  return (
    <article
      id={getVehicleListItemElementId(vehicle.VehicleId)}
      data-vehicle-list-item-id={vehicle.VehicleId}
      role="button"
      tabIndex={0}
      aria-label={`View ${vehicle.Brand || "vehicle"} ${vehicle.Model || ""}`.trim()}
      onClick={() => onView(vehicle.VehicleId)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onView(vehicle.VehicleId);
      }}
      className="grid min-h-[74px] scroll-mt-24 cursor-pointer grid-cols-[92px_minmax(0,1fr)] overflow-hidden rounded-md border border-slate-100 bg-white shadow-[0_3px_12px_rgba(15,23,42,0.07)] transition-transform focus:outline-none focus:ring-2 focus:ring-emerald-400/40 active:scale-[0.99] dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-[0_14px_30px_rgba(2,6,23,0.45)] sm:min-h-[132px] sm:grid-cols-[164px_minmax(0,1fr)] sm:rounded-lg sm:shadow-[0_4px_16px_rgba(15,23,42,0.07)] lg:min-h-[154px] lg:grid-cols-[196px_minmax(0,1fr)]"
    >
      <div className="relative min-h-[74px] overflow-hidden bg-slate-100 dark:bg-slate-800 sm:min-h-[132px] lg:min-h-[154px]">
        <Car className="absolute inset-0 m-auto h-5 w-5 text-slate-300 dark:text-slate-600 sm:h-12 sm:w-12" aria-hidden="true" />
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={vehicle.Model || "Vehicle"}
            fill
            sizes="(max-width: 640px) 92px, (max-width: 1024px) 164px, 196px"
            unoptimized={shouldBypassNextImageOptimization(imageUrl)}
            className="object-cover"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
        <VehicleImageActions vehicle={vehicle} photoCount={photoCount} />
      </div>

      <div className="flex min-w-0 flex-col px-2 py-1.5 sm:px-4 sm:py-3 lg:px-5 lg:py-4">
        <div className="flex min-w-0 items-start justify-between gap-1 sm:gap-2">
          <div className="min-w-0 pr-1">
            <h3 className="line-clamp-1 text-[11px] font-bold leading-tight text-slate-900 dark:text-slate-100 sm:line-clamp-2 sm:text-base sm:leading-snug lg:text-lg">
              {vehicle.Brand || "-"} {vehicle.Model || "-"}
            </h3>
            <p className="mt-0.5 truncate text-[9px] leading-tight text-slate-500 dark:text-slate-400 sm:mt-1 sm:text-xs">
              {vehicle.Year || "-"} {vehicle.Plate ? `- ${vehicle.Plate}` : ""}
            </p>
            <p className="mt-0.5 truncate text-[9px] leading-tight text-slate-500 dark:text-slate-400 sm:mt-1 sm:text-xs">
              {vehicle.Condition || "-"} - {vehicle.Plate ? `Plate ${vehicle.Plate}` : "Plate Number"}
            </p>
          </div>
          <span className={cn(
            "hidden flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 sm:inline-flex sm:px-3 sm:py-1 sm:text-xs",
            getMobileCategoryClass(vehicle.Category)
          )}>
            {vehicle.Category || "-"}
          </span>
        </div>

        <div className="mt-auto pt-1 sm:pt-3">
          <div className="truncate text-[11px] font-bold text-emerald-600 sm:text-base lg:text-lg">
            {vehicle.PriceNew == null ? "-" : `$${vehicle.PriceNew.toLocaleString()}`}
          </div>
        </div>
      </div>
    </article>
  );
});

// ============================================================================
// Main Component
// ============================================================================

export default function VehiclesClientEnhanced() {
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const router = useRouter();
  const searchParams = useSearchParams();
  const frameworkVehicleListSearch = searchParams.toString();
  const [nativeVehicleListSearch, setNativeVehicleListSearch] = useState<string | null>(null);
  const activeVehicleListSearchParams = useMemo(
    () => nativeVehicleListSearch === null ? searchParams : new URLSearchParams(nativeVehicleListSearch),
    [nativeVehicleListSearch, searchParams]
  );
  const effectiveVehicleListSearchParams = useMemo(
    () => getVehicleListSearchParamsWithFallback(activeVehicleListSearchParams),
    [activeVehicleListSearchParams]
  );
  const user = useAuthUser();
  const { success, error: showError } = useToast();
  const isAdmin = user?.role === "Admin";
  const [isMobileSafeMode, setIsMobileSafeMode] = useState(detectMobileSafariLike);
  const activeListHrefRef = useRef<string | null>(null);
  const pendingListScrollRestoreRef = useRef<VehicleListScrollSnapshot | null>(null);
  const userSelectedViewModeRef = useRef(Boolean(activeVehicleListSearchParams.get(VEHICLE_LIST_VIEW_PARAM)));
  const skipNextFilterPageResetRef = useRef(
    Boolean(
      activeVehicleListSearchParams.get(VEHICLE_LIST_PAGE_PARAM) ||
      activeVehicleListSearchParams.get(VEHICLE_LIST_FOCUS_PARAM)
    )
  );

  // ==========================================================================
  // State Management
  // ==========================================================================

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const explicitViewMode = activeVehicleListSearchParams.get(VEHICLE_LIST_VIEW_PARAM);
    if (detectMobileVehicleViewport() && !explicitViewMode) return "grid";
    return parseVehicleListViewParam(effectiveVehicleListSearchParams.get(VEHICLE_LIST_VIEW_PARAM));
  });
  const [currentPage, setCurrentPage] = useState(() => {
    const explicitPage = activeVehicleListSearchParams.get(VEHICLE_LIST_PAGE_PARAM);
    if (detectMobileVehicleViewport() && !explicitPage) return 1;
    return parseVehicleListPageParam(effectiveVehicleListSearchParams.get(VEHICLE_LIST_PAGE_PARAM));
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [showAllModels, setShowAllModels] = useState(true);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    category: "all",
    condition: "all",
    brand: "",
    model: "",
    year: "",
    plate: "",
    bodyType: "",
    minPrice: "",
    maxPrice: "",
    taxType: "",
    hasImage: isTruthyQueryParam(
      effectiveVehicleListSearchParams.get("withoutImage") ??
      effectiveVehicleListSearchParams.get("noImage")
    ) ? "no" : "",
  });

  // Quick filter - read from URL query param
  const [quickFilter, setQuickFilter] = useState<string | null>(() => {
    const categoryParam = effectiveVehicleListSearchParams.get("category");
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
  const [groupBy, setGroupBy] = useState<GroupByOption>(() =>
    parseVehicleGroupByParam(effectiveVehicleListSearchParams.get("groupBy"))
  );

  const itemsPerPage = DEFAULT_ITEMS_PER_PAGE;

  // Refs for click outside
  const columnMenuRef = useRef<HTMLDivElement>(null);
  const columnsButtonRef = useRef<HTMLButtonElement>(null);
  const infiniteScrollSentinelRef = useRef<HTMLDivElement>(null);

  // Add Vehicle Modal state
  const [showAddModal, setShowAddModal] = useState(false);

  // Delete Vehicle Modal state
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const preserveVehicleListScrollForUpdate = useCallback(() => {
    if (typeof window === "undefined") return null;
    const scrollSnapshot = getVehicleListScrollSnapshot();
    const currentHref = `${window.location.pathname}${window.location.search}`;
    pendingListScrollRestoreRef.current = scrollSnapshot;
    rememberVehicleListScrollSnapshot(currentHref, scrollSnapshot);
    skipNextFilterPageResetRef.current = true;
    return scrollSnapshot;
  }, []);

  const resetVisibleVehicleBatch = useCallback(() => {
    setCurrentPage(prev => (pendingListScrollRestoreRef.current ? prev : 1));
  }, []);

  useEffect(() => {
    setNativeVehicleListSearch(null);
  }, [frameworkVehicleListSearch]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncVehicleListUrl = (href: string, scrollSnapshot?: VehicleListScrollSnapshot | null) => {
      const nextUrl = new URL(href, window.location.origin);
      if (nextUrl.pathname !== "/vehicles") return;

      const nextHref = `${nextUrl.pathname}${nextUrl.search}`;
      const storedScrollSnapshot = scrollSnapshot ?? getStoredVehicleListScrollSnapshot(nextHref);

      if (storedScrollSnapshot) {
        pendingListScrollRestoreRef.current = storedScrollSnapshot;
        skipNextFilterPageResetRef.current = true;
      }

      setNativeVehicleListSearch(nextUrl.search);
    };

    const handleVehicleListUrlChange = (event: Event) => {
      const detail = (event as CustomEvent<{
        href?: string;
        scrollSnapshot?: VehicleListScrollSnapshot;
      }>).detail;
      syncVehicleListUrl(detail?.href ?? `${window.location.pathname}${window.location.search}`, detail?.scrollSnapshot);
    };

    const handlePopState = () => {
      syncVehicleListUrl(`${window.location.pathname}${window.location.search}`);
    };

    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    window.addEventListener(VEHICLE_LIST_URL_CHANGE_EVENT, handleVehicleListUrlChange);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener(VEHICLE_LIST_URL_CHANGE_EVENT, handleVehicleListUrlChange);
      window.removeEventListener("popstate", handlePopState);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

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

  // Keep the full local dataset available so the list can scroll without pagination.
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

  const brandOptions = useMemo<BrandOption[]>(() => {
    const counts = new Map<string, BrandOption>();

    vehicles.forEach((vehicle) => {
      const brandName = getCanonicalBrandName(vehicle.Brand);
      const brandKey = getBrandKey(brandName);
      if (!brandKey || INVALID_BRAND_NAMES.has(brandKey)) return;
      if (!isBrandAllowedForCategory(brandName, apiCategoryFilter)) return;

      const existing = counts.get(brandKey);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(brandKey, { name: brandName, count: 1 });
      }
    });

    const featuredBrandNames = getFeaturedBrandNamesForCategory(apiCategoryFilter);
    const usedKeys = new Set<string>();
    const featuredBrands = featuredBrandNames.map((brandName) => {
      const brandKey = getBrandKey(brandName);
      const countedBrand = counts.get(brandKey);
      usedKeys.add(brandKey);
      return countedBrand ?? { name: brandName, count: 0 };
    });

    const extraBrands = Array.from(counts.entries())
      .filter(([brandKey]) => !usedKeys.has(brandKey))
      .map(([, brand]) => brand)
      .filter((brand) => isBrandAllowedForCategory(brand.name, apiCategoryFilter))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

    return [...featuredBrands, ...extraBrands];
  }, [apiCategoryFilter, vehicles]);

  const selectedBrandName = getCanonicalBrandName(filters.brand);

  const modelOptions = useMemo<ModelOption[]>(() => {
    if (!selectedBrandName) return [];

    const counts = new Map<string, ModelOption>();

    vehicles.forEach((vehicle) => {
      if (!brandMatchesFilter(vehicle.Brand, selectedBrandName)) return;

      const modelName = normalizeModelName(vehicle.Model);
      const modelKey = getModelKey(modelName);
      if (!modelKey) return;

      const existing = counts.get(modelKey);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(modelKey, {
          label: modelName,
          value: modelName,
          count: 1,
        });
      }
    });

    const usedKeys = new Set<string>();
    const featuredModels = getFeaturedModelNamesForBrand(selectedBrandName, apiCategoryFilter).map((modelLabel) => {
      const modelValue = getModelFilterValue(modelLabel);
      const labelKey = getModelKey(modelLabel);
      const valueKey = getModelKey(modelValue);
      const countedModel = counts.get(valueKey) ?? counts.get(labelKey);
      usedKeys.add(labelKey);
      usedKeys.add(valueKey);

      return {
        label: modelLabel,
        value: modelValue,
        count: countedModel?.count ?? 0,
      };
    });

    const extraModels = Array.from(counts.entries())
      .filter(([modelKey]) => !usedKeys.has(modelKey))
      .map(([, model]) => model)
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));

    const mergedModels = [...featuredModels, ...extraModels];
    return mergedModels.length > 0
      ? mergedModels
      : [{ label: "Other - ផ្សេងៗ", value: "Other", count: 0 }];
  }, [apiCategoryFilter, selectedBrandName, vehicles]);

  useEffect(() => {
    setShowAllBrands(false);
  }, [apiCategoryFilter]);

  useEffect(() => {
    setShowAllModels(true);
  }, [selectedBrandName]);

  useEffect(() => {
    const selectedBrandKey = getBrandKey(filters.brand);
    if (!selectedBrandKey) return;

    const selectedBrandIsVisible = brandOptions.some(
      (brand) => getBrandKey(brand.name) === selectedBrandKey
    );
    if (selectedBrandIsVisible) return;

    setFilters((prev) =>
      getBrandKey(prev.brand) === selectedBrandKey
        ? { ...prev, brand: "", model: "" }
        : prev
    );
  }, [brandOptions, filters.brand]);

  const bodyTypeOptions = useMemo<BodyTypeOption[]>(() => {
    const counts = new Map<string, number>();

    vehicles.forEach((vehicle) => {
      const bodyTypeName = normalizeBodyTypeName(vehicle.BodyType);
      if (!bodyTypeName) return;

      const canonicalName = getCanonicalBodyTypeName(bodyTypeName);
      if (!canonicalName) return;

      counts.set(canonicalName, (counts.get(canonicalName) ?? 0) + 1);
    });

    const fixedLabels = new Set(BODY_TYPE_OPTIONS.map((option) => option.label));
    const fixedBodyTypes = BODY_TYPE_OPTIONS.map((option) => ({
      ...option,
      count: counts.get(option.label) ?? 0,
    }));

    const extraBodyTypes = Array.from(counts.entries())
      .filter(([label]) => !fixedLabels.has(label))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], undefined, { sensitivity: "base" }))
      .map(([label, count]) => ({
        label,
        value: label,
        aliases: [label],
        icon: Car,
        tone: "text-slate-600",
        count,
      }));

    return [...fixedBodyTypes, ...extraBodyTypes];
  }, [vehicles]);

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
      const categoryParam = effectiveVehicleListSearchParams.get("category");
      const noImageParam =
        effectiveVehicleListSearchParams.get("withoutImage") ??
        effectiveVehicleListSearchParams.get("noImage");
      const nextHasImage = isTruthyQueryParam(noImageParam) ? "no" : "";
      const nextGroupBy = parseVehicleGroupByParam(effectiveVehicleListSearchParams.get("groupBy"));
      const isMobileVehicleList = detectMobileVehicleViewport();
      const explicitViewModeParam = activeVehicleListSearchParams.get(VEHICLE_LIST_VIEW_PARAM);
      const explicitPageParam = activeVehicleListSearchParams.get(VEHICLE_LIST_PAGE_PARAM);
      const explicitFocusParam = activeVehicleListSearchParams.get(VEHICLE_LIST_FOCUS_PARAM);
      const viewModeParam =
        explicitViewModeParam ?? (isMobileVehicleList ? null : effectiveVehicleListSearchParams.get(VEHICLE_LIST_VIEW_PARAM));
      const nextViewMode = parseVehicleListViewParam(viewModeParam);
      const nextPage = parseVehicleListPageParam(
        isMobileVehicleList && !explicitPageParam
          ? null
          : effectiveVehicleListSearchParams.get(VEHICLE_LIST_PAGE_PARAM)
      );
      const hasPositionQuery = Boolean(
        explicitPageParam ||
        explicitFocusParam ||
        (!isMobileVehicleList && (
          effectiveVehicleListSearchParams.get(VEHICLE_LIST_PAGE_PARAM) ||
          effectiveVehicleListSearchParams.get(VEHICLE_LIST_FOCUS_PARAM)
        ))
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
      if (viewModeParam) {
        userSelectedViewModeRef.current = true;
        setViewMode(prev => (prev === nextViewMode ? prev : nextViewMode));
      } else if (isMobileVehicleList && !userSelectedViewModeRef.current) {
        setViewMode(prev => (prev === "grid" ? prev : "grid"));
      }
      if (explicitPageParam || !pendingListScrollRestoreRef.current) {
        setCurrentPage(prev => (prev === nextPage ? prev : nextPage));
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [activeVehicleListSearchParams, effectiveVehicleListSearchParams]);

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

    const quickCategoryFilter = deferredQuickFilter
      ? {
          cars: "cars",
          motorcycles: "motorcycles",
          tuktuks: "tuktuks",
        }[deferredQuickFilter]
      : "";
    const searchTerms = deferredFilters.search
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const categoryFilter = deferredFilters.category !== "all" ? deferredFilters.category : "";
    const conditionFilter = deferredFilters.condition !== "all" ? deferredFilters.condition.toLowerCase() : "";
    const modelFilter = deferredFilters.model.toLowerCase();
    const yearFilter = deferredFilters.year;
    const plateFilter = deferredFilters.plate.toLowerCase();
    const taxTypeFilter = deferredFilters.taxType.toLowerCase();
    const minPrice = Number.parseFloat(deferredFilters.minPrice);
    const maxPrice = Number.parseFloat(deferredFilters.maxPrice);
    const hasMinPrice = Number.isFinite(minPrice);
    const hasMaxPrice = Number.isFinite(maxPrice);
    const onlyWithoutImage = deferredFilters.hasImage === "no";
    const result: Vehicle[] = [];

    for (const vehicle of vehicles) {
      if (quickCategoryFilter && !categoryMatchesFilter(vehicle.Category, quickCategoryFilter)) continue;
      if (categoryFilter && !categoryMatchesFilter(vehicle.Category, categoryFilter)) continue;
      if (conditionFilter && vehicle.Condition?.toLowerCase() !== conditionFilter) continue;
      if (deferredFilters.brand && !brandMatchesFilter(vehicle.Brand, deferredFilters.brand)) continue;
      if (modelFilter && !vehicle.Model?.toLowerCase().includes(modelFilter)) continue;
      if (yearFilter && !vehicle.Year?.toString().includes(yearFilter)) continue;
      if (plateFilter && !vehicle.Plate?.toLowerCase().includes(plateFilter)) continue;
      if (deferredFilters.bodyType && !bodyTypeMatchesFilter(vehicle.BodyType, deferredFilters.bodyType)) continue;
      if (hasMinPrice && (vehicle.PriceNew || 0) < minPrice) continue;
      if (hasMaxPrice && (vehicle.PriceNew || 0) > maxPrice) continue;
      if (taxTypeFilter && !vehicle.TaxType?.toLowerCase().includes(taxTypeFilter)) continue;
      if (onlyWithoutImage && vehicleHasDisplayableImage(vehicle.Image)) continue;

      if (searchTerms.length > 0) {
        const searchableText = [
          vehicle.Brand,
          vehicle.Model,
          vehicle.Plate,
          vehicle.Category,
          vehicle.Year?.toString(),
          vehicle.Color,
          vehicle.Condition,
          vehicle.BodyType,
          vehicle.TaxType,
        ].filter(Boolean).join(" ").toLowerCase();

        if (!searchTerms.every((term) => searchableText.includes(term))) continue;
      }

      result.push(vehicle);
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
  // Progressive rendering keeps the full result set available without rendering every card at once.
  // ==========================================================================

  const totalLoadBatches = Math.max(1, Math.ceil(filteredVehicles.length / itemsPerPage));
  const visibleVehicleLimit = Math.min(currentPage * itemsPerPage, filteredVehicles.length);
  const visibleVehicles = useMemo(
    () => filteredVehicles.slice(0, visibleVehicleLimit),
    [filteredVehicles, visibleVehicleLimit]
  );
  const hasMoreVehicles = visibleVehicleLimit < filteredVehicles.length;
  const currentPageEndItem = visibleVehicles.length;
  const focusedVehicleId = effectiveVehicleListSearchParams.get(VEHICLE_LIST_FOCUS_PARAM) ?? "";

  const visibleVehicleGroups = useMemo(
    () => groupVehicles(visibleVehicles, groupBy),
    [visibleVehicles, groupBy, groupVehicles]
  );

  const currentVehicleListSearchParams = useMemo(
    () => setVehicleListQueryValue(
      effectiveVehicleListSearchParams,
      "groupBy",
      groupBy === "none" ? null : groupBy
    ),
    [effectiveVehicleListSearchParams, groupBy]
  );

  useEffect(() => {
    if (totalLoadBatches <= 0 || currentPage <= totalLoadBatches) return;
    setCurrentPage(totalLoadBatches);
  }, [currentPage, totalLoadBatches]);

  useEffect(() => {
    if (!hasMoreVehicles || isInitialVehiclesLoad) return;

    const sentinel = infiniteScrollSentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setCurrentPage(prev => Math.min(prev + 1, totalLoadBatches));
      },
      { rootMargin: "700px 0px 700px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreVehicles, isInitialVehiclesLoad, totalLoadBatches]);

  useLayoutEffect(() => {
    const snapshot = pendingListScrollRestoreRef.current;
    if (!snapshot || typeof window === "undefined") return;

    const restoreScroll = () => restoreVehicleListScrollSnapshot(snapshot);
    restoreScroll();
    const animationFrameId = window.requestAnimationFrame(restoreScroll);
    const timeoutId = window.setTimeout(() => {
      restoreScroll();
      pendingListScrollRestoreRef.current = null;
    }, 180);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.clearTimeout(timeoutId);
    };
  }, [filteredVehicles.length, visibleVehicles.length, quickFilter, filters.hasImage, groupBy, viewMode]);

  useLayoutEffect(() => {
    if (!focusedVehicleId || isInitialVehiclesLoad) return;

    let restoreAnimationFrame: number | null = null;
    let restoreTimeoutId: number | null = null;
    const restoreFocusedVehicleScroll = () => {
      const directTarget = document.getElementById(getVehicleListItemElementId(focusedVehicleId));
      const dataTargets = Array.from(
        document.querySelectorAll<HTMLElement>("[data-vehicle-list-item-id]")
      ).filter((element) => element.dataset.vehicleListItemId === focusedVehicleId);
      const target =
        (directTarget?.offsetParent ? directTarget : null) ??
        dataTargets.find((element) => element.offsetParent !== null) ??
        directTarget ??
        dataTargets[0];

      const currentListHref = `${window.location.pathname}${window.location.search}`;
      const storedScrollPosition = getStoredVehicleListScrollPosition(currentListHref, focusedVehicleId);

      if (storedScrollPosition) {
        const restoreScrollPosition = () => {
          const scrollOptions: ScrollToOptions = {
            left: storedScrollPosition.scrollX,
            top: storedScrollPosition.scrollY,
            behavior: "auto",
          };
          const scrollContainer = getVehicleListScrollContainer();

          if (scrollContainer) {
            scrollContainer.scrollTo(scrollOptions);
          } else {
            window.scrollTo(scrollOptions);
          }

          target?.focus({ preventScroll: true });
        };

        restoreScrollPosition();
        restoreAnimationFrame = window.requestAnimationFrame(restoreScrollPosition);
        restoreTimeoutId = window.setTimeout(restoreScrollPosition, 180);
        return;
      }

      target?.scrollIntoView({ block: "center", behavior: "auto" });
      target?.focus({ preventScroll: true });
    };

    restoreFocusedVehicleScroll();
    restoreAnimationFrame = window.requestAnimationFrame(restoreFocusedVehicleScroll);
    restoreTimeoutId = window.setTimeout(restoreFocusedVehicleScroll, 120);

    return () => {
      if (restoreAnimationFrame !== null) {
        window.cancelAnimationFrame(restoreAnimationFrame);
      }
      if (restoreTimeoutId !== null) {
        window.clearTimeout(restoreTimeoutId);
      }
    };
  }, [focusedVehicleId, isInitialVehiclesLoad, visibleVehicles]);

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  const getVehicleListUrl = useCallback((params: URLSearchParams) => {
    const query = params.toString();
    return query ? `/vehicles?${query}` : "/vehicles";
  }, []);

  const rememberActiveListHref = useCallback((href: string) => {
    activeListHrefRef.current = href;
    rememberVehicleListHref(href);
  }, []);

  const navigateVehicleListInPlace = useCallback((
    href: string,
    mode: "push" | "replace" = "push"
  ) => {
    if (typeof window === "undefined") {
      if (mode === "replace") {
        router.replace(href, { scroll: false });
      } else {
        router.push(href, { scroll: false });
      }
      return;
    }

    const nextUrl = new URL(href, window.location.origin);
    const nextHref = `${nextUrl.pathname}${nextUrl.search}`;
    const scrollSnapshot = preserveVehicleListScrollForUpdate() ?? getVehicleListScrollSnapshot();

    rememberVehicleListScrollSnapshot(nextHref, scrollSnapshot);
    rememberActiveListHref(nextHref);

    if (mode === "replace") {
      window.history.replaceState(window.history.state, "", nextHref);
    } else {
      window.history.pushState(window.history.state, "", nextHref);
    }

    setNativeVehicleListSearch(nextUrl.search);
  }, [preserveVehicleListScrollForUpdate, rememberActiveListHref, router]);

  const showAllVehicles = useCallback(() => {
    clearStoredVehicleListState();
    navigateVehicleListInPlace(VEHICLE_LIST_ALL_HREF);
  }, [navigateVehicleListInPlace]);

  const getCurrentVehicleListScrollPosition = useCallback(() => {
    const scrollContainer = getVehicleListScrollContainer();

    return {
      scrollX: scrollContainer?.scrollLeft ?? window.scrollX,
      scrollY: scrollContainer?.scrollTop ?? window.scrollY,
    };
  }, []);

  const buildVehicleListParams = useCallback((
    options: {
      page?: number;
      focusVehicleId?: string | null;
      viewMode?: ViewMode;
    } = {}
  ) => {
    const nextParams = new URLSearchParams(currentVehicleListSearchParams.toString());
    const nextPage = Math.max(1, options.page ?? currentPage);
    const nextViewMode = options.viewMode ?? viewMode;

    if (nextPage > 1) {
      nextParams.set(VEHICLE_LIST_PAGE_PARAM, String(nextPage));
    } else {
      nextParams.delete(VEHICLE_LIST_PAGE_PARAM);
    }

    nextParams.set(VEHICLE_LIST_VIEW_PARAM, nextViewMode);

    if (options.focusVehicleId) {
      nextParams.set(VEHICLE_LIST_FOCUS_PARAM, options.focusVehicleId);
    } else if (options.focusVehicleId === null) {
      nextParams.delete(VEHICLE_LIST_FOCUS_PARAM);
    }

    return nextParams;
  }, [currentPage, currentVehicleListSearchParams, viewMode]);

  const replaceCurrentHistoryWithListState = useCallback((params: URLSearchParams) => {
    if (typeof window === "undefined") return;
    const returnUrl = getVehicleListUrl(params);
    rememberActiveListHref(returnUrl);
    window.history.replaceState(window.history.state, "", returnUrl);
  }, [getVehicleListUrl, rememberActiveListHref]);

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
    preserveVehicleListScrollForUpdate();
    userSelectedViewModeRef.current = true;
    setViewMode(nextViewMode);
    const nextParams = buildVehicleListParams({
      focusVehicleId: null,
      viewMode: nextViewMode,
    });
    const nextHref = getVehicleListUrl(nextParams);
    navigateVehicleListInPlace(nextHref, "replace");
  }, [buildVehicleListParams, getVehicleListUrl, navigateVehicleListInPlace, preserveVehicleListScrollForUpdate]);

  const handleBrandSelect = useCallback((brand: string) => {
    preserveVehicleListScrollForUpdate();
    const selectedBrandKey = getBrandKey(brand);
    setFilters(prev => ({
      ...prev,
      brand: getBrandKey(prev.brand) === selectedBrandKey ? "" : getCanonicalBrandName(brand),
      model: "",
    }));
    setShowAllModels(true);
    resetVisibleVehicleBatch();
  }, [preserveVehicleListScrollForUpdate, resetVisibleVehicleBatch]);

  const handleBackToBrands = useCallback(() => {
    preserveVehicleListScrollForUpdate();
    setFilters(prev => ({
      ...prev,
      brand: "",
      model: "",
    }));
    setShowAllBrands(false);
    setShowAllModels(true);
    resetVisibleVehicleBatch();
  }, [preserveVehicleListScrollForUpdate, resetVisibleVehicleBatch]);

  const handleModelSelect = useCallback((model: string) => {
    preserveVehicleListScrollForUpdate();
    setFilters(prev => ({
      ...prev,
      model: getModelKey(prev.model) === getModelKey(model) ? "" : model,
    }));
    resetVisibleVehicleBatch();
  }, [preserveVehicleListScrollForUpdate, resetVisibleVehicleBatch]);

  const handleBodyTypeSelect = useCallback((bodyType: string) => {
    preserveVehicleListScrollForUpdate();
    setFilters(prev => ({
      ...prev,
      bodyType: getBodyTypeKey(prev.bodyType) === getBodyTypeKey(bodyType) ? "" : bodyType,
    }));
    resetVisibleVehicleBatch();
  }, [preserveVehicleListScrollForUpdate, resetVisibleVehicleBatch]);

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
      bodyType: "",
      minPrice: "",
      maxPrice: "",
      taxType: "",
      hasImage: "",
    });
    setQuickFilter(null);
    resetVisibleVehicleBatch();
    showAllVehicles();
  };

  const hasActiveFilters = () => {
    return filters.search || filters.brand || filters.model || filters.year ||
           filters.plate || filters.bodyType || filters.minPrice || filters.maxPrice || filters.taxType ||
           filters.hasImage ||
           (filters.category && filters.category !== "all") ||
           (filters.condition && filters.condition !== "all") ||
           quickFilter !== null;
  };

  const handleGroupByChange = useCallback((nextGroupBy: GroupByOption) => {
    preserveVehicleListScrollForUpdate();
    setGroupBy(nextGroupBy);
    const nextParams = setVehicleListQueryValue(
      effectiveVehicleListSearchParams,
      "groupBy",
      nextGroupBy === "none" ? null : nextGroupBy
    );
    nextParams.delete(VEHICLE_LIST_PAGE_PARAM);
    nextParams.delete(VEHICLE_LIST_FOCUS_PARAM);
    resetVisibleVehicleBatch();
    const nextHref = getVehicleListUrl(nextParams);
    navigateVehicleListInPlace(nextHref, "replace");
  }, [effectiveVehicleListSearchParams, getVehicleListUrl, navigateVehicleListInPlace, preserveVehicleListScrollForUpdate, resetVisibleVehicleBatch]);

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

  const getReturnHrefForVehicle = useCallback((id: string) => {
    const currentListHref = getVehicleListUrl(buildVehicleListParams());
    return withVehicleListFocusHref(currentListHref, id);
  }, [buildVehicleListParams, getVehicleListUrl]);

  const handleView = useCallback((id: string) => {
    cacheVehicleForDetail(id);
    const returnHref = getReturnHrefForVehicle(id);
    const scrollPosition = getCurrentVehicleListScrollPosition();
    rememberVehicleListScrollPosition(returnHref, id, scrollPosition);
    rememberVehicleListScrollSnapshot(returnHref, scrollPosition);
    const returnParams = new URLSearchParams(returnHref.split("?")[1] ?? "");
    replaceCurrentHistoryWithListState(returnParams);
    router.push(withVehicleListReturnHref(`/vehicles/${encodeURIComponent(id)}/view`, returnHref));
  }, [cacheVehicleForDetail, getCurrentVehicleListScrollPosition, getReturnHrefForVehicle, replaceCurrentHistoryWithListState, router]);

  const handleEdit = useCallback((id: string) => {
    cacheVehicleForDetail(id);
    const returnHref = getReturnHrefForVehicle(id);
    const scrollPosition = getCurrentVehicleListScrollPosition();
    rememberVehicleListScrollPosition(returnHref, id, scrollPosition);
    rememberVehicleListScrollSnapshot(returnHref, scrollPosition);
    const returnParams = new URLSearchParams(returnHref.split("?")[1] ?? "");
    replaceCurrentHistoryWithListState(returnParams);
    router.push(withVehicleListReturnHref(`/vehicles/${encodeURIComponent(id)}/edit`, returnHref));
  }, [cacheVehicleForDetail, getCurrentVehicleListScrollPosition, getReturnHrefForVehicle, replaceCurrentHistoryWithListState, router]);

  useEffect(() => {
    const listParams = buildVehicleListParams();
    rememberActiveListHref(getVehicleListUrl(listParams));
  }, [buildVehicleListParams, getVehicleListUrl, rememberActiveListHref]);

  const handleDelete = useCallback((vehicle: Vehicle) => {
    setVehicleToDelete(vehicle);
    setIsDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (vehicleToDelete) {
      await deleteVehicle(vehicleToDelete);
    }
  }, [deleteVehicle, vehicleToDelete]);

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
    <div className="ec-dark-scope min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 px-1.5 pb-2 pt-2 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-2 sm:space-y-6">

        {/* Header Section */}
        <div className="flex flex-col justify-between gap-2 sm:gap-4 lg:flex-row lg:items-center">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-100 sm:gap-3 sm:text-3xl">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 sm:h-10 sm:w-10 sm:rounded-xl">
                <Car className="h-5 w-5 text-white sm:h-6 sm:w-6" />
              </span>
              Vehicle Inventory
            </h1>
            <p className="mt-1 hidden text-sm text-slate-500 dark:text-slate-400 sm:ml-13 sm:mt-2 sm:block sm:text-base">{t.manageTrackVehicles}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {isInitialVehiclesLoad && (
              <span className="inline-flex items-center gap-2 rounded-xl border border-slate-100 bg-white/80 px-3 py-2 text-xs font-medium text-slate-500 shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-400 dark:shadow-[0_10px_24px_rgba(2,6,23,0.4)]">
                <RefreshCw className="h-4 w-4 animate-spin text-emerald-500" />
                Loading
              </span>
            )}

            {/* Last Sync */}
            <div className="hidden items-center gap-2 rounded-xl border border-slate-100 bg-white/80 px-3 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-[0_10px_24px_rgba(2,6,23,0.4)] sm:flex">
              <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Last sync: {lastSync.toLocaleTimeString()}
              </span>
            </div>

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

        {selectedBrandName ? (
          <ModelFilterSection
            title={t.model}
            backLabel={t.brand}
            models={modelOptions}
            selectedModel={filters.model}
            isExpanded={showAllModels}
            onBackToBrands={handleBackToBrands}
            onToggleExpanded={() => setShowAllModels(prev => !prev)}
            onModelSelect={handleModelSelect}
          />
        ) : (
          <BrandFilterSection
            title={t.brand}
            brands={brandOptions}
            selectedBrand={filters.brand}
            isExpanded={showAllBrands}
            onToggleExpanded={() => setShowAllBrands(prev => !prev)}
            onBrandSelect={handleBrandSelect}
          />
        )}

        <BodyTypeFilterSection
          title={t.bodyType}
          bodyTypes={bodyTypeOptions}
          selectedBodyType={filters.bodyType}
          onBodyTypeSelect={handleBodyTypeSelect}
        />

        <div className="sticky top-0 z-40 space-y-1.5 rounded-2xl border border-slate-200/70 bg-slate-50/95 p-1.5 shadow-[0_10px_22px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/95 dark:shadow-[0_18px_45px_rgba(0,0,0,0.26)] sm:-mx-3 sm:space-y-4 sm:px-3 sm:py-3">
        {/* Search and Filters Bar */}
        <div className="space-y-1.5 sm:space-y-4">
            <div className="flex flex-col gap-1.5 lg:flex-row lg:gap-4">
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
                        showAllVehicles();
                      } else {
                        setQuickFilter(value);
                        setFilters(prev => ({ ...prev, category: "all" }));
                        navigateVehicleListInPlace(`/vehicles?category=${value}`);
                      }
                    }}
                    className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200/70 bg-white px-3 py-2 pr-9 text-xs font-medium text-slate-700 shadow-[4px_4px_8px_#e2e8f0,-4px_-4px_8px_#ffffff] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700/70 dark:bg-slate-900 dark:text-slate-100 dark:shadow-[0_10px_24px_rgba(2,6,23,0.45)] sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm"
                  >
                    <option value="all">{t.allCategories}</option>
                    <option value="cars">Cars</option>
                    <option value="motorcycles">Motorcycles</option>
                    <option value="tuktuks">TukTuks</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                </div>
              </div>

              {/* Filter Controls */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0 sm:gap-3">
                <NeuButton
                  variant={showFilters ? "primary" : "default"}
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  icon={Filter}
                  className="min-h-8 rounded-xl px-3 py-1.5 text-xs sm:min-h-10 sm:rounded-2xl sm:text-sm"
                >
                  <span className="sm:hidden">Filters</span>
                  <span className="hidden sm:inline">More Filters</span>
                </NeuButton>

              {hasActiveFilters() && (
                <NeuButton
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  icon={RotateCcw}
                  className="min-h-8 rounded-xl px-3 py-1.5 text-xs sm:min-h-10 sm:rounded-2xl sm:text-sm"
                >
                  <span className="sm:hidden">Clear</span>
                  <span className="hidden sm:inline">Reset</span>
                </NeuButton>
              )}

              {/* Group By Dropdown */}
              <div className="relative hidden sm:block">
<select
                  title="Group vehicles by"
                  value={groupBy}
                  onChange={(e) => handleGroupByChange(e.target.value as GroupByOption)}
                  className="w-full cursor-pointer appearance-none rounded-2xl border border-slate-200/70 bg-white px-3 py-2.5 pr-9 text-sm font-medium text-slate-700 shadow-[4px_4px_8px_#e2e8f0,-4px_-4px_8px_#ffffff] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700/70 dark:bg-slate-900 dark:text-slate-100 dark:shadow-[0_10px_24px_rgba(2,6,23,0.45)] sm:px-4 sm:pr-10"
                >
                  <option value="none">None</option>
                  <option value="category">Category</option>
                  <option value="brand">Brand</option>
                  <option value="year">Year</option>
                  <option value="condition">Condition</option>
                  <option value="color">Color</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              </div>

              <ViewToggle view={viewMode} onChange={handleViewModeChange} t={t} />

              {/* Columns Dropdown */}
              <div className="relative hidden sm:block" ref={columnMenuRef}>
                <button
                  type="button"
                  ref={columnsButtonRef}
                  onClick={() => setShowColumnMenu(!showColumnMenu)}
                  aria-expanded={showColumnMenu ? "true" : "false"}
                  aria-haspopup="dialog"
                  className={cn(
                    "flex min-h-10 items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium sm:px-4 sm:py-2.5",
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
                  <span className="hidden sm:inline">Columns</span>
                </button>

                {showColumnMenu && (
                  <>
                    <button
                      type="button"
                      aria-label="Close columns menu"
                      className="fixed inset-0 z-[900] bg-slate-950/25 backdrop-blur-[1px] sm:hidden"
                      onClick={() => setShowColumnMenu(false)}
                    />
                    <NeuCard
                      className="fixed right-4 top-[calc(env(safe-area-inset-top)+6.25rem)] z-[910] flex max-h-[min(60dvh,24rem)] w-[min(calc(100vw-2rem),20rem)] flex-col overflow-hidden rounded-2xl p-3 sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:z-50 sm:mt-2 sm:w-72 sm:max-h-[34rem] sm:p-4"
                      hover={false}
                      role="dialog"
                      aria-labelledby="vehicle-columns-menu-title"
                    >
                      <div className="flex min-h-0 flex-1 flex-col gap-2 sm:gap-3">
                        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 pb-2 dark:border-slate-700 sm:gap-3 sm:pb-3">
                          <span id="vehicle-columns-menu-title" className="text-sm font-semibold text-slate-700 dark:text-slate-100 sm:text-base">{t.visibleColumns}</span>
                          <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300 sm:py-1 sm:text-xs">
                            {visibleColumns.filter(key => key !== "actions").length}/{COLUMNS.length - 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowColumnMenu(false)}
                            aria-label="Close columns menu"
                            title="Close columns menu"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 active:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:active:bg-slate-700 sm:h-10 sm:w-10"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain pr-1 sm:max-h-64 sm:flex-none sm:space-y-1">
                          {COLUMNS.filter(col => col.key !== "actions").map((col) => (
                            <label
                              key={col.key}
                              className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800 dark:active:bg-slate-700/70 sm:min-h-11 sm:gap-3 sm:px-2.5 sm:py-2"
                            >
                              <input
                                type="checkbox"
                                checked={visibleColumns.includes(col.key)}
                                onChange={() => toggleColumn(col.key)}
                                className="h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 dark:border-slate-600 sm:h-5 sm:w-5"
                              />
                              <span className="min-w-0 text-xs font-medium text-slate-600 dark:text-slate-300 sm:text-sm">{col.label}</span>
                            </label>
                          ))}
                        </div>

                        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-200 pt-2 dark:border-slate-700 sm:pt-3">
                          <button
                            type="button"
                            onClick={() => setVisibleColumns(COLUMNS.map(c => c.key))}
                            className="min-h-9 rounded-lg bg-emerald-50 px-2 py-1.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-100 active:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25 dark:active:bg-emerald-500/35 sm:min-h-0"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={() => setVisibleColumns(["image", "brand", "model", "actions"])}
                            className="min-h-9 rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:active:bg-slate-600 sm:min-h-0"
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
            <div className="max-h-[calc(100dvh-env(safe-area-inset-top)-30rem)] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-lg backdrop-blur-xl duration-300 animate-in slide-in-from-top-2 dark:border-slate-700/80 dark:bg-slate-900/90 dark:shadow-[0_18px_40px_rgba(2,6,23,0.5)] sm:max-h-none sm:overflow-visible">
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
                    onChange={(e) => setFilters(prev => ({ ...prev, brand: e.target.value, model: "" }))}
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
                  <label className={FILTER_LABEL_CLASS}>{t.bodyType}</label>
                  <select
                    title="Filter by body type"
                    value={filters.bodyType}
                    onChange={(e) => setFilters(prev => ({ ...prev, bodyType: e.target.value }))}
                    className={FILTER_FIELD_CLASS}
                  >
                    <option value="">All Body Types</option>
                    {BODY_TYPE_OPTIONS.map((bodyType) => (
                      <option key={bodyType.value} value={bodyType.value}>{bodyType.label}</option>
                    ))}
                  </select>
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
                      if (nextHasImage === 'no') {
                        navigateVehicleListInPlace("/vehicles?withoutImage=true");
                      } else {
                        showAllVehicles();
                      }
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
                    showAllVehicles();
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
                  onRemove={() => setFilters(prev => ({ ...prev, brand: "", model: "" }))}
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

              {filters.bodyType && (
                <FilterTag
                  label="Body Type"
                  value={getCanonicalBodyTypeName(filters.bodyType)}
                  onRemove={() => setFilters(prev => ({ ...prev, bodyType: "" }))}
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
                    showAllVehicles();
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 dark:text-slate-300 sm:text-sm">
              {isInitialVehiclesLoad ? (
                <>
                  Loading <span className="font-semibold text-slate-800 dark:text-slate-100">vehicles</span>...
                </>
              ) : (
                <>
                  {hasMoreVehicles ? (
                    <>
                      Showing <span className="font-semibold text-slate-800 dark:text-slate-100">{currentPageEndItem}</span> of{" "}
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{filteredVehicles.length}</span> vehicles
                    </>
                  ) : (
                    <>
                      Showing all <span className="font-semibold text-slate-800 dark:text-slate-100">{filteredVehicles.length}</span> vehicles
                    </>
                  )}
                  {groupBy !== "none" && (
                    <span className="ml-2 rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                      Grouped by {groupBy}
                    </span>
                  )}
                  {meta?.total && meta.total !== filteredVehicles.length && (
                    <span className="ml-1 text-slate-500 dark:text-slate-400">from {meta.total.toLocaleString()}</span>
                  )}
                </>
              )}
            </span>
          </div>

          {viewMode === "list" && groupBy === "none" && (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Sorted by {sortField} ({sortDirection})
            </div>
          )}
        </div>

        </div>

        {/* Vehicle Display */}
        {viewMode === "grid" ? (
          // Grid View with Grouping
          <div className="space-y-4 sm:space-y-5">
            {filteredVehicles.length > 0 && visibleVehicleGroups.map((group) => (
              <div key={group.key} className="space-y-1.5 sm:space-y-3">
                {/* Group Header */}
                <div className={cn(groupBy === "none" && "hidden sm:block")}>
                  <VehicleGroupHeader label={group.label} count={group.count} avgPrice={group.avgPrice} />
                </div>
                {/* Group Vehicles Grid */}
                <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:gap-4 xl:grid-cols-5 2xl:grid-cols-6">
                  {group.vehicles.map((vehicle) => (
                    <VehicleCard
                      key={vehicle.VehicleId}
                      vehicle={vehicle}
                      onView={handleView}
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
              <div key={group.key} className="space-y-1.5 sm:space-y-3">
                {/* Group Header */}
                <div className={cn(groupBy === "none" && "hidden sm:block")}>
                  <VehicleGroupHeader label={group.label} count={group.count} avgPrice={group.avgPrice} />
                </div>
                {/* Group Vehicles List */}
                <div className="space-y-1.5 sm:space-y-3 lg:space-y-4">
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

                {false && (
                <div className="hidden overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-[0_18px_40px_rgba(2,6,23,0.5)]">
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
                              <td className="px-4 py-3.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                                {vehicle.VehicleId?.startsWith("temp-") ? "Saving..." : `#${formatVehicleId(vehicle.VehicleId)}`}
                              </td>
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
                )}
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

        {filteredVehicles.length > 0 && hasMoreVehicles && (
          <div ref={infiniteScrollSentinelRef} className="h-12" aria-hidden="true" />
        )}

        {/* Add Vehicle Modal */}
        {showAddModal && (
          <AddVehicleModalOptimistic
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            onSuccess={() => {
              refresh();
              setCurrentPage(1);
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
