"use client";

import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthUser } from "@/shared/hooks/AuthContext";
import { formatVehicleId, formatVehicleTime, formatCurrency } from "@/shared/utils/format";
import { onVehicleCacheUpdate } from "@/systems/vms/utils/vehicleCache";
import { derivePrices } from "@/systems/vms/utils/pricing";
import type { Vehicle } from "@/shared/types/types";
import { TAX_TYPE_METADATA } from "@/shared/types/types";
import { useMounted } from "@/shared/hooks/useMounted";
import { getVehicleImageUrls, getVehiclePrimaryImageUrl, mergeVehicleImages } from "@/systems/vms/utils/vehicle-helpers";
import { useVehicleListBackLink } from "@/systems/vms/hooks/useVehicleListBackLink";
import { 
  ArrowLeft, 
  Car,
  ChevronRight,
  Loader2,
  Image as ImageIcon,
  Clock,
  Tag,
  Calendar,
  Info,
  DollarSign,
  Edit3,
  Trash2,
  X,
  Save,
  CheckCircle2,
  FileText,
  Bike,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/shared/utils/ui";
import ImageModal from "@/shared/components/ImageModal";
import { ConfirmDeleteModal } from "@/systems/vms/components/vehicles/ConfirmDeleteModal";
import { useDeleteVehicle } from "@/systems/vms/components/vehicles/useDeleteVehicle";
import { useToast } from "@/shared/components/ui/glass/GlassToast";
import { ImageInput } from "@/shared/components/ui/ImageInput";
import { TukTukIcon } from "@/shared/components/icons/TukTukIcon";

// Helper to get proper image URL
const getImageUrl = (imageUrl: unknown): string | null => {
  return getVehiclePrimaryImageUrl(imageUrl, "w800-h600");
};

// Category options
type CategoryOption = "Cars" | "Motorcycles" | "TukTuks";

const CATEGORY_OPTIONS: { value: CategoryOption; label: string; icon: React.ReactNode; color: string; bgClass?: string }[] = [
  {
    value: "Cars",
    label: "Cars",
    icon: <Car className="w-6 h-6" />,
    color: "#3b82f6",
    bgClass: "bg-[#3b82f6]/15 text-[#3b82f6]",
  },
  {
    value: "Motorcycles",
    label: "Motorcycles",
    icon: <Bike className="w-6 h-6" />,
    color: "#8b5cf6",
    bgClass: "bg-[#8b5cf6]/15 text-[#8b5cf6]",
  },
  {
    value: "TukTuks",
    label: "TukTuks",
    icon: <TukTukIcon className="w-6 h-6" />,
    color: "#f97316",
    bgClass: "bg-[#f97316]/15 text-[#f97316]",
  },
];

const COLOR_SWATCH_CLASSES: Record<string, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  yellow: "bg-yellow-400",
  orange: "bg-orange-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
  black: "bg-slate-950",
  white: "bg-white",
  gray: "bg-gray-500",
  grey: "bg-gray-500",
  silver: "bg-slate-300",
  gold: "bg-yellow-500",
  brown: "bg-amber-900",
  beige: "bg-stone-300",
  navy: "bg-blue-950",
  teal: "bg-teal-500",
  cyan: "bg-cyan-500",
  lime: "bg-lime-500",
  maroon: "bg-red-900",
  olive: "bg-lime-700",
  coral: "bg-red-400",
  ivory: "bg-[#fffff0]",
  khaki: "bg-stone-400",
  lavender: "bg-violet-300",
  magenta: "bg-fuchsia-500",
  mint: "bg-emerald-300",
  peach: "bg-orange-300",
  plum: "bg-purple-700",
  tan: "bg-amber-300",
  turquoise: "bg-cyan-300",
  violet: "bg-violet-500",
  indigo: "bg-indigo-500",
  charcoal: "bg-gray-700",
  cream: "bg-[#fffdd0]",
  burgundy: "bg-rose-900",
  champagne: "bg-orange-100",
  bronze: "bg-orange-700",
  copper: "bg-orange-800",
  rose: "bg-rose-400",
  slate: "bg-slate-600",
  emerald: "bg-emerald-500",
  ruby: "bg-rose-600",
  sapphire: "bg-blue-700",
  amber: "bg-amber-500",
  jade: "bg-emerald-600",
  pearl: "bg-stone-100",
  graphite: "bg-gray-600",
};

