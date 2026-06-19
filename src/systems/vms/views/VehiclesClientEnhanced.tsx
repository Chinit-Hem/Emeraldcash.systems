"use client";

import { useLanguage } from "@/shared/hooks/LanguageContext";
import { useTranslation, type Language, type Translations } from "@/shared/utils/i18n";
import { useAuthUser } from "@/shared/hooks/AuthContext";

import { ConfirmDeleteModal } from "@/systems/vms/components/vehicles/ConfirmDeleteModal";

import { useDeleteVehicle } from "@/systems/vms/components/vehicles/useDeleteVehicle";
import { useToast } from "@/shared/components/ui/glass/GlassToast";
import { isDriveHostedImageUrl } from "@/shared/utils/drive";
import {
  getVehicleImageCount,
  getVehicleSuggestionSearchText,
  getVehicleThumbnailUrl,
  isCloudinaryUrl,
  mergeVehicleImages,
} from "@/systems/vms/utils/vehicle-helpers";
import { getVehicleColorHex, translateVehicleColor } from "@/systems/vms/utils/vehicleColors";
import type { Vehicle } from "@/shared/types/types";
import { cn } from "@/shared/utils/ui";
import { MOBILE_BACK_REQUEST_EVENT } from "@/shared/utils/mobileBack";
import { useVehiclesNeon } from "@/systems/vms/hooks/useVehiclesNeon";
import { getFuzzySuggestions } from "@/systems/vms/utils/fuzzySearch";
import {
  INVALID_BRAND_NAMES,
  brandMatchesFilter,
  getBrandFallbackLabel,
  getBrandKey,
  getBrandLogoSources,
  getCanonicalBrandName,
  getDisplayBrandName,
  getDisplayModelName,
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
  rememberVehicleListViewMode,
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
import { VehicleFormModalSkeleton } from "@/shared/components/skeletons/NeuVehicleFormSkeleton";
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
  Sparkles,
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
    loading: () => <VehicleFormModalSkeleton />,
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

const DEFAULT_FILTER_STATE: FilterState = {
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
};

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

const DEFAULT_TABLE_COLUMNS = COLUMNS.filter((column) => column.defaultVisible);

const DEFAULT_ITEMS_PER_PAGE = 50;
const MOBILE_ITEMS_PER_PAGE = 24;
const MOBILE_INITIAL_VEHICLE_FETCH_LIMIT = 320;
const MOBILE_BACKGROUND_VEHICLE_FETCH_LIMIT = 320;
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
  imageSrc?: string;
  imageClassName?: string;
  count: number;
};

