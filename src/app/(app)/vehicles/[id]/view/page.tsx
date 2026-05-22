"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuthUser } from "@/app/components/AuthContext";
import { formatVehicleId, formatVehicleTime, formatCurrency } from "@/lib/format";
import { onVehicleCacheUpdate } from "@/lib/vehicleCache";
import { derivePrices } from "@/lib/pricing";
import type { Vehicle } from "@/lib/types";
import { TAX_TYPE_METADATA } from "@/lib/types";
import { useMounted } from "@/lib/useMounted";
import { getVehicleImageUrls, getVehiclePrimaryImageUrl } from "@/lib/vehicle-helpers";
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
import { cn } from "@/lib/ui";
import ImageModal from "@/app/components/ImageModal";
import { ConfirmDeleteModal } from "@/app/components/vehicles/ConfirmDeleteModal";
import { useDeleteVehicle } from "@/app/components/vehicles/useDeleteVehicle";
import { useToast } from "@/components/ui/glass/GlassToast";
import { ImageInput } from "@/components/ui/ImageInput";
import { TukTukIcon } from "@/components/icons/TukTukIcon";

// Helper to get proper image URL
const getImageUrl = (imageUrl: unknown): string | null => {
  return getVehiclePrimaryImageUrl(imageUrl, "w800-h600");
};

// Category options
type CategoryOption = "Cars" | "Motorcycles" | "Tuk Tuk";

const CATEGORY_OPTIONS: { value: CategoryOption; label: string; icon: React.ReactNode; color: string }[] = [
  {
    value: "Cars",
    label: "Cars",
    icon: <Car className="w-6 h-6" />,
    color: "#3b82f6",
  },
  {
    value: "Motorcycles",
    label: "Motorcycles",
    icon: <Bike className="w-6 h-6" />,
    color: "#8b5cf6",
  },
  {
    value: "Tuk Tuk",
    label: "TukTuks",
    icon: <TukTukIcon className="w-6 h-6" />,
    color: "#f97316",
  },
];