const LIGHT_COLOR_NAMES = ["white", "ivory", "cream", "pearl", "champagne"];

const getColorSwatchClass = (colorName: string): string => {
  const normalizedColor = colorName.toLowerCase().trim();
  if (!normalizedColor) return "bg-slate-300";
  if (COLOR_SWATCH_CLASSES[normalizedColor]) return COLOR_SWATCH_CLASSES[normalizedColor];

  for (const [name, className] of Object.entries(COLOR_SWATCH_CLASSES)) {
    if (normalizedColor.includes(name) || name.includes(normalizedColor)) {
      return className;
    }
  }

  return "bg-slate-400";
};

function ColorSwatch({ color, className }: { color: string; className?: string }) {
  const normalizedColor = color.toLowerCase().trim();

  return (
    <span
      aria-hidden="true"
      title={color}
      className={cn(
        "inline-block h-5 w-5 shrink-0 rounded-full border border-slate-200 shadow-sm",
        getColorSwatchClass(color),
        LIGHT_COLOR_NAMES.some((name) => normalizedColor.includes(name)) && "ring-1 ring-slate-300",
        className
      )}
    />
  );
};

// Status Badge Component
function StatusBadge({ condition }: { condition: string }) {
  const normalized = condition?.toLowerCase() || "";
  
  let bgColor = "bg-slate-100";
  let textColor = "text-slate-700";
  let dotColor = "bg-slate-400";
  
  if (normalized === "used") {
    bgColor = "bg-emerald-100";
    textColor = "text-emerald-700";
    dotColor = "bg-emerald-500";
  } else if (normalized === "new") {
    bgColor = "bg-blue-100";
    textColor = "text-blue-700";
    dotColor = "bg-blue-500";
  } else if (normalized === "refurbished") {
    bgColor = "bg-amber-100";
    textColor = "text-amber-700";
    dotColor = "bg-amber-500";
  }
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
      bgColor,
      textColor
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", dotColor)} />
      {condition || "Unknown"}
    </span>
  );
}