const BODY_TYPE_OPTIONS: Omit<BodyTypeOption, "count">[] = [
  {
    label: "Sedan",
    value: "Sedan",
    aliases: ["sedan", "saloon"],
    icon: Car,
    tone: "text-sky-600",
    imageSrc: "/assets/vehicle-body-types/Sedan-Car-PNG.png",
  },
  {
    label: "Hatchback",
    value: "Hatchback",
    aliases: ["hatchback", "hatch"],
    icon: CarFront,
    tone: "text-blue-600",
    imageSrc: "/assets/vehicle-body-types/Hatchback-Car-PNG.png",
  },
  {
    label: "Pickup",
    value: "Pickup",
    aliases: ["pickup", "pick up", "pick-up", "truck"],
    icon: Truck,
    tone: "text-cyan-700",
    imageSrc: "/assets/vehicle-body-types/Pickup-Car-PNG.png",
    imageClassName: "w-[44px] sm:w-[82px]",
  },
  {
    label: "SUV",
    value: "SUV",
    aliases: ["suv", "crossover"],
    icon: Car,
    tone: "text-indigo-600",
    imageSrc: "/assets/vehicle-body-types/SUV-Car-PNG.png",
  },
  {
    label: "Convertible",
    value: "Convertible",
    aliases: ["convertible", "cabriolet", "roadster"],
    icon: CarTaxiFront,
    tone: "text-blue-500",
    imageSrc: "/assets/vehicle-body-types/Convertible-Car-PNG.png",
  },
  {
    label: "MPV (Minivan)",
    value: "MPV",
    aliases: ["mpv", "minivan", "mini van", "van"],
    icon: Van,
    tone: "text-sky-700",
    imageSrc: "/assets/vehicle-body-types/MPV%20%28Minivan%29-Car-PNG.png",
  },
  {
    label: "Sports",
    value: "Sports",
    aliases: ["sports", "sport", "coupe"],
    icon: CarFront,
    tone: "text-blue-700",
    imageSrc: "/assets/vehicle-body-types/bugatti-Sport-Car-PNG.png",
    imageClassName: "w-[40px] sm:w-[78px]",
  },
  {
    label: "Station Wagon",
    value: "Station Wagon",
    aliases: ["station wagon", "wagon", "estate"],
    icon: BusFront,
    tone: "text-slate-600",
    imageSrc: "/assets/vehicle-body-types/Station-Wagon-Car-PNG.png",
  },
  {
    label: "Other",
    value: "Other",
    aliases: ["other", "others"],
    icon: Shapes,
    tone: "text-sky-600",
    // Intentionally omit imageSrc so the UI uses BodyTypeVehicleSvg fallback
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

function isTextEntryElement(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false;

  if (element instanceof HTMLInputElement) {
    return ![
      "button",
      "checkbox",
      "color",
      "file",
      "hidden",
      "image",
      "radio",
      "range",
      "reset",
      "submit",
    ].includes(element.type);
  }

  return (
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    element.isContentEditable
  );
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
        hover && !active && "ec-motion ec-motion-soft ec-live-card",
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
        "ec-pressable ec-motion ec-motion-soft flex items-center justify-center gap-2 rounded-xl font-medium",
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
  onClear,
  onFocus,
  onBlur,
  placeholder,
  type = "text",
  icon: Icon,
  className,
  autoComplete,
  enterKeyHint,
  inputMode,
  clearLabel = "Clear input",
  onKeyDown,
}: {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  autoComplete?: string;
  enterKeyHint?: React.HTMLAttributes<HTMLInputElement>["enterKeyHint"];
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  clearLabel?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}) {
  const showClearButton = Boolean(onClear && value);

  return (
    <div className={cn("relative", className)}>
      {Icon && <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 sm:left-4 sm:h-5 sm:w-5" />}
      <input
        type={type}
        title={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        enterKeyHint={enterKeyHint}
        inputMode={inputMode}
        onKeyDown={onKeyDown}
        className={cn(
          "w-full rounded-xl border border-slate-200/70 bg-white transition-all duration-200 dark:border-slate-700/70 dark:bg-slate-900 sm:rounded-2xl",
          "shadow-[4px_4px_8px_#e2e8f0,-4px_-4px_8px_#ffffff]",
          "dark:shadow-[0_10px_24px_rgba(2,6,23,0.45)]",
          "focus:shadow-[6px_6px_12px_#e2e8f0,-6px_-6px_12px_#ffffff]",
          "dark:focus:shadow-[0_14px_30px_rgba(2,6,23,0.58)]",
          "focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40",
          "text-xs text-slate-700 placeholder-slate-400 outline-none dark:text-slate-100 dark:placeholder-slate-500 sm:text-sm",
          Icon ? "py-2 pl-9 sm:py-3 sm:pl-12" : "py-2 pl-3 sm:py-3 sm:pl-4",
          showClearButton ? "pr-10 sm:pr-12" : "pr-3 sm:pr-4"
        )}
      />
      {showClearButton && (
        <button
          type="button"
          aria-label={clearLabel}
          title={clearLabel}
          onPointerDown={(event) => event.preventDefault()}
          onClick={onClear}
          className="ec-pressable absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200 sm:right-3 sm:h-8 sm:w-8"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Brand Filter Component
// ============================================================================

const BRAND_LOGO_SIZE_CLASS_BY_KEY: Record<string, string> = {
  aeolus: "h-auto max-h-none w-[34px] max-w-none sm:w-[68px] sm:max-w-none",
  "aston martin": "h-[34px] max-h-none w-[34px] max-w-none sm:h-[84px] sm:max-h-none sm:w-[84px] sm:max-w-none",
  audi: "h-[38px] max-h-none w-[38px] max-w-none sm:h-[94px] sm:max-h-none sm:w-[94px] sm:max-w-none",
  bentley: "h-[38px] max-h-none w-[38px] max-w-none sm:h-[94px] sm:max-h-none sm:w-[94px] sm:max-w-none",
  baw: "h-auto max-h-none w-[38px] max-w-none sm:w-[82px] sm:max-w-none",
  byd: "h-auto max-h-none w-[28px] max-w-none sm:w-[58px] sm:max-w-none",
  chevrolet: "h-auto max-h-none w-[38px] max-w-none sm:w-[94px] sm:max-w-none",
  chrysler: "h-auto max-h-none w-[28px] max-w-none sm:w-[58px] sm:max-w-none",
  dodge: "h-auto max-h-none w-[38px] max-w-none sm:w-[88px] sm:max-w-none",
  ford: "h-[38px] max-h-none w-[38px] max-w-none sm:h-[94px] sm:max-h-none sm:w-[94px] sm:max-w-none",
  gmc: "h-auto max-h-none w-[34px] max-w-none sm:w-[76px] sm:max-w-none",
  gtr: "h-[24px] max-h-none w-[24px] max-w-none sm:h-[58px] sm:max-h-none sm:w-[58px] sm:max-w-none",
  hyosung: "h-auto max-h-none w-[38px] max-w-none sm:w-[88px] sm:max-w-none",
  infiniti: "h-[38px] max-h-none w-[38px] max-w-none sm:h-[96px] sm:max-h-none sm:w-[96px] sm:max-w-none",
  italjet: "h-auto max-h-none w-[38px] max-w-none sm:w-[88px] sm:max-w-none",
  "italjet dragster": "h-auto max-h-none w-[38px] max-w-none sm:w-[88px] sm:max-w-none",
  jaguar: "h-auto max-h-none w-[44px] max-w-none sm:w-[96px] sm:max-w-none",
  jeep: "h-[31px] max-h-none w-[31px] max-w-none sm:h-[76px] sm:max-h-none sm:w-[76px] sm:max-w-none",
  kamax: "h-auto max-h-none w-[38px] max-w-none sm:w-[88px] sm:max-w-none",
  lambretta: "h-auto max-h-none w-[38px] max-w-none sm:w-[88px] sm:max-w-none",
  "land rover": "h-[36px] max-h-none w-[36px] max-w-none sm:h-[88px] sm:max-h-none sm:w-[88px] sm:max-w-none",
  mclaren: "h-[34px] max-h-none w-[34px] max-w-none sm:h-[84px] sm:max-h-none sm:w-[84px] sm:max-w-none",
  mini: "h-[38px] max-h-none w-[38px] max-w-none sm:h-[96px] sm:max-h-none sm:w-[96px] sm:max-w-none",
  ssangyong: "h-[30px] max-h-none w-[30px] max-w-none sm:h-[70px] sm:max-h-none sm:w-[70px] sm:max-w-none",
  sym: "h-auto max-h-none w-[38px] max-w-none sm:w-[88px] sm:max-w-none",
  zotye: "h-[32px] max-h-none w-[32px] max-w-none sm:h-[62px] sm:max-h-none sm:w-[62px] sm:max-w-none",
  zxauto: "h-[32px] max-h-none w-[32px] max-w-none sm:h-[62px] sm:max-h-none sm:w-[62px] sm:max-w-none",
};

function BrandLogoMark({ brand }: { brand: string }) {
  const brandKey = useMemo(() => getBrandKey(brand), [brand]);
  const logoSources = useMemo(() => getBrandLogoSources(brand), [brand]);
  const fallbackLabel = useMemo(() => getBrandFallbackLabel(brand), [brand]);
  const isOtherBrand = brandKey.startsWith("other");
  const brandLogoSizeClass = BRAND_LOGO_SIZE_CLASS_BY_KEY[brandKey];
  const [logoSourceIndex, setLogoSourceIndex] = useState(0);

  useEffect(() => {
    setLogoSourceIndex(0);
  }, [brand, logoSources.length]);

  const logoSource = logoSources[logoSourceIndex];

  return (
    <span className="ec-mark-motion relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f6fbff] p-0.5 shadow-[0_5px_10px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/80 dark:bg-[#f6fbff] dark:shadow-[0_8px_18px_rgba(0,0,0,0.35)] dark:ring-transparent sm:h-[72px] sm:w-[72px] sm:p-0">
      {logoSource ? (
        <img
          key={logoSource}
          src={logoSource}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onError={() => setLogoSourceIndex((index) => index + 1)}
          className={cn(
            "h-auto max-h-[24px] w-auto max-w-[30px] shrink-0 object-contain saturate-100 sm:max-h-[58px] sm:max-w-[64px]",
            brandLogoSizeClass
          )}
        />
      ) : isOtherBrand ? (
        <Shapes className="h-5 w-5 text-sky-600 sm:h-10 sm:w-10" aria-hidden="true" />
      ) : (
        <span
          aria-hidden="true"
          className="max-w-[110%] px-0.5 text-center text-[8px] font-black leading-none tracking-normal text-slate-700 sm:text-sm"
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
              {...(isActive ? { "aria-pressed": "true" as const } : { "aria-pressed": "false" as const })}
              onClick={() => onBrandSelect(brand.name)}
              className={cn(
                "ec-pressable ec-motion ec-motion-soft group flex min-h-[58px] min-w-0 flex-col items-center justify-start gap-1 rounded-xl px-0 py-1 text-center transition sm:min-h-[122px] sm:gap-3 sm:px-2 sm:py-2",
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
              {...(isActive ? { "aria-pressed": "true" as const } : { "aria-pressed": "false" as const })}
              onClick={() => onModelSelect(model.value)}
              className={cn(
                "ec-pressable ec-motion ec-motion-soft flex min-h-12 items-center justify-center rounded-xl px-3 py-2 text-center text-xs font-medium leading-tight transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70 sm:min-h-14 sm:text-base",
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
    ? "M12 47 C16 40 24 36 36 36 H62 L70 45 H104 C109 45 113 49 114 54 L109 59 H18 C13 59 10 55 11 51 Z"
    : isSports
      ? "M9 48 C19 39 35 35 55 35 H80 C94 35 106 43 112 54 L107 59 H17 C11 59 8 55 9 48 Z"
      : isConvertible
        ? "M11 49 C22 40 35 36 55 36 H80 C96 36 107 44 113 55 L108 59 H18 C12 59 9 55 11 49 Z"
        : isMpv
          ? "M10 48 C13 36 25 28 43 27 H79 C96 28 108 41 114 55 L109 60 H17 C12 60 9 55 10 48 Z"
          : isWagon
            ? "M10 48 C15 37 28 31 45 31 H83 C98 32 109 43 114 55 L109 60 H17 C12 60 9 55 10 48 Z"
            : isSuv
              ? "M10 48 C14 36 27 30 45 30 H80 C97 31 109 43 114 55 L109 60 H17 C12 60 9 55 10 48 Z"
              : isHatchback
                ? "M11 48 C18 38 31 33 49 33 H79 L108 54 L104 59 H18 C12 59 9 55 11 48 Z"
                : "M10 48 C18 38 33 33 52 33 H82 C98 34 109 44 114 55 L109 60 H17 C12 60 9 55 10 48 Z";

  const roofPath = isPickup
    ? "M36 36 L46 24 H64 L75 45 H59 L54 34 H39 Z"
    : isSports
      ? "M41 35 L53 27 H72 L86 36 H68 L63 32 H52 L47 36 Z"
      : isConvertible
        ? "M44 36 H76"
        : isMpv
          ? "M39 28 L50 15 H80 C90 18 99 31 103 45 H44 Z"
          : isWagon
            ? "M39 31 L51 18 H81 L96 45 H44 Z"
            : isSuv
              ? "M39 30 L52 17 H80 L96 45 H44 Z"
              : isHatchback
                ? "M40 33 L53 20 H77 L94 46 H45 Z"
                : "M40 33 L52 20 H76 L91 46 H45 Z";

  const rearWheelX = isPickup ? 36 : isSports || isConvertible ? 34 : 35;
  const frontWheelX = isPickup ? 91 : isHatchback ? 88 : 90;

  return (
    <svg viewBox="0 0 120 72" role="img" aria-hidden="true" className="h-6 w-10 sm:h-12 sm:w-[70px]">
      <ellipse cx="61" cy="62" rx="48" ry="5" fill="#94a3b8" opacity="0.32" />
      <path d={bodyPath} fill="#0ea5e9" stroke="#075985" strokeWidth="2.2" strokeLinejoin="round" />
      <path
        d={roofPath}
        fill={isConvertible ? "none" : "#e5f8ff"}
        stroke="#075985"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M19 47 C39 41 80 41 105 51" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" opacity="0.58" />
      {!isConvertible && <path d="M59 22 V45 M78 23 V46" stroke="#93e2ff" strokeWidth="2" opacity="0.86" />}
      {isPickup && <path d="M72 46 H103" stroke="#dff7ff" strokeWidth="2.4" strokeLinecap="round" />}
      {isConvertible && <path d="M45 36 C55 30 67 30 78 36" stroke="#075985" strokeWidth="2.4" strokeLinecap="round" />}
      <path d="M16 50 H28" stroke="#bae6fd" strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
      <path d="M104 51 H113" stroke="#fef3c7" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx={rearWheelX} cy="59" r="8.5" fill="#0f172a" />
      <circle cx={frontWheelX} cy="59" r="8.5" fill="#0f172a" />
      <circle cx={rearWheelX} cy="59" r="3.5" fill="#e2e8f0" />
      <circle cx={frontWheelX} cy="59" r="3.5" fill="#e2e8f0" />
      <path d="M24 54 H101" stroke="#0369a1" strokeWidth="2" strokeLinecap="round" opacity="0.72" />
    </svg>
  );
}

function BodyTypeMark({ option }: { option: BodyTypeOption }) {
  const isOtherBodyType = getBodyTypeKey(option.value) === "other";

  return (
    <span className="ec-mark-motion flex h-8 w-12 items-center justify-center overflow-hidden bg-transparent dark:bg-transparent sm:h-[72px] sm:w-[96px]">
      {isOtherBodyType ? (
        <span className="grid h-5 w-5 grid-cols-2 gap-1 sm:h-9 sm:w-9 sm:gap-1.5" aria-hidden="true">
          {[0, 1, 2, 3].map((item) => (
            <span key={item} className="rounded-[3px] bg-[#087cc1] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]" />
          ))}
        </span>
      ) : option.imageSrc ? (
        (() => {
          const src = option.imageSrc;
          const isRemote = typeof src === "string" && /^https?:\/\//i.test(src);

          if (isRemote) {
            return (
              <img
                src={src}
                alt=""
                aria-hidden="true"
                width={96}
                height={72}
                loading="lazy"
                className={cn(
                  "h-auto w-[40px] max-w-none select-none object-contain drop-shadow-[0_4px_6px_rgba(15,23,42,0.18)] sm:w-[76px]",
                  option.imageClassName
                )}
              />
            );
          }

          return (
            <Image
              src={src}
              alt=""
              width={96}
              height={72}
              sizes="(min-width: 640px) 76px, 40px"
              aria-hidden="true"
              className={cn(
                "h-auto w-[40px] max-w-none select-none object-contain drop-shadow-[0_4px_6px_rgba(15,23,42,0.18)] sm:w-[76px]",
                option.imageClassName
              )}
            />
          );
        })()
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
              {...(isActive ? { "aria-pressed": "true" as const } : { "aria-pressed": "false" as const })}
              onClick={() => onBodyTypeSelect(bodyType.value)}
              className={cn(
                "ec-pressable ec-motion ec-motion-soft group flex min-h-[58px] min-w-0 flex-col items-center justify-start gap-1 rounded-xl px-0 py-1 text-center transition sm:min-h-[122px] sm:gap-3 sm:px-2 sm:py-2",
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
            title: `${getCanonicalBrandName(vehicle.Brand) || ""} ${vehicle.Model || ""}`.trim() || "Vehicle",
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
        {...(isMenuOpen ? { "aria-expanded": "true" as const } : { "aria-expanded": "false" as const })}
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
  language,
  priority
}: {
  vehicle: Vehicle;
  onView: (id: string) => void;
  getImageUrl: (imageValue: unknown) => string | null;
  t: Translations;
  language: Language;
  priority?: boolean;
}) {
  const imageUrl = getImageUrl(vehicle.Image);
  const photoCount = getVehicleImageCount(vehicle.Images, vehicle.Image);
  const colorLabel = translateVehicleColor(vehicle.Color, language);

  const brandDisplay = getDisplayBrandName(vehicle.Brand);
  const modelDisplay = getDisplayModelName(vehicle.Model);

return (
    <div
      id={getVehicleListItemElementId(vehicle.VehicleId)}
      data-vehicle-list-item-id={vehicle.VehicleId}
      role="button"
      tabIndex={0}
      aria-label={`View ${brandDisplay || "vehicle"} ${modelDisplay || ""}`.trim()}
      onClick={() => onView(vehicle.VehicleId)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onView(vehicle.VehicleId);
      }}
      className="ec-motion ec-live-card group scroll-mt-24 cursor-pointer overflow-hidden rounded-md border border-slate-100 bg-white shadow-[0_3px_12px_rgba(0,0,0,0.08)] transition-all duration-150 hover:border-emerald-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] focus:outline-none focus:ring-2 focus:ring-emerald-400/40 active:scale-[0.98] dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-[0_16px_32px_rgba(2,6,23,0.45)] dark:hover:border-emerald-500/35 dark:hover:shadow-[0_20px_42px_rgba(2,6,23,0.62)] sm:rounded-xl sm:shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
        {imageUrl ? (
              <Image
                src={imageUrl}
                alt={`${brandDisplay} ${vehicle.Model}`}
              fill
              sizes="(max-width: 640px) 22vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, (max-width: 1536px) 20vw, 16vw"
              {...(priority ? { priority: true } : { loading: "lazy" as const })}
              unoptimized={shouldBypassNextImageOptimization(imageUrl)}
              className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none"
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
            <h3 className="break-words text-[10px] font-bold leading-tight text-slate-800 dark:text-slate-100 sm:text-base">
              {brandDisplay}
            </h3>
            <p className="truncate text-[8px] leading-tight text-slate-500 dark:text-slate-400 sm:text-xs">{modelDisplay}</p>
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
          {/* Color hidden on Vehicles list (Grid view) */}
          {false && vehicle.Color && (
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
          {/* Tax Type hidden on Vehicles list (Grid view) */}
          {false && vehicle.TaxType && (
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
  priority,
  language,
}: {
  vehicle: Vehicle;
  isAdmin: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (vehicle: Vehicle) => void;
  getImageUrl: (imageValue: unknown) => string | null;
  priority?: boolean;
  language: Language;
}) {
  const imageUrl = getImageUrl(vehicle.Image);
  const photoCount = getVehicleImageCount(vehicle.Images, vehicle.Image);

  const brandDisplay = getDisplayBrandName(vehicle.Brand);
  const modelDisplay = getDisplayModelName(vehicle.Model);

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
      aria-label={`View ${brandDisplay || (vehicle.Brand || "vehicle")} ${modelDisplay || ""}`.trim()}
      onClick={() => onView(vehicle.VehicleId)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onView(vehicle.VehicleId);
      }}
      className="ec-motion ec-motion-soft ec-live-card grid min-h-[74px] scroll-mt-24 cursor-pointer grid-cols-[92px_minmax(0,1fr)] overflow-hidden rounded-md border border-slate-100 bg-white shadow-[0_3px_12px_rgba(15,23,42,0.07)] transition-transform focus:outline-none focus:ring-2 focus:ring-emerald-400/40 active:scale-[0.99] dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-[0_14px_30px_rgba(2,6,23,0.45)] sm:min-h-[132px] sm:grid-cols-[164px_minmax(0,1fr)] sm:rounded-lg sm:shadow-[0_4px_16px_rgba(15,23,42,0.07)] lg:min-h-[154px] lg:grid-cols-[196px_minmax(0,1fr)]"
    >
      <div className="relative min-h-[74px] overflow-hidden bg-slate-100 dark:bg-slate-800 sm:min-h-[132px] lg:min-h-[154px]">
        <Car className="absolute inset-0 m-auto h-5 w-5 text-slate-300 dark:text-slate-600 sm:h-12 sm:w-12" aria-hidden="true" />
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={vehicle.Model || "Vehicle"}
            fill
            sizes="(max-width: 640px) 92px, (max-width: 1024px) 164px, 196px"
            {...(priority ? { priority: true } : { loading: "lazy" as const })}
            unoptimized={shouldBypassNextImageOptimization(imageUrl)}
            className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none"
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
            <h3 className="break-words text-[11px] font-bold leading-tight text-slate-900 dark:text-slate-100 sm:text-base sm:leading-snug lg:text-lg">
              {brandDisplay || "-"} {modelDisplay || "-"}
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

          {/* Color hidden on Vehicles list */}
          {false && vehicle.Color && (
            <div className="mt-1.5 flex items-center gap-2">
              <span
                className="h-4 w-4 rounded-full border border-slate-200 shadow-sm dark:border-slate-600"
                style={{ backgroundColor: getVehicleColorHex(vehicle.Color) }}
                title={translateVehicleColor(vehicle.Color, language)}
              />
              <span className="truncate text-[10px] font-medium text-slate-700 dark:text-slate-300">
                {translateVehicleColor(vehicle.Color, language)}
              </span>
            </div>
          )}
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
  const [isMobileVehicleViewport, setIsMobileVehicleViewport] = useState(detectMobileVehicleViewport);
  const activeListHrefRef = useRef<string | null>(null);
  const pendingListScrollRestoreRef = useRef<VehicleListScrollSnapshot | null>(null);
  const userSelectedViewModeRef = useRef(Boolean(effectiveVehicleListSearchParams.get(VEHICLE_LIST_VIEW_PARAM)));
  const skipNextFilterPageResetRef = useRef(
    Boolean(
      activeVehicleListSearchParams.get(VEHICLE_LIST_PAGE_PARAM) ||
      activeVehicleListSearchParams.get(VEHICLE_LIST_FOCUS_PARAM)
    )
  );

  // ==========================================================================
  // State Management
  // ==========================================================================

  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    parseVehicleListViewParam(effectiveVehicleListSearchParams.get(VEHICLE_LIST_VIEW_PARAM))
  );
  const [currentPage, setCurrentPage] = useState(() => {
    const explicitPage = activeVehicleListSearchParams.get(VEHICLE_LIST_PAGE_PARAM);
    if (detectMobileVehicleViewport() && !explicitPage) return 1;
    return parseVehicleListPageParam(effectiveVehicleListSearchParams.get(VEHICLE_LIST_PAGE_PARAM));
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [showFilters, setShowFilters] = useState(false);
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [showAllModels, setShowAllModels] = useState(true);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTER_STATE,
    search: effectiveVehicleListSearchParams.get("search") ?? DEFAULT_FILTER_STATE.search,
    condition: effectiveVehicleListSearchParams.get("condition") ?? DEFAULT_FILTER_STATE.condition,
    brand: effectiveVehicleListSearchParams.get("brand") ?? DEFAULT_FILTER_STATE.brand,
    model: effectiveVehicleListSearchParams.get("model") ?? DEFAULT_FILTER_STATE.model,
    year: effectiveVehicleListSearchParams.get("year") ?? DEFAULT_FILTER_STATE.year,
    plate: effectiveVehicleListSearchParams.get("plate") ?? DEFAULT_FILTER_STATE.plate,
    bodyType: effectiveVehicleListSearchParams.get("bodyType") ?? DEFAULT_FILTER_STATE.bodyType,
    minPrice: effectiveVehicleListSearchParams.get("minPrice") ?? DEFAULT_FILTER_STATE.minPrice,
    maxPrice: effectiveVehicleListSearchParams.get("maxPrice") ?? DEFAULT_FILTER_STATE.maxPrice,
    taxType: effectiveVehicleListSearchParams.get("taxType") ?? DEFAULT_FILTER_STATE.taxType,
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
    filters,
    quickFilter,
  });

  useEffect(() => {
    filterResetValuesRef.current = {
      filters,
      quickFilter,
    };
  }, [filters, quickFilter]);

  // Sorting
  const [sortField, setSortField] = useState<keyof Vehicle>("Time");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Group By
  const [groupBy, setGroupBy] = useState<GroupByOption>(() =>
    parseVehicleGroupByParam(effectiveVehicleListSearchParams.get("groupBy"))
  );

  const itemsPerPage = isMobileVehicleViewport ? MOBILE_ITEMS_PER_PAGE : DEFAULT_ITEMS_PER_PAGE;

  // Refs for click outside
  const infiniteScrollSentinelRef = useRef<HTMLDivElement>(null);
  const searchBlurTimerRef = useRef<number | null>(null);

  // Add Vehicle Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [isVehicleSearchFocused, setIsVehicleSearchFocused] = useState(false);

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
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const syncMobileViewport = () => setIsMobileVehicleViewport(mobileQuery.matches);

    syncMobileViewport();
    mobileQuery.addEventListener("change", syncMobileViewport);
    return () => mobileQuery.removeEventListener("change", syncMobileViewport);
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

  const shouldUseMobileVehicleFetch = isMobileVehicleViewport || isMobileSafeMode;
  const { vehicles, meta, loading, error, refresh, isValidating } = useVehiclesNeon({
    limit: shouldUseMobileVehicleFetch ? MOBILE_INITIAL_VEHICLE_FETCH_LIMIT : DESKTOP_VEHICLE_FETCH_LIMIT,
    backgroundLoadAll: shouldUseMobileVehicleFetch,
    backgroundPageSize: MOBILE_BACKGROUND_VEHICLE_FETCH_LIMIT,
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
      const currentFilters = filterResetValuesRef.current.filters;
      const nextFilters: FilterState = {
        ...currentFilters,
        hasImage: isTruthyQueryParam(noImageParam) ? "no" : "",
      };
      const filterParamKeys = [
        "search",
        "condition",
        "brand",
        "model",
        "year",
        "plate",
        "bodyType",
        "minPrice",
        "maxPrice",
        "taxType",
      ] as const;

      for (const key of filterParamKeys) {
        if (effectiveVehicleListSearchParams.has(key)) {
          nextFilters[key] = effectiveVehicleListSearchParams.get(key) ?? DEFAULT_FILTER_STATE[key];
        }
      }

      const nextGroupBy = parseVehicleGroupByParam(effectiveVehicleListSearchParams.get("groupBy"));
      const isMobileVehicleList = detectMobileVehicleViewport();
      const explicitPageParam = activeVehicleListSearchParams.get(VEHICLE_LIST_PAGE_PARAM);
      const explicitFocusParam = activeVehicleListSearchParams.get(VEHICLE_LIST_FOCUS_PARAM);
      const viewModeParam = effectiveVehicleListSearchParams.get(VEHICLE_LIST_VIEW_PARAM);
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
      if (nextQuickFilter) {
        nextFilters.category = DEFAULT_FILTER_STATE.category;
      } else if (categoryParam) {
        nextFilters.category = categoryParam;
      }

      const willUpdateFilterState =
        Object.keys(nextFilters).some((key) => (
          filterResetValuesRef.current.filters[key as keyof FilterState] !== nextFilters[key as keyof FilterState]
        )) ||
        filterResetValuesRef.current.quickFilter !== nextQuickFilter;

      if (hasPositionQuery && willUpdateFilterState) {
        skipNextFilterPageResetRef.current = true;
      }

      setFilters(prev =>
        Object.keys(nextFilters).every((key) => (
          prev[key as keyof FilterState] === nextFilters[key as keyof FilterState]
        ))
          ? prev
          : nextFilters
      );

      setQuickFilter(prev => (prev === nextQuickFilter ? prev : nextQuickFilter));

      setGroupBy(prev => (prev === nextGroupBy ? prev : nextGroupBy));
      if (viewModeParam) {
        userSelectedViewModeRef.current = true;
        setViewMode(prev => (prev === nextViewMode ? prev : nextViewMode));
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

  // Brand “big text” casing (must preserve acronyms like BMW/BYD/etc).
  // Reuse the central brand display logic.
  const displayCanonicalBrand = useCallback((brand: unknown) => {
    return getDisplayBrandName(brand);
  }, []);


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
    if (groupBy === "brand") return displayCanonicalBrand(value);
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

  const searchSuggestionVehicles = useMemo(() => {
    const searchTerms = filters.search
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (searchTerms.join("").length < 2) return [];

    const matches: Vehicle[] = [];

    for (const vehicle of vehicles) {
      const searchableText = [
        vehicle.Brand,
        vehicle.Model,
        vehicle.Plate,
        vehicle.Category,
        vehicle.Year?.toString(),
        vehicle.Color,
      ].filter(Boolean).join(" ").toLowerCase();

      if (!searchTerms.every((term) => searchableText.includes(term))) continue;

      matches.push(vehicle);
      if (matches.length >= 6) break;
    }

    return matches;
  }, [filters.search, vehicles]);

  const showVehicleSearchSuggestions =
    isVehicleSearchFocused &&
    filters.search.trim().length >= 2 &&
    (searchSuggestionVehicles.length > 0 || fuzzySuggestions.length > 0);

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
    if (isTextEntryElement(document.activeElement)) return;

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

  useEffect(() => {
    return () => {
      if (searchBlurTimerRef.current !== null) {
        window.clearTimeout(searchBlurTimerRef.current);
      }
    };
  }, []);

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
    const filterQueryValues: Array<[string, string]> = [
      ["search", filters.search.trim()],
      ["condition", filters.condition !== "all" ? filters.condition : ""],
      ["brand", filters.brand.trim()],
      ["model", filters.model.trim()],
      ["year", filters.year.trim()],
      ["plate", filters.plate.trim()],
      ["bodyType", filters.bodyType.trim()],
      ["minPrice", filters.minPrice.trim()],
      ["maxPrice", filters.maxPrice.trim()],
      ["taxType", filters.taxType.trim()],
    ];

    for (const [key, value] of filterQueryValues) {
      nextParams.delete(key);
      if (value) nextParams.set(key, value);
    }

    if (quickFilter) {
      nextParams.set("category", quickFilter);
    } else if (filters.category !== "all") {
      nextParams.set("category", filters.category);
    } else {
      nextParams.set("category", "all");
    }

    if (filters.hasImage === "no") {
      nextParams.set("withoutImage", "1");
      nextParams.delete("noImage");
    } else {
      nextParams.delete("withoutImage");
      nextParams.delete("noImage");
    }

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
  }, [currentPage, currentVehicleListSearchParams, filters, quickFilter, viewMode]);

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
    rememberVehicleListViewMode(nextViewMode);
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
      search: "",
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
      search: "",
      model: getModelKey(prev.model) === getModelKey(model) ? "" : model,
    }));
    resetVisibleVehicleBatch();
  }, [preserveVehicleListScrollForUpdate, resetVisibleVehicleBatch]);

  const handleVehicleSearchChange = useCallback((value: string) => {
    const nextSearch = value;
    const shouldClearLogoFilters = nextSearch.trim().length > 0;

    setFilters(prev => {
      const nextFilters = {
        ...prev,
        search: nextSearch,
        ...(shouldClearLogoFilters ? { brand: "", model: "" } : {}),
      };

      return (
        prev.search === nextFilters.search &&
        prev.brand === nextFilters.brand &&
        prev.model === nextFilters.model
      )
        ? prev
        : nextFilters;
    });
  }, []);

  const handleVehicleSearchClear = useCallback(() => {
    handleVehicleSearchChange("");
    setIsVehicleSearchFocused(false);
    resetVisibleVehicleBatch();

    if (!effectiveVehicleListSearchParams.has("search")) return;

    const nextParams = new URLSearchParams(currentVehicleListSearchParams.toString());
    nextParams.delete("search");
    nextParams.delete(VEHICLE_LIST_PAGE_PARAM);
    nextParams.delete(VEHICLE_LIST_FOCUS_PARAM);
    navigateVehicleListInPlace(getVehicleListUrl(nextParams), "replace");
  }, [
    currentVehicleListSearchParams,
    effectiveVehicleListSearchParams,
    getVehicleListUrl,
    handleVehicleSearchChange,
    navigateVehicleListInPlace,
    resetVisibleVehicleBatch,
  ]);

  const applyVehicleSuggestionSearch = useCallback((vehicle: Vehicle) => {
    const suggestedSearch = getVehicleSuggestionSearchText(vehicle);
    if (!suggestedSearch) return;

    handleVehicleSearchChange(suggestedSearch);
    setIsVehicleSearchFocused(false);
    resetVisibleVehicleBatch();

    const nextParams = new URLSearchParams(currentVehicleListSearchParams.toString());
    nextParams.set("search", suggestedSearch);
    nextParams.delete("brand");
    nextParams.delete("model");
    nextParams.delete(VEHICLE_LIST_PAGE_PARAM);
    nextParams.delete(VEHICLE_LIST_FOCUS_PARAM);
    navigateVehicleListInPlace(getVehicleListUrl(nextParams), "replace");
  }, [
    currentVehicleListSearchParams,
    getVehicleListUrl,
    handleVehicleSearchChange,
    navigateVehicleListInPlace,
    resetVisibleVehicleBatch,
  ]);

  const handleVehicleSearchFocus = useCallback(() => {
    if (searchBlurTimerRef.current !== null) {
      window.clearTimeout(searchBlurTimerRef.current);
      searchBlurTimerRef.current = null;
    }
    setIsVehicleSearchFocused(true);
  }, []);

  const handleVehicleSearchBlur = useCallback(() => {
    if (searchBlurTimerRef.current !== null) {
      window.clearTimeout(searchBlurTimerRef.current);
    }

    searchBlurTimerRef.current = window.setTimeout(() => {
      searchBlurTimerRef.current = null;
      setIsVehicleSearchFocused(false);
    }, 160);
  }, []);

  useEffect(() => {
    if (!selectedBrandName) return;

    const handleMobileBackRequest = (event: Event) => {
      event.preventDefault();
      handleBackToBrands();
    };

    window.addEventListener(MOBILE_BACK_REQUEST_EVENT, handleMobileBackRequest);

    return () => {
      window.removeEventListener(MOBILE_BACK_REQUEST_EVENT, handleMobileBackRequest);
    };
  }, [handleBackToBrands, selectedBrandName]);

  const handleBodyTypeSelect = useCallback((bodyType: string) => {
    preserveVehicleListScrollForUpdate();
    setFilters(prev => ({
      ...prev,
      bodyType: getBodyTypeKey(prev.bodyType) === getBodyTypeKey(bodyType) ? "" : bodyType,
    }));
    resetVisibleVehicleBatch();
  }, [preserveVehicleListScrollForUpdate, resetVisibleVehicleBatch]);

  const resetFilters = () => {
    setFilters({
      ...DEFAULT_FILTER_STATE,
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
              <div className="relative flex-1">
                <NeuInput
                  value={filters.search}
                  onChange={handleVehicleSearchChange}
                  onClear={handleVehicleSearchClear}
                  onFocus={handleVehicleSearchFocus}
                  onBlur={handleVehicleSearchBlur}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    setIsVehicleSearchFocused(false); // hide suggestions
                    resetVisibleVehicleBatch(); // apply/refresh visible results
                  }}
                  placeholder={t.searchByBrandModel}
                  icon={Search}
                  autoComplete="off"
                  enterKeyHint="search"
                  inputMode="search"
                  clearLabel="Clear search"
                />
                {showVehicleSearchSuggestions && (
                  <div className="ec-popover-in absolute left-0 right-0 top-[calc(100%+0.35rem)] z-[950] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ring-1 ring-slate-900/5 dark:border-slate-800 dark:bg-slate-900 dark:ring-white/10">
                    {searchSuggestionVehicles.length === 0 && fuzzySuggestions.length > 0 && (
                      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2 text-xs font-semibold text-emerald-700 dark:border-slate-800 dark:text-emerald-300">
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                        Recommended matches
                      </div>
                    )}
                    <div className="max-h-80 overflow-y-auto overscroll-contain py-1">
                      {(searchSuggestionVehicles.length > 0
                        ? searchSuggestionVehicles.map((vehicle) => ({ vehicle, score: null }))
                        : fuzzySuggestions.map((suggestion) => ({ vehicle: suggestion.vehicle, score: suggestion.score }))
                      ).map(({ vehicle, score }, index) => {
                        const canonicalBrand = displayCanonicalBrand(vehicle.Brand) || "";
                        const suggestedLabel = `${canonicalBrand} ${vehicle.Model || ""}`.trim();
                        const fallbackSuggestedText = `${canonicalBrand} ${vehicle.Model || ""}`.trim() || getVehicleSuggestionSearchText(vehicle);

                        return (
                          <button
                            key={`${vehicle.VehicleId}-${index}`}
                            type="button"
                            onPointerDown={(event) => event.preventDefault()}
                            onClick={() => {
                              applyVehicleSuggestionSearch(vehicle);
                            }}
                            className="ec-pressable ec-row-motion flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-emerald-50 active:bg-emerald-100 dark:hover:bg-emerald-500/10 dark:active:bg-emerald-500/15"
                          >
                            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                              <Car className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                                {suggestedLabel || fallbackSuggestedText || "Vehicle"}
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                                {score === null
                                  ? ([vehicle.Category, vehicle.Year, vehicle.Plate].filter(Boolean).join(" - ") || vehicle.VehicleId)
                                  : `Close match ${Math.round(score * 100)}%`}
                              </span>
                            </span>
                            <ChevronDown className="h-4 w-4 flex-shrink-0 -rotate-90 text-slate-300 dark:text-slate-600" aria-hidden="true" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
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
                  {group.vehicles.map((vehicle, index) => (
                    <VehicleCard
                      key={vehicle.VehicleId}
                      vehicle={vehicle}
                      onView={handleView}
                      getImageUrl={getVehicleImageUrl}
                      t={t}
                      language={language}
                      priority={index < 4}
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
                  {group.vehicles.map((vehicle, index) => (
                    <MobileVehicleListCard
                      key={vehicle.VehicleId}
                      vehicle={vehicle}
                      isAdmin={isAdmin}
                      onView={handleView}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      getImageUrl={getVehicleImageUrl}
                      priority={index < 2}
                      language={language}
                    />
                  ))}
                </div>

                <div className="hidden overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-[0_18px_40px_rgba(2,6,23,0.5)]">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 z-10">
                        <tr className="border-b border-slate-200 bg-slate-50/95 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/95">
                          {DEFAULT_TABLE_COLUMNS.map((col) => (
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

                            <td className="px-4 py-3.5">
                              <span className={cn(
                                "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium",
                                getCategoryBadgeClass(vehicle.Category)
                              )}>
                                {vehicle.Category}
                              </span>
                            </td>

                            <td className="px-4 py-3.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{displayCanonicalBrand(vehicle.Brand)}</td>

                            <td className="px-4 py-3.5 text-sm text-slate-700 dark:text-slate-300">{getDisplayModelName(vehicle.Model)}</td>

                            <td className="px-4 py-3.5 text-sm font-medium text-slate-600 dark:text-slate-300">{vehicle.Year || "-"}</td>

                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                                {vehicle.Plate || "-"}
                              </span>
                            </td>

                            <td className="px-4 py-3.5 text-sm font-bold text-emerald-600">
                              ${vehicle.PriceNew?.toLocaleString() || "-"}
                            </td>

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
                {filters.search.trim().length >= 2 && fuzzySuggestions.length > 0 ? (
                  <SearchSuggestions
                    suggestions={fuzzySuggestions}
                    searchTerm={filters.search}
                    onSelect={(suggestion) => {
                      applyVehicleSuggestionSearch(suggestion.vehicle);
                    }}
                  />
                ) : (
                  <div className="rounded-2xl border border-slate-100 bg-white px-6 py-12 text-center shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-[0_18px_40px_rgba(2,6,23,0.5)]">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800">
                      {isInitialVehiclesLoad ? (
                        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
                      ) : (
                        <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                    <h3 className="mb-1 text-lg font-semibold text-slate-700 dark:text-slate-100">
                      {isInitialVehiclesLoad
                        ? "Loading Vehicles"
                        : filters.search.trim().length >= 2
                          ? "No close matches"
                          : t.noVehiclesFound}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {isInitialVehiclesLoad
                        ? "Your VMS data will appear here as soon as it finishes loading."
                        : filters.search.trim().length >= 2
                          ? "Try a shorter brand, model, plate number, or clear filters."
                          : t.tryAdjustingFilters}
                    </p>
                  </div>
                )}
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