// Color mapping
const getColorHex = (colorName: string): string => {
  const colorMap: Record<string, string> = {
    "red": "#ef4444", "blue": "#3b82f6", "green": "#10b981", "yellow": "#f59e0b",
    "orange": "#f97316", "purple": "#8b5cf6", "pink": "#ec4899", "black": "#1a1a2e",
    "white": "#f8fafc", "gray": "#6b7280", "grey": "#6b7280", "silver": "#9ca3af",
    "gold": "#fbbf24", "brown": "#92400e", "beige": "#d4c5b0", "navy": "#1e3a8a",
    "teal": "#14b8a6", "cyan": "#06b6d4", "lime": "#84cc16", "maroon": "#991b1b",
    "olive": "#65a30d", "coral": "#f87171", "ivory": "#fffff0", "khaki": "#c3b091",
    "lavender": "#c4b5fd", "magenta": "#d946ef", "mint": "#6ee7b7", "peach": "#fdba74",
    "plum": "#a855f7", "tan": "#d2b48c", "turquoise": "#40e0d0", "violet": "#8b5cf6",
    "indigo": "#6366f1", "charcoal": "#374151", "cream": "#fffdd0", "burgundy": "#9f1239",
    "champagne": "#f7e7ce", "bronze": "#cd7f32", "copper": "#b87333", "rose": "#fb7185",
    "slate": "#475569", "emerald": "#10b981", "ruby": "#e11d48", "sapphire": "#1d4ed8",
    "amber": "#f59e0b", "jade": "#00a86b", "pearl": "#f0e6d2", "graphite": "#4b5563",
  };
  
  const normalizedColor = colorName.toLowerCase().trim();
  if (colorMap[normalizedColor]) return colorMap[normalizedColor];
  
  for (const [name, hex] of Object.entries(colorMap)) {
    if (normalizedColor.includes(name) || name.includes(normalizedColor)) {
      return hex;
    }
  }
  
  let hash = 0;
  for (let i = 0; i < colorName.length; i++) {
    hash = colorName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 50%)`;
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
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder=" "
          min={min}
          max={max}
          className={cn(
            "w-full px-3 py-3 bg-transparent text-sm text-slate-800 outline-none rounded-xl",
            Icon && "pl-10",
            "placeholder:text-transparent"
          )}
        />
        <label className={cn(
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
      {error && <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
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
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">
        Category <span className="text-rose-500">*</span>
      </label>
      <div className="grid grid-cols-3 gap-3">
        {CATEGORY_OPTIONS.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => !disabled && onChange(cat.value)}
            disabled={disabled}
            className={cn(
              "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
              value === cat.value
                ? "border-emerald-500 bg-emerald-50/50 shadow-md"
                : "border-slate-200 hover:border-slate-300 bg-white hover:shadow-sm",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
            >
              {cat.icon}
            </div>
            <span className="text-sm font-medium text-slate-700">{cat.label}</span>
            {value === cat.value && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
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

export default function ViewVehiclePage() {
  return <ViewVehicleInner />;
}

function ViewVehicleInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect to vehicles list if ID is a reserved word
  useEffect(() => {
    if (isReservedId) {
      router.push("/vehicles");
    }
  }, [isReservedId, router]);
  
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
      try {
        const cached = localStorage.getItem("vms-vehicles");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const found = (parsed as Vehicle[]).find((v) => v.VehicleId === id);
            if (found) {
              const cacheTime = localStorage.getItem("vms-vehicles-timestamp");
              const mutationTime = localStorage.getItem("vms-vehicles-last-mutation");
              const cacheAge = cacheTime ? Date.now() - parseInt(cacheTime, 10) : Infinity;
              const hasMutation = mutationTime && cacheTime && parseInt(mutationTime, 10) > parseInt(cacheTime, 10);
              
              if (cacheAge < 30000 && !hasMutation) {
                setVehicle(found);
                setLoading(false);
              }
            }
          }
        }
      } catch {
        // Ignore cache errors
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
        const currentVehicle = (() => {
          try {
            const cached = localStorage.getItem("vms-vehicles");
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed)) {
                return parsed.find((v: Vehicle) => v.VehicleId === id);
              }
            }
          } catch {
            // Ignore
          }
          return null;
        })();
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
      setImageValues(getVehicleImageUrls(vehicle.Images?.length ? vehicle.Images : vehicle.Image, "w800-h600"));
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
    if (!formData.Plate?.trim()) newErrors.Plate = "Plate number is required";
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
    router.push("/vehicles");
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
      <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
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
                onClick={() => router.push("/vehicles")}
                className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                Back to List
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Car className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Vehicle Not Found</h2>
            <p className="text-slate-500 mb-8">The vehicle you&apos;re looking for doesn&apos;t exist or has been removed.</p>
            <button
              onClick={() => router.push("/vehicles")}
              className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors shadow-md"
            >
              Back to Vehicles
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentVehicle = vehicle;
  const vehicleImageSource = currentVehicle.Images?.length ? currentVehicle.Images : currentVehicle.Image;
  const displayImageUrls = getVehicleImageUrls(vehicleImageSource, "w800-h600");
  const galleryImageUrls = getVehicleImageUrls(vehicleImageSource, "w1200-h900");
  const displayImageUrl = displayImageUrls[0] ?? getImageUrl(currentVehicle.Image);
  const taxTypeMeta = TAX_TYPE_METADATA.find((tt) => tt.value === currentVehicle.TaxType);
  const isTukTuk = currentVehicle.Category?.toLowerCase().includes("tuk");

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Professional Header Action Bar */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Back Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/vehicles")}
                className="inline-flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">Back to List</span>
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
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => setIsDeleteModalOpen(true)}
                      disabled={isDeleting}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-all duration-200"
                  >
                    <X className="w-4 h-4" />
                    <span className="hidden sm:inline">Cancel</span>
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
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
                      <div 
                        className="w-4 h-4 rounded-full border border-slate-200"
                        style={{ backgroundColor: getColorHex(currentVehicle.Color) }}
                      />
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
                      <label className="block text-sm font-medium text-slate-700">Description</label>
                      <textarea
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
                            <div 
                              className="w-5 h-5 rounded-full border border-slate-200"
                              style={{ backgroundColor: getColorHex(currentVehicle.Color) }}
                            />
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
