"use client";

import { useLanguage } from "@/lib/LanguageContext";
import { useTranslation, type Translations } from "@/lib/i18n";
import { useAuthUser } from "@/app/components/AuthContext";
import { getQuickFilterCategory } from "@/lib/categoryMapping";
import AddVehicleModal from "@/app/components/vehicles/AddVehicleModal";

import { ConfirmDeleteModal } from "@/app/components/vehicles/ConfirmDeleteModal";

import { useDeleteVehicle } from "@/app/components/vehicles/useDeleteVehicle";
import { useToast } from "@/components/ui/glass/GlassToast";
import { driveThumbnailUrl, extractDriveFileId } from "@/lib/drive";
import type { Vehicle } from "@/lib/types";
import { cn } from "@/lib/ui";
import { useVehiclesNeon, useVehicleStats } from "@/lib/useVehiclesNeon";
import { getFuzzySuggestions, type FuzzySuggestion } from "@/lib/fuzzySearch";
import SearchSuggestions from "@/components/SearchSuggestions";
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
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  X
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
type GroupByOption = "none" | "category" | "brand" | "year" | "condition" | "color";

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

// ============================================================================
// TukTuk Icon Component - From Sidebar Menu (IconTukTuk)
// ============================================================================

function TukTukIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 16v-3a2 2 0 0 1 2-2h8l3 3v3" />
      <path d="M14 13V9a2 2 0 0 1 2-2h2" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

// ============================================================================
// UI Components
// ============================================================================