// Floating Label Input Component
function FloatingLabelInput({
  label,
  type = "text",
  value,
  onChange,
  error,
  icon: Icon,
  required = false,
  min,
  max,
  disabled = false,
}: {
  label: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  icon?: React.ComponentType<{ className?: string }>;
  required?: boolean;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== "" && value !== null && value !== undefined;
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  
  return (
    <div className="relative">
      <div className={cn(
        "relative bg-white rounded-xl border-2 transition-all duration-200",
        "shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
        isFocused && "border-emerald-500 shadow-[0_4px_16px_rgba(16,185,129,0.15)]",
        error && "border-rose-400 shadow-[0_4px_16px_rgba(244,63,94,0.1)]",
        !isFocused && !error && "border-slate-200 hover:border-slate-300",
        disabled && "bg-slate-50 border-slate-200"
      )}>
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder={label}
          title={label}
          min={min}
          max={max}
          {...(error ? { "aria-invalid": "true" as const } : {})}
          aria-describedby={errorId}
          className={cn(
            "w-full px-3 py-3 bg-transparent text-sm text-slate-800 outline-none rounded-xl",
            Icon && "pl-10",
            "placeholder:text-transparent"
          )}
        />
        <label htmlFor={id} className={cn(
          "absolute left-3 transition-all duration-200 pointer-events-none",
          Icon && "left-10",
          (isFocused || hasValue)
            ? "-top-2.5 text-xs font-medium bg-white px-1 text-emerald-600"
            : "top-1/2 -translate-y-1/2 text-sm text-slate-400",
          error && (isFocused || hasValue) && "text-rose-500"
        )}>
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      </div>
      {error && <p id={errorId} className="text-xs text-rose-500 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" aria-hidden="true" />{error}</p>}
    </div>
  );
}

// Form Section Component
function FormSection({ title, icon: Icon, children, className }: { 
  title: string; 
  icon: React.ComponentType<{ className?: string }>; 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-emerald-600" />
        </div>
        <h3 className="font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

// Category Selector Component
function CategorySelector({
  value,
  onChange,
  error,
  disabled = false,
}: {
  value: CategoryOption | "";
  onChange: (value: CategoryOption) => void;
  error?: string;
  disabled?: boolean;
}) {
  const labelId = useId();

  return (
    <div className="space-y-1.5">
      <p id={labelId} className="block text-sm font-medium text-slate-700">
        Category <span className="text-rose-500">*</span>
      </p>
      <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-labelledby={labelId}>
        {CATEGORY_OPTIONS.map((cat) => {
          const isSelected = value === cat.value;
          const className = cn(
            "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
            isSelected
              ? "border-emerald-500 bg-emerald-50/50 shadow-md"
              : "border-slate-200 hover:border-slate-300 bg-white hover:shadow-sm",
            disabled && "opacity-50 cursor-not-allowed"
          );
          const content = (
            <>
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", cat.bgClass)}>
                {cat.icon}
              </div>
              <span className="text-sm font-medium text-slate-700">{cat.label}</span>
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-white" aria-hidden="true" />
                </div>
              )}
            </>
          );

          return isSelected ? (
            <button
              key={cat.value}
              type="button"
              role="radio"
              aria-checked="true"
              onClick={() => !disabled && onChange(cat.value)}
              disabled={disabled}
              className={className}
            >
              {content}
            </button>
          ) : (
            <button
              key={cat.value}
              type="button"
              role="radio"
              aria-checked="false"
              onClick={() => !disabled && onChange(cat.value)}
              disabled={disabled}
              className={className}
            >
              {content}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="ec-dark-scope min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto">
        <div className="h-8 w-48 bg-slate-200 rounded-lg mb-6 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 h-96 bg-slate-200 rounded-2xl animate-pulse" />
          <div className="lg:col-span-3 space-y-6">
            <div className="h-32 bg-slate-200 rounded-2xl animate-pulse" />
            <div className="h-48 bg-slate-200 rounded-2xl animate-pulse" />
            <div className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Reserved words that cannot be used as vehicle IDs
const RESERVED_IDS = ['edit', 'add', 'view', 'new', 'create', 'delete'];

function readVehicleFromListCache(id: string): Vehicle | null {
  if (typeof window === "undefined") return null;

  try {
    const selected = sessionStorage.getItem(`vms-selected-vehicle-${id}`);
    if (selected) {
      const parsed = JSON.parse(selected) as Vehicle;
      if (parsed?.VehicleId === id) return parsed;
    }
  } catch {
    // Ignore malformed handoff cache.
  }

  try {
    const cached = localStorage.getItem("vms-vehicles");
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    if (!Array.isArray(parsed)) return null;

    return (parsed as Vehicle[]).find((v) => v.VehicleId === id) ?? null;
  } catch {
    return null;
  }
}

export default function ViewVehiclePage() {
  return <ViewVehicleInner />;
}

function ViewVehicleInner() {
  const router = useRouter();
  const { href: listHref, label: backToListLabel, searchParams } = useVehicleListBackLink();
  const params = useParams<{ id: string }>();
  const rawId = typeof params?.id === "string" ? params.id : "";
  
  const isReservedId = RESERVED_IDS.includes(rawId.toLowerCase());
  const id = isReservedId ? "" : rawId;
  
  const user = useAuthUser();
  const isMounted = useMounted();
  const { success, error: showError } = useToast();
  
  const isAdmin = user?.role === "Admin";
  const userRole = user?.role || "Viewer";
  const canEdit = isAdmin;  // Only Admin can edit vehicles
  const canDelete = isAdmin;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Vehicle>>({});
  const [imageValues, setImageValues] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(() => new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const descriptionInputId = useId();

  const handleBackToList = useCallback(() => {
    router.push(listHref, { scroll: false });
  }, [listHref, router]);

  // Redirect to vehicles list if ID is a reserved word
  useEffect(() => {
    if (isReservedId) {
      router.push(listHref, { scroll: false });
    }
  }, [isReservedId, listHref, router]);
  
  // Check for auto-print
  const shouldAutoPrint = (() => {
    const value = searchParams?.get("print") ?? "";
    return value === "1" || value.toLowerCase() === "true";
  })();

  // Load vehicle data
  useEffect(() => {
    if (!id || !isMounted) return;

    const urlParams = new URLSearchParams(window.location.search);
    const skipCache = urlParams.get('refresh') === '1';
    
    if (!skipCache) {
      const found = readVehicleFromListCache(id);
      if (found) {
        setVehicle(found);
        setLoading(false);
      }
    }

    let alive = true;
    let authFailed = false;
    setError("");

    async function fetchVehicle() {
      try {
        const res = await fetch(`/api/vehicles/${encodeURIComponent(id)}`, {
          cache: "no-store",
          credentials: "include",
        });
        
        if (res.status === 401) {
          if (!authFailed) {
            authFailed = true;
            router.push("/login?redirect=" + encodeURIComponent(window.location.pathname));
          }
          return;
        }
        if (res.status === 404) {
          // Vehicle not found - let !vehicle state handle it
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch vehicle");
        const data = await res.json();
        if (!alive) return;
        const fetchedVehicle = data.data || data.vehicle;
        setVehicle(fetchedVehicle);

        try {
          sessionStorage.setItem(`vms-selected-vehicle-${id}`, JSON.stringify(fetchedVehicle));
        } catch {
          // Ignore detail cache write errors.
        }
        
        try {
          const cached = localStorage.getItem("vms-vehicles");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              const index = parsed.findIndex((v: Vehicle) => v.VehicleId === id);
              if (index >= 0) {
                parsed[index] = fetchedVehicle;
                localStorage.setItem("vms-vehicles", JSON.stringify(parsed));
              }
            }
          }
        } catch {
          // Ignore cache update errors
        }
      } catch (err) {
        if (!alive) return;
        const currentVehicle = readVehicleFromListCache(id);
        if (!currentVehicle) {
          setError(err instanceof Error ? err.message : "Error loading vehicle");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchVehicle();
    return () => {
      alive = false;
    };
  }, [id, router, isMounted]);

  // Auto-print effect
  useEffect(() => {
    if (!shouldAutoPrint || !vehicle) return;
    const timeout = window.setTimeout(() => window.print(), 150);
    return () => window.clearTimeout(timeout);
  }, [shouldAutoPrint, vehicle]);

  // Listen for cache updates
  useEffect(() => {
    return onVehicleCacheUpdate((vehicles) => {
      const updatedVehicle = vehicles.find((v) => v.VehicleId === id);
      if (updatedVehicle) {
        setVehicle(updatedVehicle);
      }
    });
  }, [id]);

  useEffect(() => {
    setFailedImageUrls(new Set());
    setActiveImageIndex(0);
  }, [vehicle?.Image, vehicle?.VehicleId]);

  // Initialize form data when vehicle loads or edit mode activates
  useEffect(() => {
    if (vehicle && isEditMode) {
      setFormData({
        Brand: vehicle.Brand || "",
        Model: vehicle.Model || "",
        Year: vehicle.Year || null,
        Plate: vehicle.Plate || "",
        Category: vehicle.Category || "",
        Condition: vehicle.Condition || "",
        TaxType: vehicle.TaxType || "",
        BodyType: vehicle.BodyType || "",
        Color: vehicle.Color || "",
        PriceNew: vehicle.PriceNew || 0,
        Price40: vehicle.Price40 || 0,
        Price70: vehicle.Price70 || 0,
        Description: vehicle.Description || "",
      });
      setImageValues(getVehicleImageUrls(mergeVehicleImages(vehicle.Images, vehicle.Image), "w800-h600"));
    }
  }, [vehicle, isEditMode]);

  // Update derived prices when market price changes
  useEffect(() => {
    if (formData.PriceNew && formData.PriceNew > 0) {
      const prices = derivePrices(formData.PriceNew);
      setFormData(prev => ({
        ...prev,
        Price40: prices.Price40,
        Price70: prices.Price70,
      }));
    }
  }, [formData.PriceNew]);

  const handleInputChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleImagesChange = (values: string[]) => {
    setImageValues(values);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.Brand?.trim()) newErrors.Brand = "Brand is required";
    if (!formData.Model?.trim()) newErrors.Model = "Model is required";
    if (!formData.Year) newErrors.Year = "Year is required";
    if (!formData.Category) newErrors.Category = "Category is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !vehicle) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const finalImageUrls = await Promise.all(
        imageValues.map(async (imageValue, index) => {
          if (imageValue.startsWith('http://') || imageValue.startsWith('https://')) {
            return imageValue;
          }

          if (imageValue.startsWith('data:')) {
            const uploadRes = await fetch("/api/upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                file: imageValue,
                folder: "vehicle_images",
                filename: `${vehicle.VehicleId}_${Date.now()}_${index}`
              }),
            });

            if (!uploadRes.ok) {
              const uploadError = await uploadRes.json().catch(() => ({}));
              throw new Error(uploadError.error || "Failed to upload image");
            }
            const uploadData = await uploadRes.json();
            const uploadedUrl = uploadData?.data?.url || uploadData?.url;
            if (!uploadedUrl) {
              throw new Error("Upload response missing image URL");
            }
            return uploadedUrl;
          }

          return imageValue;
        })
      );
      
      const updateRes = await fetch(`/api/vehicles/${vehicle.VehicleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          Image: finalImageUrls[0] || "",
          Images: finalImageUrls,
        }),
      });
      
      if (!updateRes.ok) throw new Error("Failed to update vehicle");
      
      const result = await updateRes.json();
      setVehicle(result.data || result.vehicle);
      setIsEditMode(false);
      success("Vehicle updated successfully");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setFormData({});
    setImageValues([]);
    setErrors({});
    setSubmitError(null);
  };

  const handleDeleteSuccess = () => {
    success("Vehicle deleted successfully");
    setIsDeleteModalOpen(false);
    router.push(listHref, { scroll: false });
  };

  const handleDeleteError = (err: string) => {
    showError(err);
  };

  const { deleteVehicle, isDeleting } = useDeleteVehicle(
    handleDeleteSuccess,
    handleDeleteError
  );

  const handleDelete = async () => {
    if (!vehicle) return;
    await deleteVehicle(vehicle);
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="ec-dark-scope min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8 dark:bg-slate-950">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-rose-50 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-rose-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Error Loading Vehicle</h2>
            <p className="text-slate-500 mb-8">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors shadow-md"
              >
                Retry
              </button>
              <button
                onClick={handleBackToList}
                className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                {backToListLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="ec-dark-scope min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8 dark:bg-slate-950">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Car className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Vehicle Not Found</h2>
            <p className="text-slate-500 mb-8">The vehicle you&apos;re looking for doesn&apos;t exist or has been removed.</p>
            <button
              onClick={handleBackToList}
              className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors shadow-md"
            >
              {backToListLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentVehicle = vehicle;
  const vehicleImageSource = mergeVehicleImages(currentVehicle.Images, currentVehicle.Image);
  const displayImageUrls = mergeVehicleImages(
    getVehicleImageUrls(vehicleImageSource, "w800-h600"),
    getVehicleImageUrls(vehicleImageSource, "w400-h300"),
    getVehicleImageUrls(vehicleImageSource, "w400-h400")
  )
    .filter((imageUrl) => !failedImageUrls.has(imageUrl));
  const galleryImageUrls = getVehicleImageUrls(vehicleImageSource, "w1200-h900");
  const fallbackImageUrl = getImageUrl(currentVehicle.Image);
  const displayImageUrl = displayImageUrls[0] ?? (
    fallbackImageUrl && !failedImageUrls.has(fallbackImageUrl) ? fallbackImageUrl : null
  );
  const taxTypeMeta = TAX_TYPE_METADATA.find((tt) => tt.value === currentVehicle.TaxType);
  const isTukTuk = currentVehicle.Category?.toLowerCase().includes("tuk");

  return (
    <div className="ec-dark-scope min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      {/* Professional Header Action Bar */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Back Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackToList}
                aria-label="Back to vehicle list"
                className="inline-flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span className="hidden text-sm font-medium sm:inline">{backToListLabel}</span>
              </button>
              <div className="h-4 w-px bg-slate-300" />
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>Vehicles</span>
                <ChevronRight className="w-4 h-4" />
                <span className="text-slate-900 font-medium">
                  {isEditMode ? "Edit" : "Details"}
                </span>
              </div>
            </div>

            {/* Center: Title */}
            <div className="hidden md:flex items-center gap-2">
              {isTukTuk && (
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                  <TukTukIcon className="w-5 h-5" />
                </div>
              )}
              <h1 className="text-lg font-semibold text-slate-900">
                {currentVehicle.Brand} {currentVehicle.Model}
              </h1>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2">
              {!isEditMode ? (
                <>
                  {canEdit && (
                    <button
                      onClick={() => setIsEditMode(true)}
                      aria-label="Edit vehicle"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <Edit3 className="w-4 h-4" aria-hidden="true" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => setIsDeleteModalOpen(true)}
                      disabled={isDeleting}
                      aria-label="Delete vehicle"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSubmitting}
                    aria-label="Cancel editing"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-all duration-200"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Cancel</span>
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    aria-label={isSubmitting ? "Saving vehicle" : "Save vehicle"}
                    {...(isSubmitting ? { "aria-busy": "true" as const } : { "aria-busy": "false" as const })}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Save className="w-4 h-4" aria-hidden="true" />
                    )}
                    <span className="hidden sm:inline">Save</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Submit Error */}
        {submitError && (
          <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-rose-700">{submitError}</p>
          </div>
        )}

        {/* Split View Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Column - Vehicle Preview (2/5) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Large Vehicle Preview Card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {displayImageUrl ? (
                <div
                  className="relative h-64 lg:h-80 cursor-pointer group"
                  onClick={() => {
                    setActiveImageIndex(0);
                    setIsImageModalOpen(true);
                  }}
                >
                  { }
                  <img
                    src={displayImageUrl}
                    alt={`${currentVehicle.Brand} ${currentVehicle.Model}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={() => {
                      setFailedImageUrls((prev) => {
                        if (prev.has(displayImageUrl)) return prev;
                        const next = new Set(prev);
                        next.add(displayImageUrl);
                        return next;
                      });
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 backdrop-blur-sm text-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg">
                      ID: {formatVehicleId(currentVehicle.VehicleId)}
                    </span>
                  </div>
                  {galleryImageUrls.length > 1 && (
                    <div className="absolute top-4 right-4">
                      <span className="rounded-lg bg-black/60 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-sm">
                        1 / {galleryImageUrls.length}
                      </span>
                    </div>
                  )}
                  {isTukTuk && (
                    <div className={cn("absolute", galleryImageUrls.length > 1 ? "right-4 top-14" : "right-4 top-4")}>
                      <div className="bg-orange-500 text-white p-2 rounded-lg shadow-lg">
                        <TukTukIcon className="w-5 h-5" />
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 right-4">
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {currentVehicle.Brand} {currentVehicle.Model}
                    </h2>
                    <p className="text-white/80 text-sm">
                      {currentVehicle.Year} • {currentVehicle.Category}
                    </p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-semibold text-slate-900">Click to Enlarge</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-64 lg:h-80 bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center mb-3">
                    <ImageIcon className="w-10 h-10 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium">No image available</p>
                </div>
              )}
            </div>

            {/* Quick Info Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-500" />
                Quick Info
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500">Vehicle ID</span>
                  <span className="font-mono text-sm font-medium text-slate-800">
                    {formatVehicleId(currentVehicle.VehicleId)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500">Category</span>
                  <span className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-semibold",
                    currentVehicle.Category === "Cars" && "bg-blue-100 text-blue-700",
                    currentVehicle.Category === "Motorcycles" && "bg-purple-100 text-purple-700",
                    currentVehicle.Category?.toLowerCase().includes("tuk") && "bg-orange-100 text-orange-700",
                    (!currentVehicle.Category || (!["Cars", "Motorcycles"].includes(currentVehicle.Category) && !currentVehicle.Category?.toLowerCase().includes("tuk"))) && "bg-slate-100 text-slate-700"
                  )}>
                    {currentVehicle.Category || "Uncategorized"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500">Added</span>
                  <span className="text-sm text-slate-700">
                    {formatVehicleTime(currentVehicle.Time)}
                  </span>
                </div>
                {currentVehicle.Color && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-500">Color</span>
                    <div className="flex items-center gap-2">
                      <ColorSwatch color={currentVehicle.Color} />
                      <span className="text-sm text-slate-700">{currentVehicle.Color}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Data Cards (3/5) */}
          <div className="lg:col-span-3 space-y-6">
            {isEditMode ? (
              /* EDIT MODE FORM */
              <>
                {/* Image Upload */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <FormSection title="Vehicle Image" icon={ImageIcon}>
                    <div className="max-w-md">
                      <ImageInput
                        value={imageValues[0] || ""}
                        values={imageValues}
                        onChange={(value) => handleImagesChange(value ? [value] : [])}
                        onChangeMany={handleImagesChange}
                        multiple
                        maxImages={12}
                        maxSizeMB={10}
                        disabled={isSubmitting}
                      />
                    </div>
                  </FormSection>
                </div>

                {/* Category Selection */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <CategorySelector
                    value={(formData.Category as CategoryOption) || ""}
                    onChange={(value) => handleInputChange("Category", value)}
                    error={errors.Category}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Basic Information Form */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <FormSection title="Basic Information" icon={Tag}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FloatingLabelInput
                        label="Brand"
                        value={formData.Brand || ""}
                        onChange={(e) => handleInputChange("Brand", e.target.value)}
                        error={errors.Brand}
                        icon={Tag}
                        required
                      />
                      <FloatingLabelInput
                        label="Model"
                        value={formData.Model || ""}
                        onChange={(e) => handleInputChange("Model", e.target.value)}
                        error={errors.Model}
                        required
                      />
                      <FloatingLabelInput
                        label="Year"
                        type="number"
                        value={formData.Year || ""}
                        onChange={(e) => handleInputChange("Year", e.target.value ? parseInt(e.target.value) : null)}
                        error={errors.Year}
                        icon={Calendar}
                        min={1900}
                        max={new Date().getFullYear() + 1}
                        required
                      />
                      <FloatingLabelInput
                        label="Plate Number"
                        value={formData.Plate || ""}
                        onChange={(e) => handleInputChange("Plate", e.target.value.toUpperCase())}
                        error={errors.Plate}
                        required
                      />
                    </div>
                  </FormSection>
                </div>

                {/* Pricing Form */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <FormSection title="Pricing" icon={DollarSign}>
                    <div className="space-y-4">
                      <FloatingLabelInput
                        label="Market Price"
                        type="number"
                        value={formData.PriceNew || ""}
                        onChange={(e) => handleInputChange("PriceNew", e.target.value ? parseFloat(e.target.value) : 0)}
                        error={errors.PriceNew}
                        icon={DollarSign}
                        required
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
                          <p className="text-xs text-rose-600 uppercase tracking-wider mb-1">DOC 40%</p>
                          <p className="text-xl font-bold text-slate-800">{formatCurrency(formData.Price40)}</p>
                          <p className="text-xs text-slate-400 mt-1">Auto-calculated</p>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                          <p className="text-xs text-blue-600 uppercase tracking-wider mb-1">Vehicles 70%</p>
                          <p className="text-xl font-bold text-slate-800">{formatCurrency(formData.Price70)}</p>
                          <p className="text-xs text-slate-400 mt-1">Auto-calculated</p>
                        </div>
                      </div>
                    </div>
                  </FormSection>
                </div>

                {/* Vehicle Details Form */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <FormSection title="Vehicle Details" icon={Info}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FloatingLabelInput
                        label="Condition"
                        value={formData.Condition || ""}
                        onChange={(e) => handleInputChange("Condition", e.target.value)}
                      />
                      <FloatingLabelInput
                        label="Tax Type"
                        value={formData.TaxType || ""}
                        onChange={(e) => handleInputChange("TaxType", e.target.value)}
                      />
                      <FloatingLabelInput
                        label="Body Type"
                        value={formData.BodyType || ""}
                        onChange={(e) => handleInputChange("BodyType", e.target.value)}
                      />
                      <FloatingLabelInput
                        label="Color"
                        value={formData.Color || ""}
                        onChange={(e) => handleInputChange("Color", e.target.value)}
                      />
                    </div>
                  </FormSection>
                </div>

                {/* Description Form */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <FormSection title="Additional Information" icon={FileText}>
                    <div className="space-y-1.5">
                      <label htmlFor={descriptionInputId} className="block text-sm font-medium text-slate-700">Description</label>
                      <textarea
                        id={descriptionInputId}
                        value={formData.Description || ""}
                        onChange={(e) => handleInputChange("Description", e.target.value)}
                        placeholder="Enter vehicle description..."
                        rows={4}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 hover:border-slate-300 resize-none"
                      />
                    </div>
                  </FormSection>
                </div>
              </>
            ) : (
              /* VIEW MODE DISPLAY */
              <>
                {/* Primary Stats Card */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <FormSection title="Pricing Information" icon={DollarSign}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Market Price - Highlighted */}
                      <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-100">
                        <p className="text-xs text-emerald-600 uppercase tracking-wider mb-2 font-semibold">Market Price</p>
                        <p className="text-3xl font-bold text-emerald-700">{formatCurrency(currentVehicle.PriceNew)}</p>
                      </div>
                      {/* DOC 40% */}
                      <div className="p-5 bg-rose-50 rounded-xl border border-rose-100">
                        <p className="text-xs text-rose-600 uppercase tracking-wider mb-2 font-semibold">DOC 40%</p>
                        <p className="text-2xl font-bold text-slate-800">{formatCurrency(currentVehicle.Price40)}</p>
                      </div>
                      {/* 70% */}
                      <div className="p-5 bg-blue-50 rounded-xl border border-blue-100">
                        <p className="text-xs text-blue-600 uppercase tracking-wider mb-2 font-semibold">Vehicles 70%</p>
                        <p className="text-2xl font-bold text-slate-800">{formatCurrency(currentVehicle.Price70)}</p>
                      </div>
                    </div>
                  </FormSection>
                </div>

                {/* Technical Specs Card */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <FormSection title="Technical Specifications" icon={Info}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Brand</p>
                        <p className="font-semibold text-slate-800 text-lg">{currentVehicle.Brand || "—"}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Model</p>
                        <p className="font-semibold text-slate-800 text-lg">{currentVehicle.Model || "—"}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Year</p>
                        <p className="font-semibold text-slate-800 text-lg">{currentVehicle.Year || "—"}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Plate Number</p>
                        <p className="font-mono font-semibold text-slate-800 text-lg uppercase">{currentVehicle.Plate || "—"}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Body Type</p>
                        <p className="font-semibold text-slate-800 text-lg">{currentVehicle.BodyType || "—"}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Color</p>
                        <div className="flex items-center gap-2">
                          {currentVehicle.Color && (
                            <ColorSwatch color={currentVehicle.Color} />
                          )}
                          <p className="font-semibold text-slate-800 text-lg">{currentVehicle.Color || "—"}</p>
                        </div>
                      </div>
                    </div>
                  </FormSection>
                </div>

                {/* Vehicle Details Card */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <FormSection title="Vehicle Details" icon={Info}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Condition</p>
                        <StatusBadge condition={currentVehicle.Condition} />
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Tax Type</p>
                        <p className="font-semibold text-slate-800">{currentVehicle.TaxType || "—"}</p>
                        {taxTypeMeta?.description && (
                          <p className="text-xs text-slate-400 mt-1">{taxTypeMeta.description}</p>
                        )}
                      </div>
                    </div>
                  </FormSection>
                </div>

                {/* Description Card */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <FormSection title="Additional Information" icon={FileText}>
                    <div className="p-4 bg-slate-50 rounded-xl min-h-[100px]">
                      <p className="text-slate-700 whitespace-pre-wrap">
                        {currentVehicle.Description || "No additional information provided."}
                      </p>
                    </div>
                  </FormSection>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        imageUrl={displayImageUrl || ""}
        images={galleryImageUrls}
        initialIndex={activeImageIndex}
        alt={`${currentVehicle.Brand} ${currentVehicle.Model}`}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        vehicle={currentVehicle}
        isOpen={isDeleteModalOpen}
        isDeleting={isDeleting}
        userRole={userRole}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