function NeuCard({ 
  children, 
  className, 
  hover = true, 
  active = false, 
  onClick 
}: { 
  children: React.ReactNode; 
  className?: string; 
  hover?: boolean; 
  active?: boolean; 
  onClick?: () => void;
}) {
  return (
    <div 
      onClick={onClick} 
      className={cn(
        "bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] rounded-2xl transition-all duration-300",
        active 
          ? "shadow-[inset_4px_4px_8px_#cbd5e1,inset_-4px_-4px_8px_#ffffff]" 
          : "shadow-[6px_6px_12px_#cbd5e1,-6px_-6px_12px_#ffffff]",
        hover && !active && "hover:shadow-[8px_8px_16px_#cbd5e1,-8px_-8px_16px_#ffffff] hover:-translate-y-0.5",
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
      "bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] text-slate-600",
      "shadow-[4px_4px_8px_#cbd5e1,-4px_-4px_8px_#ffffff]",
      "hover:shadow-[6px_6px_12px_#cbd5e1,-6px_-6px_12px_#ffffff]",
      "active:shadow-[inset_3px_3px_6px_#cbd5e1,inset_-3px_-3px_6px_#ffffff]",
      "transition-all duration-200"
    ),
    primary: cn(
      "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white",
      "shadow-[4px_4px_8px_#cbd5e1,-4px_-4px_8px_#ffffff,0_4px_15px_rgba(16,185,129,0.3)]",
      "hover:shadow-[6px_6px_12px_#cbd5e1,-6px_-6px_12px_#ffffff,0_6px_20px_rgba(16,185,129,0.4)]",
      "hover:from-emerald-600 hover:to-emerald-700",
      "active:scale-[0.98]",
      "transition-all duration-200"
    ),
    secondary: cn(
      "bg-gradient-to-r from-blue-500 to-blue-600 text-white",
      "shadow-[4px_4px_8px_#cbd5e1,-4px_-4px_8px_#ffffff,0_4px_15px_rgba(59,130,246,0.3)]",
      "hover:shadow-[6px_6px_12px_#cbd5e1,-6px_-6px_12px_#ffffff,0_6px_20px_rgba(59,130,246,0.4)]",
      "hover:from-blue-600 hover:to-blue-700",
      "active:scale-[0.98]",
      "transition-all duration-200"
    ),
    danger: cn(
      "bg-gradient-to-r from-red-500 to-red-600 text-white",
      "shadow-[4px_4px_8px_#cbd5e1,-4px_-4px_8px_#ffffff,0_4px_15px_rgba(239,68,68,0.3)]",
      "hover:shadow-[6px_6px_12px_#cbd5e1,-6px_-6px_12px_#ffffff,0_6px_20px_rgba(239,68,68,0.4)]",
      "hover:from-red-600 hover:to-red-700",
      "active:scale-[0.98]",
      "transition-all duration-200"
    ),
    ghost: cn(
      "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50",
      "transition-all duration-200"
    )
  };

  return (
    <button 
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
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />}
      <input 
        type={type} 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        placeholder={placeholder} 
        className={cn(
          "w-full bg-white rounded-2xl transition-all duration-200",
          "shadow-[4px_4px_8px_#e2e8f0,-4px_-4px_8px_#ffffff]",
          "focus:shadow-[6px_6px_12px_#e2e8f0,-6px_-6px_12px_#ffffff]",
          "focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40",
          "text-slate-700 placeholder-slate-400 outline-none",
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
      light: "bg-emerald-100", 
      text: "text-emerald-700", 
      shadow: "shadow-emerald-500/30", 
      glow: "shadow-emerald-500/50",
      ring: "ring-emerald-200"
    },
    blue: { 
      gradient: "from-blue-500 via-blue-600 to-blue-700", 
      bg: "bg-blue-500", 
      light: "bg-blue-100", 
      text: "text-blue-700", 
      shadow: "shadow-blue-500/30", 
      glow: "shadow-blue-500/50",
      ring: "ring-blue-200"
    },
    purple: { 
      gradient: "from-purple-500 via-purple-600 to-purple-700", 
      bg: "bg-purple-500", 
      light: "bg-purple-100", 
      text: "text-purple-700", 
      shadow: "shadow-purple-500/30", 
      glow: "shadow-purple-500/50",
      ring: "ring-purple-200"
    },
    orange: { 
      gradient: "from-orange-500 via-orange-600 to-orange-700", 
      bg: "bg-orange-500", 
      light: "bg-orange-100", 
      text: "text-orange-700", 
      shadow: "shadow-orange-500/30", 
      glow: "shadow-orange-500/50",
      ring: "ring-orange-200"
    },
    slate: { 
      gradient: "from-slate-500 via-slate-600 to-slate-700", 
      bg: "bg-slate-500", 
      light: "bg-slate-100", 
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
          : cn("bg-white/80 border-white/60 hover:bg-white/95 hover:shadow-xl hover:shadow-slate-200/50 hover:scale-[1.02] hover:-translate-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.05)]"),
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
          "flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300",
          active 
            ? "bg-white/20 shadow-inner" 
            : cn("bg-gradient-to-br shadow-md", colors.light, "group-hover:shadow-lg group-hover:scale-110")
        )}>
          <Icon className={cn("w-6 h-6 transition-all duration-300", active ? "text-white" : colors.text)} />
        </div>
        {active && <CheckCircle2 className="w-5 h-5 text-white/80" />}
      </div>
      
      <div className="relative w-full text-left">
        <div className={cn(
          "text-3xl font-bold tracking-tight transition-all duration-300",
          active ? "text-white" : "text-slate-800"
        )}>
          <AnimatedCounter value={count} duration={800 + index * 100} />
        </div>
        <div className={cn(
          "text-sm font-medium transition-all duration-300",
          active ? "text-white/80" : "text-slate-500"
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
    <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff]">
      <button
        onClick={() => onChange("grid")}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
          view === "grid"
            ? "bg-white text-emerald-600 shadow-[2px_2px_4px_#cbd5e1,-2px_-2px_4px_#ffffff]"
            : "text-slate-500 hover:text-slate-700"
        )}
      >
        <Grid3X3 className="w-4 h-4" />
        <span className="hidden sm:inline">{t.grid}</span>
      </button>
      <button
        onClick={() => onChange("list")}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
          view === "list"
            ? "bg-white text-emerald-600 shadow-[2px_2px_4px_#cbd5e1,-2px_-2px_4px_#ffffff]"
            : "text-slate-500 hover:text-slate-700"
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
      <span className={cn("font-medium transition-colors", mode === "all" ? "text-slate-800" : "text-slate-500")}>
        All-time
      </span>
      <button
        onClick={() => onChange(mode === "all" ? "filtered" : "all")}
        className={cn(
          "relative w-12 h-6 rounded-full transition-colors duration-300 shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff]",
          mode === "filtered" ? "bg-emerald-500" : "bg-slate-200"
        )}
      >
        <span
          className={cn(
            "absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300",
            mode === "filtered" ? "translate-x-6" : "translate-x-0"
          )}
        />
      </button>
      <span className={cn("font-medium transition-colors", mode === "filtered" ? "text-slate-800" : "text-slate-500")}>
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
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100 shadow-sm">
      <span className="text-emerald-500">{label}:</span>
      <span className="font-semibold">{value}</span>
      <button 
        onClick={onRemove} 
        className="ml-1 p-0.5 rounded-full hover:bg-emerald-200 text-emerald-600 hover:text-emerald-800 transition-colors"
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
    default: "text-slate-500 hover:text-emerald-600 hover:ring-emerald-200",
    edit: "text-slate-500 hover:text-blue-600 hover:ring-blue-200",
    delete: "text-slate-500 hover:text-red-600 hover:ring-red-200"
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className={cn(
        "group relative flex items-center justify-center w-9 h-9 rounded-xl bg-white",
        "shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)]",
        "hover:scale-105 active:scale-95 transition-all duration-200",
        "ring-1 ring-slate-100",
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
  t
}: { 
  vehicle: Vehicle; 
  isAdmin: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (vehicle: Vehicle) => void;
  getImageUrl: (imageValue: string | undefined) => string | null;
  t: Translations;
}) {
  const getCategoryColor = (category: string) => {
    const cat = category?.toLowerCase() || "";
    if (cat.includes("car")) return "bg-blue-50 text-blue-700 ring-blue-100";
    if (cat.includes("motor") || cat.includes("bike")) return "bg-purple-50 text-purple-700 ring-purple-100";
    if (cat.includes("tuk") || cat.includes("rickshaw")) return "bg-orange-50 text-orange-700 ring-orange-100";
    return "bg-slate-50 text-slate-700 ring-slate-100";
  };

  const getConditionColor = (condition: string) => {
    return condition?.toLowerCase() === "new"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : "bg-amber-50 text-amber-700 ring-amber-200";
  };

  const imageUrl = getImageUrl(vehicle.Image);

  return (
    <div className="group bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-300 overflow-hidden border border-slate-100 hover:border-emerald-200">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
{imageUrl ? (
            <img 
              src={imageUrl} 
              alt={`${vehicle.Brand} ${vehicle.Model}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                console.warn('[Image onError]', imageUrl);
                (e.target as HTMLImageElement).src = '/placeholder-car.svg';
              }}
            />
          ) : (
            <img 
              src="/placeholder-car.svg"
              alt="No image"
              className="w-full h-full object-cover opacity-20"
            />
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
            <h3 className="font-bold text-slate-800 text-lg">{vehicle.Brand}</h3>
            <p className="text-slate-500 text-sm">{vehicle.Model}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-emerald-600 text-lg">
              ${vehicle.PriceNew?.toLocaleString() || "-"}
            </p>
            <p className="text-slate-400 text-xs">{t.marketPrice}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="text-slate-400">{t.year}:</span>
            <span className="font-medium">{vehicle.Year || "-"}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <span className="text-slate-400">{t.plate}:</span>
            <span className="font-medium font-mono">{vehicle.Plate || "-"}</span>
          </div>
          {vehicle.Color && (
            <div className="flex items-center gap-2 text-slate-600">
              <span className="text-slate-400">{t.color}:</span>
              <span 
                className="w-4 h-4 rounded-full border border-slate-200"
                style={{ backgroundColor: vehicle.Color.toLowerCase() }}
              />
              <span className="font-medium">{vehicle.Color}</span>
            </div>
          )}
          {vehicle.TaxType && (
            <div className="flex items-center gap-2 text-slate-600">
              <span className="text-slate-400">{t.taxType}:</span>
              <span className="font-medium">{vehicle.TaxType}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
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

// ============================================================================
// Loading Skeleton Component
// ============================================================================

function LoadingSkeleton({ view }: { view: ViewMode }) {
  if (view === "grid") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div 
            key={i} 
            className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden border border-slate-100"
          >
            <div className="aspect-[4/3] bg-slate-200 animate-pulse" />
            <div className="p-4 space-y-3">
              <div className="h-5 bg-slate-200 rounded animate-pulse w-2/3" />
              <div className="h-4 bg-slate-200 rounded animate-pulse w-1/2" />
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="h-4 bg-slate-200 rounded animate-pulse" />
                <div className="h-4 bg-slate-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden border border-slate-100">
      <div className="h-14 bg-slate-50 border-b border-slate-100" />
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-16 border-b border-slate-100 last:border-0 flex items-center px-6 gap-4">
          <div className="w-12 h-12 bg-slate-200 rounded-xl animate-pulse" />
          <div className="flex-1 h-4 bg-slate-200 rounded animate-pulse" />
          <div className="w-24 h-4 bg-slate-200 rounded animate-pulse" />
          <div className="w-24 h-4 bg-slate-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
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

  // ==========================================================================
  // State Management
  // ==========================================================================
  
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [totalsMode, setTotalsMode] = useState<TotalsMode>("all");
  const [currentPage, setCurrentPage] = useState(1);
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
    hasImage: "",
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
  const [groupBy, setGroupBy] = useState<GroupByOption>("none");

  // Items Per Page
  const [itemsPerPage, setItemsPerPage] = useState<number>(() => {
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

  // ==========================================================================
  // Data Fetching
  // ==========================================================================

  // Convert quick filter to category parameter for server-side filtering
  const categoryFilter = useMemo(() => {
    if (!quickFilter) return undefined;
    // Map quick filter values to category names that match the database
    switch (quickFilter) {
case "cars": return "Cars";
case "motorcycles": return "Motorcycles";
case "tuktuks": return "TukTuks";
      default: return undefined;
    }
  }, [quickFilter]);

  const { vehicles, meta, loading, error, refresh, isValidating } = useVehiclesNeon({
    // Keep a high limit even when quick category filters are active so counts and pagination
    // reflect the full matching dataset (e.g. Cars > 100).
    limit: 2000,
    category: categoryFilter,
    refreshInterval: 0,
  });

  const { stats, loading: statsLoading } = useVehicleStats(30000); // 30s refresh

  // Safe stats access with fallbacks (BUG FIX)
  const safeStats = useMemo(() => ({
    total: stats?.total || 0,
    cars: stats?.byCategory?.Cars || 0,
    motorcycles: stats?.byCategory?.Motorcycles || 0,
    tuktuks: stats?.byCategory?.TukTuks || 0,
  }), [stats]);

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
      if (categoryParam) {
        const normalized = categoryParam.toLowerCase();
        if (normalized.includes("car")) setQuickFilter("cars");
        else if (normalized.includes("motor")) setQuickFilter("motorcycles");
        else if (normalized.includes("tuk")) setQuickFilter("tuktuks");
      } else {
        setQuickFilter(null);
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
    const timeoutId = setTimeout(() => setCurrentPage(1), 0);
    return () => clearTimeout(timeoutId);
  }, [filters, quickFilter]);

  // Click outside to close menus
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
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
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showColumnMenu]);
  
  // ==========================================================================
  // Helper Functions
  // ==========================================================================
  
  const normalizeCategory = useCallback((cat: string | undefined): string => {
    return cat?.toLowerCase().trim() || "";
  }, []);

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

  const getGroupKey = (vehicle: Vehicle, groupBy: GroupByOption): string => {
    switch (groupBy) {
      case "category": return vehicle.Category || "Uncategorized";
      case "brand": return vehicle.Brand || "Unknown Brand";
      case "year": return vehicle.Year?.toString() || "Unknown Year";
      case "condition": return vehicle.Condition || "Unknown Condition";
      case "color": return vehicle.Color || "Unknown Color";
      default: return "All";
    }
  };

  const getGroupLabel = (key: string, groupBy: GroupByOption): string => {
    if (groupBy === "none") return "All Vehicles";
    if (!key || key === "undefined" || key === "null") {
      switch (groupBy) {
        case "category": return "Uncategorized";
        case "brand": return "Unknown Brand";
        case "year": return "Unknown Year";
        case "condition": return "Unknown Condition";
        case "color": return "Unknown Color";
      }
    }
    return key;
  };

  const groupVehicles = (vehicles: Vehicle[], groupBy: GroupByOption): GroupedVehicles[] => {
    if (groupBy === "none") {
      return [{
        key: "all",
        label: "All Vehicles",
        count: vehicles.length,
        avgPrice: vehicles.reduce((sum, v) => sum + (v.PriceNew || 0), 0) / (vehicles.length || 1),
        vehicles
      }];
    }

    const groups = new Map<string, Vehicle[]>();
    
    vehicles.forEach(vehicle => {
      const key = getGroupKey(vehicle, groupBy);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(vehicle);
    });

    // Sort groups alphabetically or numerically
    const sortedEntries = Array.from(groups.entries()).sort((a, b) => {
      if (groupBy === "year") {
        return parseInt(b[0]) - parseInt(a[0]); // Descending for years
      }
      return a[0].localeCompare(b[0]);
    });

    return sortedEntries.map(([key, groupVehicles]) => ({
      key,
      label: getGroupLabel(key, groupBy),
      count: groupVehicles.length,
      avgPrice: groupVehicles.reduce((sum, v) => sum + (v.PriceNew || 0), 0) / (groupVehicles.length || 1),
      vehicles: groupVehicles
    }));
  };

  // ==========================================================================
  // Filtering Logic
  // ==========================================================================

  const filteredVehicles = useMemo(() => {
    if (!vehicles) return [];
    
    let result = [...vehicles];
    
    // Apply quick filter
    if (quickFilter) {
      switch (quickFilter) {
        case "cars": 
          result = result.filter(v => isCarCategory(v.Category)); 
          break;
        case "motorcycles": 
          result = result.filter(v => isMotorcycleCategory(v.Category)); 
          break;
        case "tuktuks": 
          result = result.filter(v => isTukTukCategory(v.Category)); 
          break;
      }
    }
    
    // Apply advanced filters
    if (filters.search) {
      const searchTerms = filters.search.toLowerCase().trim().split(/\s+/).filter(term => term.length > 0);
      
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
    
    if (filters.category && filters.category !== "all") {
      result = result.filter(v => v.Category?.toLowerCase() === filters.category.toLowerCase());
    }
    
    if (filters.condition && filters.condition !== "all") {
      result = result.filter(v => v.Condition?.toLowerCase() === filters.condition.toLowerCase());
    }
    
    if (filters.brand) {
      result = result.filter(v => v.Brand?.toLowerCase().includes(filters.brand.toLowerCase()));
    }
    
    if (filters.model) {
      result = result.filter(v => v.Model?.toLowerCase().includes(filters.model.toLowerCase()));
    }
    
    if (filters.year) {
      result = result.filter(v => v.Year?.toString().includes(filters.year));
    }
    
    if (filters.plate) {
      result = result.filter(v => v.Plate?.toLowerCase().includes(filters.plate.toLowerCase()));
    }
    
    if (filters.minPrice) {
      const minPrice = parseFloat(filters.minPrice);
      if (!isNaN(minPrice)) {
        result = result.filter(v => (v.PriceNew || 0) >= minPrice);
      }
    }
    
    if (filters.maxPrice) {
      const maxPrice = parseFloat(filters.maxPrice);
      if (!isNaN(maxPrice)) {
        result = result.filter(v => (v.PriceNew || 0) <= maxPrice);
      }
    }
    
    if (filters.taxType) {
      result = result.filter(v => v.TaxType?.toLowerCase().includes(filters.taxType.toLowerCase()));
    }
    
    // Apply image filter
    if (filters.hasImage === 'no') {
      result = result.filter(v => !v.Image || v.Image === '');
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
  }, [vehicles, quickFilter, filters, sortField, sortDirection, isCarCategory, isMotorcycleCategory, isTukTukCategory]);

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
      cars: filteredVehicles.filter(v => isCarCategory(v.Category)).length,
      motorcycles: filteredVehicles.filter(v => isMotorcycleCategory(v.Category)).length,
      tuktuks: filteredVehicles.filter(v => isTukTukCategory(v.Category)).length,
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

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
    setLastSync(new Date());
    success(t.syncSuccess);
  }, [refresh, success]);

  const handleSort = useCallback((field: keyof Vehicle) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }, [sortField]);

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

  const handleView = (id: string) => {
    router.push(`/vehicles/${id}/view`);
  };

  const handleEdit = (id: string) => {
    router.push(`/vehicles/${id}/edit`);
  };

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
  
const getVehicleImageUrl = useCallback((imageValue: string | undefined): string | null => {
    if (!imageValue?.trim()) {
      return '/placeholder-car.svg';
    }
    
    const trimmed = imageValue.trim();
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Image]', trimmed.substring(0, 50) + '...');
    }
    
    // Full URL (Cloudinary/Drive)
    if (trimmed.match(/^https?:\/\//) || trimmed.startsWith('data:')) {
      return trimmed;
    }
    
    // Drive ID
    const driveFileId = extractDriveFileId(trimmed);
    if (driveFileId) {
      const thumbUrl = driveThumbnailUrl(driveFileId, "w400-h300");
      if (process.env.NODE_ENV === 'development') {
        console.debug('[Image] Drive thumb:', thumbUrl);
      }
      return thumbUrl;
    }
    
    // Cloudinary public ID (path format)
    if (/^[a-z0-9\-_\/]+$/.test(trimmed)) {
      const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo';
      return `https://res.cloudinary.com/${cloud}/image/upload/w400,h300,c_fill/${trimmed}`;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Image] Unknown format:', trimmed);
    }
    return '/placeholder-car.svg';
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
    if (cat.includes("car")) return "bg-blue-50 text-blue-700 ring-1 ring-blue-100";
    if (cat.includes("motor") || cat.includes("bike")) return "bg-purple-50 text-purple-700 ring-1 ring-purple-100";
    if (cat.includes("tuk") || cat.includes("rickshaw")) return "bg-orange-50 text-orange-700 ring-1 ring-orange-100";
    return "bg-slate-50 text-slate-700 ring-1 ring-slate-100";
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-4 sm:p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto">
          <LoadingSkeleton view={viewMode} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <NeuCard className="p-8 text-center" hover={false}>
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-100 to-red-50 shadow-[6px_6px_12px_#cbd5e1,-6px_-6px_12px_#ffffff] flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">{t.errorLoadingVehicles}</h2>
            <p className="text-slate-500 mb-8">{error}</p>
            <NeuButton onClick={handleRefresh} variant="primary">{t.retry}</NeuButton>
          </NeuCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Car className="w-6 h-6 text-white" />
              </span>
              Vehicle Inventory
            </h1>
            <p className="text-slate-500 mt-2 ml-13">{t.manageTrackVehicles}</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Last Sync */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-slate-100">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickFilterCard
            active={quickFilter === null}
            onClick={() => {
              setQuickFilter(null);
              router.push("/vehicles", { scroll: false });
            }}
            icon={Car}
            label={t.totalVehicles}
            count={displayStats.total}
            color="emerald"
            index={0}
          />
          <QuickFilterCard
            active={quickFilter === "cars"}
            onClick={() => {
              const newFilter = quickFilter === "cars" ? null : "cars";
              setQuickFilter(newFilter);
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
              setQuickFilter(newFilter);
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
              setQuickFilter(newFilter);
              if (newFilter) {
                router.push("/vehicles?category=TukTuks", { scroll: false });
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
                  placeholder="t.searchByBrandModel" 
                  icon={Search} 
                />
              </div>
              
              {/* Category Dropdown - Quick Access */}
              <div className="w-full sm:w-48">
                <div className="relative">
                  <select
                    value={quickFilter || filters.category}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "all") {
                        setQuickFilter(null);
                        setFilters(prev => ({ ...prev, category: "all" }));
                        router.push("/vehicles", { scroll: false });
                      } else {
                        setQuickFilter(value);
                        setFilters(prev => ({ ...prev, category: value }));
                        router.push(`/vehicles?category=${value}`, { scroll: false });
                      }
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-white shadow-[4px_4px_8px_#e2e8f0,-4px_-4px_8px_#ffffff] text-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 appearance-none cursor-pointer"
                  >
                    <option value="all">{t.allCategories}</option>
                    <option value="cars">🚗 Cars</option>
                    <option value="motorcycles">🏍️ Motorcycles</option>
                    <option value="tuktuks">🛺 TukTuks</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
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
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as GroupByOption)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white shadow-[4px_4px_8px_#e2e8f0,-4px_-4px_8px_#ffffff] text-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 appearance-none cursor-pointer pr-10"
                >
                  <option value="none">Group: None</option>
                  <option value="category">Group: Category</option>
                  <option value="brand">Group: Brand</option>
                  <option value="year">Group: Year</option>
                  <option value="condition">Group: Condition</option>
                  <option value="color">Group: Color</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              
              <ViewToggle view={viewMode} onChange={setViewMode} t={t} />
              
              {/* Columns Dropdown */}
              <div className="relative" ref={columnMenuRef}>
                <button
                  ref={columnsButtonRef}
                  onClick={() => setShowColumnMenu(!showColumnMenu)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm",
                    "bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] text-slate-600",
                    "shadow-[4px_4px_8px_#cbd5e1,-4px_-4px_8px_#ffffff]",
                    "hover:shadow-[6px_6px_12px_#cbd5e1,-6px_-6px_12px_#ffffff]",
                    "active:shadow-[inset_3px_3px_6px_#cbd5e1,inset_-3px_-3px_6px_#ffffff]",
                    "transition-all duration-200"
                  )}
                >
                  <Columns className="w-4 h-4" />
                  Columns
                </button>
                
                {showColumnMenu && (
                  <NeuCard className="absolute right-0 top-full mt-2 p-4 w-64 z-50" hover={false}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="font-semibold text-slate-700">{t.visibleColumns}</span>
                        <button 
                          onClick={() => setShowColumnMenu(false)} 
                          className="text-slate-500 hover:text-slate-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {COLUMNS.filter(col => col.key !== "actions").map((col) => (
                          <label 
                            key={col.key} 
                            className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
                          >
                            <input 
                              type="checkbox" 
                              checked={visibleColumns.includes(col.key)} 
                              onChange={() => toggleColumn(col.key)} 
                              className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 w-4 h-4"
                            />
                            <span className="text-sm text-slate-600">{col.label}</span>
                          </label>
                        ))}
                      </div>
                      
                      <div className="flex gap-2 pt-2 border-t border-slate-200">
                        <button 
                          onClick={() => setVisibleColumns(COLUMNS.map(c => c.key))} 
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                        >
                          Select All
                        </button>
                        <button 
                          onClick={() => setVisibleColumns(["image", "brand", "model", "actions"])} 
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          Minimal
                        </button>
                      </div>
                    </div>
                  </NeuCard>
                )}
              </div>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-lg p-5 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-emerald-500" />
                  Advanced Filters
                </h4>
                <button 
                  onClick={() => setShowFilters(false)} 
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">{t.category}</label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all"
                  >
                    <option value="all">All Categories</option>
                    <option value="cars">Cars</option>
                    <option value="motorcycles">Motorcycles</option>
                    <option value="tuktuks">TukTuks</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">{t.condition}</label>
                  <select
                    value={filters.condition}
                    onChange={(e) => setFilters(prev => ({ ...prev, condition: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all"
                  >
                    <option value="all">All Conditions</option>
                    <option value="new">New</option>
                    <option value="used">Used</option>
                    <option value="certified pre-owned">Certified Pre-Owned</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">{t.brand}</label>
                  <input 
                    type="text" 
                    value={filters.brand} 
                    onChange={(e) => setFilters(prev => ({ ...prev, brand: e.target.value }))} 
                    placeholder="e.g. Toyota" 
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">{t.model}</label>
                  <input 
                    type="text" 
                    value={filters.model} 
                    onChange={(e) => setFilters(prev => ({ ...prev, model: e.target.value }))} 
                    placeholder="e.g. Camry" 
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">{t.year}</label>
                  <input 
                    type="text" 
                    value={filters.year} 
                    onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))} 
                    placeholder="e.g. 2022" 
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">{t.plate}</label>
                  <input 
                    type="text" 
                    value={filters.plate} 
                    onChange={(e) => setFilters(prev => ({ ...prev, plate: e.target.value }))} 
                    placeholder="e.g. PP-1234" 
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">{t.minPrice}</label>
                  <input 
                    type="number" 
                    value={filters.minPrice} 
                    onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))} 
                    placeholder="0" 
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">{t.maxPrice}</label>
                  <input 
                    type="number" 
                    value={filters.maxPrice} 
                    onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))} 
                    placeholder="999999" 
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">{t.taxType}</label>
                  <select
                    value={filters.taxType}
                    onChange={(e) => setFilters(prev => ({ ...prev, taxType: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all"
                  >
                    <option value="">All Tax Types</option>
                    <option value="vat">VAT</option>
                    <option value="non-vat">Non-VAT</option>
                    <option value="exempt">Exempt</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">{t.imageStatus}</label>
                  <button
                    onClick={() => setFilters(prev => ({ 
                      ...prev, 
                      hasImage: prev.hasImage === 'no' ? '' : 'no' 
                    }))}
                    className={cn(
                      "w-full px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2",
                      filters.hasImage === 'no'
                        ? "bg-amber-100 text-amber-700 border-2 border-amber-300"
                        : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
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
              <span className="text-xs text-slate-500 font-medium">{t.activeFilters}:</span>
              
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
                  value={quickFilter.charAt(0).toUpperCase() + quickFilter.slice(1)} 
                  onRemove={() => setQuickFilter(null)} 
                />
              )}
              
              {filters.category !== "all" && (
                <FilterTag 
                  label="Category" 
                  value={filters.category} 
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
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">
              {groupBy !== "none" ? (
                <>
                  Showing all <span className="font-semibold text-slate-800">{filteredVehicles.length}</span> vehicles
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg ml-2">
                    Grouped by {groupBy}
                  </span>
                </>
              ) : (
                <>
                  Showing <span className="font-semibold text-slate-800">{paginatedVehicles.length}</span> of{" "}
                  <span className="font-semibold text-slate-800">{meta?.total || filteredVehicles.length}</span> vehicles
                </>
              )}
            </span>
            {totalsMode === "filtered" && groupBy === "none" && (
              <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                Filtered view
              </span>
            )}
          </div>
          
          {viewMode === "list" && groupBy === "none" && (
            <div className="text-sm text-slate-500">
              Sorted by {sortField} ({sortDirection})
            </div>
          )}
        </div>

        {/* Vehicle Display */}
        {viewMode === "grid" ? (
          // Grid View with Grouping
          <div className="space-y-8">
            {groupVehicles(groupBy === "none" && !filters.search ? paginatedVehicles : filteredVehicles, groupBy).map((group) => (
              <div key={group.key} className="space-y-4">
                {/* Group Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100/80 rounded-xl border border-slate-200/60 shadow-sm">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-slate-800">{group.label}</h3>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-full shadow-sm">
                      {group.count} vehicles
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">
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
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // List View (Table) with Grouping
          <div className="space-y-6">
            {groupVehicles(groupBy === "none" && !filters.search ? paginatedVehicles : filteredVehicles, groupBy).map((group) => (
              <div key={group.key} className="space-y-3">
                {/* Group Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100/80 rounded-xl border border-slate-200/60 shadow-sm">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-slate-800">{group.label}</h3>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-full shadow-sm">
                      {group.count} vehicles
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">
                    Avg Price: <span className="font-bold text-emerald-600">${Math.round(group.avgPrice).toLocaleString()}</span>
                  </div>
                </div>
                {/* Group Vehicles Table */}
                <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden border border-slate-100">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-50/95 backdrop-blur-sm border-b border-slate-200">
                          {COLUMNS.filter(col => visibleColumns.includes(col.key)).map((col) => (
                            <th
                              key={col.key}
                              className={cn(
                                "px-4 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider",
                                col.sortable && "cursor-pointer select-none hover:text-slate-900 hover:bg-slate-100/50 transition-colors"
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
                      <tbody className="divide-y divide-slate-100">
                        {group.vehicles.map((vehicle, index) => (
                          <tr 
                            key={vehicle.VehicleId}
                            onClick={() => handleView(vehicle.VehicleId)}
                            className="group hover:bg-slate-50/80 transition-all duration-200 cursor-pointer"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            {visibleColumns.includes("id") && (
                              <td className="px-4 py-3.5 text-sm font-medium text-slate-500">#{vehicle.VehicleId}</td>
                            )}
                            
                            {visibleColumns.includes("image") && (
                              <td className="px-4 py-3.5">
                                {(() => {
                                  const imageUrl = getVehicleImageUrl(vehicle.Image);
                                  return imageUrl ? (
                                    <img 
                                      src={imageUrl} 
                                      alt={vehicle.Model || "Vehicle"}
                                      className="w-12 h-12 rounded-xl object-cover shadow-sm ring-2 ring-white"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                                      <Car className="w-5 h-5 text-slate-400" />
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
                              <td className="px-4 py-3.5 text-sm font-semibold text-slate-800">{vehicle.Brand}</td>
                            )}
                            
                            {visibleColumns.includes("model") && (
                              <td className="px-4 py-3.5 text-sm text-slate-700">{vehicle.Model}</td>
                            )}
                            
                            {visibleColumns.includes("year") && (
                              <td className="px-4 py-3.5 text-sm text-slate-600 font-medium">{vehicle.Year || "-"}</td>
                            )}
                            
                            {visibleColumns.includes("plate") && (
                              <td className="px-4 py-3.5">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-slate-100 text-slate-700 ring-1 ring-slate-200">
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
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                                  {vehicle.TaxType || "-"}
                                </span>
                              </td>
                            )}
                            
                            {visibleColumns.includes("bodyType") && (
                              <td className="px-4 py-3.5 text-sm text-slate-700">{vehicle.BodyType || "-"}</td>
                            )}
                            
                            {visibleColumns.includes("color") && (
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2">
                                  {vehicle.Color && (
                                    <span 
                                      className="w-4 h-4 rounded-full border border-slate-200 shadow-sm"
                                      style={{ backgroundColor: vehicle.Color.toLowerCase() }}
                                    />
                                  )}
                                  <span className="text-sm text-slate-700">{vehicle.Color || "-"}</span>
                                </div>
                              </td>
                            )}
                            
                            {visibleColumns.includes("condition") && (
                              <td className="px-4 py-3.5">
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
                                  vehicle.Condition?.toLowerCase() === "new" 
                                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                    : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
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

                <div className="px-6 py-12 text-center bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-slate-100">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-50 flex items-center justify-center">
                    <Search className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-1">{t.noVehiclesFound}</h3>
                  <p className="text-sm text-slate-500">{t.tryAdjustingFilters}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pagination - only show when not grouping and not searching */}
        {totalPages > 1 && groupBy === "none" && !filters.search && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-500">
                Page {currentPage} of {totalPages}
              </div>
              
              {/* Items Per Page Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Show:</span>
                <div className="relative">
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value, 10);
                      setItemsPerPage(newValue);
                      setCurrentPage(1); // Reset to first page when changing items per page
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white shadow-[2px_2px_4px_#e2e8f0,-2px_-2px_4px_#ffffff] text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 appearance-none cursor-pointer pr-8"
                  >
                    {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
                <span className="text-sm text-slate-500">{t.perPage}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <NeuButton 
                variant="default" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage <= 1}
              >
                Previous
              </NeuButton>
              
              <div className="flex items-center gap-1">
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
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "w-9 h-9 rounded-lg text-sm font-medium transition-all duration-200",
                        currentPage === pageNum
                          ? "bg-emerald-500 text-white shadow-md"
                          : "bg-white text-slate-600 hover:bg-slate-50 shadow-sm"
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
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage >= totalPages}
              >
                Next
              </NeuButton>
            </div>
          </div>
        )}

        {/* Add Vehicle Modal */}
        <AddVehicleModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            refresh();
            setCurrentPage(1);
            setLastSync(new Date());
          }}
        />

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
