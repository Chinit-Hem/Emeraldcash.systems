"use client";

import { cn } from "@/lib/ui";
import { useAuthUser } from "@/app/components/AuthContext";
import DashboardHeader from "@/app/components/dashboard/DashboardHeader";
import DeleteConfirmationModal from "@/app/components/dashboard/DeleteConfirmationModal";
import FiltersBar from "@/app/components/dashboard/FiltersBar";
import { NeuKpiCard } from "@/components/ui/neu/NeuKpiCard";
import Pagination from "@/app/components/dashboard/Pagination";
import VehicleCardMobile from "@/app/components/dashboard/VehicleCardMobile";
import VehicleModal from "@/app/components/dashboard/VehicleModal";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { useDeleteVehicleOptimistic } from "@/app/components/vehicles/useDeleteVehicleOptimistic";
import { useUpdateVehicleOptimistic } from "@/app/components/vehicles/useUpdateVehicleOptimistic";
import { extractDriveFileId } from "@/lib/drive";
import { normalizeCategoryLabel, normalizeConditionLabel } from "@/lib/analytics";
import { useVehicles } from "@/lib/useVehicles";
import { isConfigError } from "@/lib/api";
import type { Vehicle, VehicleMeta } from "@/lib/types";
import { isIOSSafariBrowser } from "@/lib/platform";

import { useSearchParams } from "next/navigation";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/glass/GlassToast";
import { onVehicleCacheUpdate } from "@/lib/vehicleCache";
import { driveThumbnailUrl } from "@/lib/drive";
import { derivePrices } from "@/lib/pricing";
import { useRouter } from "next/navigation";
import { safeParseDate } from "@/lib/safeDate";
import { VirtualTable } from "@/lib/virtualized-table";

// iOS Vehicle Card Component with Image, Expand, and Admin Actions
interface IOSVehicleCardProps {
  vehicle: Vehicle;
  isAdmin: boolean;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
}

function IOSVehicleCard({ vehicle, isAdmin, onEdit, onDelete }: IOSVehicleCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const vehicleId = vehicle.VehicleId;
  const derived = derivePrices(vehicle.PriceNew);
  const price40 = vehicle.Price40 ?? derived.Price40;
  const price70 = vehicle.Price70 ?? derived.Price70;

  // Ensure Image is a string before using string methods
  const imageValue = typeof vehicle.Image === 'string' ? vehicle.Image : '';

  // Check if it's a full Cloudinary URL
  const isCloudinaryUrl = imageValue.includes('res.cloudinary.com');

  // Check if it's a Cloudinary public_id (not a full URL, contains folder path like "vehicles/cars/...")
  const isCloudinaryPublicId = imageValue &&
    !imageValue.startsWith('http') &&
    !imageValue.startsWith('data:') &&
    /^[a-zA-Z0-9_\-]+(\/[a-zA-Z0-9_\-]+)*$/.test(imageValue);

  // Extract Google Drive file ID if not Cloudinary
  const imageFileId = !isCloudinaryUrl && !isCloudinaryPublicId ? extractDriveFileId(imageValue) : null;

  const thumbUrl = useMemo(() => {
    if (isCloudinaryUrl) {
      // Use full Cloudinary URL directly - ensure it's a string
      return typeof vehicle.Image === 'string' ? vehicle.Image : '';
    }

    if (isCloudinaryPublicId && vehicle.Image) {
      // Convert public_id to full Cloudinary URL
      // URL format: https://res.cloudinary.com/{cloud}/image/upload/{public_id}
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dgntrakv6';
      const publicId = typeof vehicle.Image === 'string' ? vehicle.Image : '';
      return `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}`;
    }

    // Try Google Drive
    if (!imageFileId || imageError) return null;
    return `${driveThumbnailUrl(imageFileId, "w300-h300")}`;
  }, [isCloudinaryUrl, isCloudinaryPublicId, vehicle.Image, imageFileId, imageError]);

  const formatPrice = (price: number | null) => {
    if (price == null) return "-";
    return `$${price.toLocaleString()}`;
  };

  return (
    <div
      className="rounded-xl bg-white p-4 shadow-sm active:scale-[0.98] transition-transform dark:bg-gray-900"
      style={{
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      {/* Main Card Content */}
      <div
        className="flex gap-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Vehicle Image */}
        <div className="flex-shrink-0">
          {thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbUrl}
              alt={`${vehicle.Brand} ${vehicle.Model}`}
              className="h-16 w-16 rounded-xl object-cover ring-1 ring-black/10 bg-white"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="h-16 w-16 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center ring-1 ring-black/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-8 w-8 text-gray-400"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {vehicle.Brand || "-"} {vehicle.Model || "-"}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {vehicle.Year || "-"} • {vehicle.Category} • {vehicle.Plate || "-"}
              </p>
            </div>
            <span
              className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                vehicle.Condition === "New"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : vehicle.Condition === "Used"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              {vehicle.Condition || "Unknown"}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatPrice(vehicle.PriceNew)}
            </div>
            <div className="flex items-center text-gray-400 dark:text-gray-300">
              <span className="text-xs mr-1">{expanded ? "Less" : "More"}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Vehicle ID:</span>
              <p className="font-mono text-gray-900 dark:text-white">{vehicle.VehicleId || "-"}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Tax Type:</span>
              <p className="text-gray-900 dark:text-white">{vehicle.TaxType || "-"}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Body Type:</span>
              <p className="text-gray-900 dark:text-white">{vehicle.BodyType || "-"}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Color:</span>
              <p className="text-gray-900 dark:text-white">{vehicle.Color || "-"}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">D.O.C. 40%:</span>
              <p className="font-semibold text-orange-600 dark:text-orange-400">
                {formatPrice(price40)}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Vehicles 70%:</span>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatPrice(price70)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[iOS] View button clicked for vehicle:', vehicleId);
                router.push(`/vehicles/${encodeURIComponent(vehicleId)}/view`);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/35 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-500/30 rounded-xl font-medium active:scale-[0.98] transition-transform touch-manipulation min-h-[44px]"
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
              View
            </button>
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[iOS] Edit button clicked for vehicle:', vehicleId);
                    onEdit(vehicle);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl font-medium active:scale-[0.98] transition-transform touch-manipulation min-h-[44px]"
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
                  Edit
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[iOS] Delete button clicked for vehicle:', vehicleId);
                    onDelete(vehicle);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl font-medium active:scale-[0.98] transition-transform touch-manipulation min-h-[44px]"
                >
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
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


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


// Helper function to compute meta from vehicle array
// Defensive programming: handles undefined/null inputs safely
function computeVehicleMeta(vehicles: Vehicle[] | undefined | null): VehicleMeta {
  // Safe default return for undefined/null input
  const safeVehicles = vehicles ?? [];

  return {
    total: safeVehicles.length,
    countsByCategory: {
      Cars: safeVehicles.filter(v => normalizeCategoryLabel(v?.Category) === "Cars").length,
      Motorcycles: safeVehicles.filter(v => normalizeCategoryLabel(v?.Category) === "Motorcycles").length,
      TukTuks: safeVehicles.filter(v => normalizeCategoryLabel(v?.Category) === "TukTuks").length,
    },
    avgPrice: safeVehicles.length > 0
      ? safeVehicles.reduce((sum, v) => sum + (v?.PriceNew || 0), 0) / safeVehicles.length
      : 0,
    noImageCount: safeVehicles.filter(v => {
// Robust no-image check matching server logic
      const imageValue = typeof v?.Image === 'string' ? v.Image.trim() : '';
      const hasValidImage = imageValue && (
        imageValue.startsWith('http://') ||
        imageValue.startsWith('https://') ||
        imageValue.startsWith('data:') ||
        /^[a-zA-Z0-9_\-]+(\/[a-zA-Z0-9_\-]+)*$/.test(imageValue)  // Cloudinary public ID
      );
      return !hasValidImage;
    }).length,
    countsByCondition: {
      New: safeVehicles.filter(v => normalizeConditionLabel(v?.Condition) === "New").length,
      Used: safeVehicles.filter(v => normalizeConditionLabel(v?.Condition) === "Used").length,
    },
  };
}

// Removed deferMicrotask - using direct state updates for better performance

export default function VehiclesClient() {
  const user = useAuthUser();
  const searchParams = useSearchParams();
  const isAdmin = user.role === "Admin";
  const [isIOSSafari, setIsIOSSafari] = useState(false);

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    const timeoutId = setTimeout(() => setIsIOSSafari(isIOSSafariBrowser()), 0);
    return () => clearTimeout(timeoutId);
  }, []);


  // Local state for optimistic updates
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Track when optimistic updates are in progress to prevent useEffect from overwriting them
  const optimisticUpdateInProgress = useRef(false);

  // View mode: "all-time" shows API meta totals, "filtered" shows filtered totals
  const [viewMode, setViewMode] = useState<"all-time" | "filtered">("all-time");

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
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

  // Build API filters from UI filter state
  const apiFilters = useMemo((): import("@/lib/api").VehicleFilters => {
    const apiFilterParams: import("@/lib/api").VehicleFilters = {};

    if (filters.search?.trim()) {
      apiFilterParams.search = filters.search.trim();
    }

    if (filters.category && filters.category !== "All") {
      apiFilterParams.category = filters.category;
    }

    if (filters.brand && filters.brand !== "All") {
      apiFilterParams.brand = filters.brand;
    }

    if (filters.condition && filters.condition !== "All") {
      apiFilterParams.condition = filters.condition;
    }

    if (filters.color && filters.color !== "All") {
      apiFilterParams.color = filters.color;
    }

    if (filters.yearMin) {
      apiFilterParams.yearMin = parseInt(filters.yearMin);
    }

    if (filters.yearMax) {
      apiFilterParams.yearMax = parseInt(filters.yearMax);
    }

    if (filters.priceMin) {
      apiFilterParams.priceMin = parseFloat(filters.priceMin);
    }

    if (filters.priceMax) {
      apiFilterParams.priceMax = parseFloat(filters.priceMax);
    }

    if (filters.dateFrom) {
      apiFilterParams.dateFrom = filters.dateFrom;
    }

    if (filters.dateTo) {
      apiFilterParams.dateTo = filters.dateTo;
    }

    if (filters.withoutImage) {
      apiFilterParams.withoutImage = true;
    }

    return apiFilterParams;
  }, [
    filters.search,
    filters.category,
    filters.brand,
    filters.condition,
    filters.color,
    filters.yearMin,
    filters.yearMax,
    filters.priceMin,
    filters.priceMax,
    filters.dateFrom,
    filters.dateTo,
    filters.withoutImage,
  ]);

  // Use the robust vehicles hook with server-side filtering
  const { vehicles: fetchedVehicles, meta, loading, error, refetch, lastSyncTime } = useVehicles({
    noCache: true,
    filters: apiFilters,
  });

  // Sync fetched vehicles with local state
  useEffect(() => {
    // Skip sync if an optimistic update is in progress to prevent overwriting
    if (optimisticUpdateInProgress.current) {
      return;
    }
    // Use setTimeout to avoid synchronous setState in effect
    const timeoutId = setTimeout(() => setVehicles(fetchedVehicles), 0);
    return () => clearTimeout(timeoutId);
  }, [fetchedVehicles]);

  // Listen for cache updates from other components (e.g., after adding a vehicle)
  useEffect(() => {
    if (isIOSSafari) return;
    const unsubscribe = onVehicleCacheUpdate((updatedVehicles) => {
      // Update local state with fresh data from cache
      setVehicles(updatedVehicles);
    });
    return unsubscribe;
  }, [isIOSSafari]);

  // Sort state
  const [sortField, setSortField] = useState<keyof Vehicle | null>("Brand");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!isIOSSafari) return;
    // Use setTimeout to avoid synchronous setState in effect
    const timeoutId = setTimeout(() => setPageSize((prev) => (prev > 6 ? 6 : prev)), 0);
    return () => clearTimeout(timeoutId);
  }, [isIOSSafari]);

  // Modal state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Toast hook
  const { success: toastSuccess, error: toastError, addToast, removeToast } = useToast();

  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState<{
    stage: 'compressing' | 'uploading' | 'processing' | 'saving' | null;
    progress: number;
  }>({ stage: null, progress: 0 });

  // Optimistic update/delete hooks with toast notifications

  const { updateVehicle } = useUpdateVehicleOptimistic({
    onSuccess: (updatedVehicle) => {
      optimisticUpdateInProgress.current = false;
      setUploadProgress({ stage: null, progress: 0 }); // Reset progress
      toastSuccess(`${updatedVehicle.Brand} ${updatedVehicle.Model} updated successfully!`, 2000);
      // Update local state with server-confirmed data (includes new image URL)
      setVehicles((prev) =>
        prev.map((v) => (v.VehicleId === updatedVehicle.VehicleId ? updatedVehicle : v))
      );
      // Clear editing state
      setEditingVehicle(null);
    },
    onError: (error, originalVehicle) => {
      optimisticUpdateInProgress.current = false;
      setUploadProgress({ stage: null, progress: 0 }); // Reset progress
      toastError(`Failed to update ${originalVehicle.Brand}: ${error.message}`, 4000);
      // Rollback: restore original vehicle
      setVehicles((prev) =>
        prev.map((v) => (v.VehicleId === originalVehicle.VehicleId ? originalVehicle : v))
      );
    },
    onProgress: (stage, progress) => {
      setUploadProgress({ stage, progress });
    },
  });

  const { deleteVehicle, isDeleting } = useDeleteVehicleOptimistic({
    onSuccess: (vehicle) => {
      optimisticUpdateInProgress.current = false;
      toastSuccess(`${vehicle.Brand} ${vehicle.Model} deleted successfully!`, 2000);
      // Vehicle already removed optimistically, just ensure it's gone
      setVehicles((prev) => prev.filter((v) => v.VehicleId !== vehicle.VehicleId));
    },
    onError: (error, restoredVehicle) => {
      optimisticUpdateInProgress.current = false;
      toastError(`Failed to delete ${restoredVehicle.Brand}: ${error.message}`, 4000);
      // Restore: add vehicle back to list
      setVehicles((prev) => {
        if (prev.find((v) => v.VehicleId === restoredVehicle.VehicleId)) return prev;
        return [...prev, restoredVehicle];
      });
    },
  });



  // Check if server-side filtering is active (any API filter is set)
  const hasServerSideFilters = useMemo(() => {
    return !!(
      filters.search?.trim() ||
      (filters.category && filters.category !== "All") ||
      (filters.brand && filters.brand !== "All") ||
      (filters.condition && filters.condition !== "All") ||
      (filters.color && filters.color !== "All") ||
      filters.yearMin ||
      filters.yearMax ||
      filters.priceMin ||
      filters.priceMax ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.withoutImage
    );
  }, [filters]);

  // Filter and sort vehicles
  // NOTE: When server-side filters are active, we skip client-side filtering
  // because the API already returns filtered results
  const filteredVehicles = useMemo((): Vehicle[] => {
    let result: Vehicle[] = [...vehicles];

    // When server-side filtering is active, the API already filtered the data
    // We only need to apply sorting
    if (hasServerSideFilters) {
      // Apply sorting only
      if (sortField) {
        result.sort((a, b) => {
          const aVal = a[sortField];
          const bVal = b[sortField];

          if (aVal === null || aVal === undefined) return sortDirection === "asc" ? 1 : -1;
          if (bVal === null || bVal === undefined) return sortDirection === "asc" ? -1 : 1;

          if (typeof aVal === "string" && typeof bVal === "string") {
            return sortDirection === "asc"
              ? aVal.localeCompare(bVal)
              : bVal.localeCompare(aVal);
          }

          if (typeof aVal === "number" && typeof bVal === "number") {
            return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
          }

          return 0;
        });
      }
      return result;
    }

    // Client-side filtering (when no server-side filters are active)
    // Apply filters - Search ALL vehicle fields
    if (filters.search) {
      const searchLower = filters.search.toLowerCase().trim();
      const searchNumber = parseFloat(filters.search);

      // Normalize search term for category matching (handles "tuk tuk" -> "TukTuks")
      const normalizedSearchCategory = normalizeCategoryLabel(searchLower);

      // Also create a version without spaces for flexible matching
      const searchNoSpaces = searchLower.replace(/\s+/g, '');

      result = result.filter((v) => {
        // Normalize vehicle category
        const normalizedVehicleCategory = normalizeCategoryLabel(v.Category);

        // Check if search matches category (using normalized values)
        // This handles: "tuk tuk" -> "TukTuks", "car" -> "Cars", etc.
        const categoryMatch =
          normalizedSearchCategory !== "Other" && normalizedSearchCategory === normalizedVehicleCategory;

        // Also check raw category string for partial matches (with and without spaces)
        const categoryRaw = v.Category?.toLowerCase() || "";
        const categoryPartialMatch = categoryRaw.includes(searchLower) ||
                                     categoryRaw.includes(searchNoSpaces);

        // Check if search term without spaces matches category without spaces
        // This handles: "tuk" matching "tuktuks", "tuk tuk" matching "tuktuks"
        const categoryNoSpaces = categoryRaw.replace(/\s+/g, '');
        const categoryFlexibleMatch = searchNoSpaces.length >= 2 && categoryNoSpaces.includes(searchNoSpaces);

        // Text fields to search
        const textMatch =
          v.Brand?.toLowerCase().includes(searchLower) ||
          v.Model?.toLowerCase().includes(searchLower) ||
          v.Plate?.toLowerCase().includes(searchLower) ||
          categoryMatch ||
          categoryPartialMatch ||
          categoryFlexibleMatch ||
          v.Condition?.toLowerCase().includes(searchLower) ||
          v.Color?.toLowerCase().includes(searchLower) ||
          v.TaxType?.toLowerCase().includes(searchLower) ||
          v.BodyType?.toLowerCase().includes(searchLower) ||
          v.VehicleId?.toString().toLowerCase().includes(searchLower) ||
          v.Year?.toString().includes(searchLower);

        // Numeric fields - match if search is a valid number
        let numberMatch = false;
        if (!isNaN(searchNumber)) {
          numberMatch =
            v.PriceNew === searchNumber ||
            v.Price40 === searchNumber ||
            v.Price70 === searchNumber ||
            v.Year === searchNumber;
        }

        return textMatch || numberMatch;
      });
    }

    if (filters.category !== "All") {
      result = result.filter((v) => {
        const vehicleCategory = normalizeCategoryLabel(v.Category);
        return vehicleCategory === filters.category;
      });
    }

    if (filters.brand !== "All") {
      result = result.filter((v) => v.Brand === filters.brand);
    }

    if (filters.condition !== "All") {
      result = result.filter((v) => normalizeConditionLabel(v.Condition) === filters.condition);
    }

    if (filters.color !== "All") {
      result = result.filter((v) => v.Color === filters.color);
    }

    if (filters.dateFrom) {
      const fromDate = safeParseDate(filters.dateFrom);
      if (fromDate) {
        result = result.filter((v) => {
          const vehicleDate = safeParseDate(v.Time);
          return vehicleDate && vehicleDate >= fromDate;
        });
      }
    }

    if (filters.dateTo) {
      const toDate = safeParseDate(filters.dateTo);
      if (toDate) {
        toDate.setHours(23, 59, 59, 999); // End of day
        result = result.filter((v) => {
          const vehicleDate = safeParseDate(v.Time);
          return vehicleDate && vehicleDate <= toDate;
        });
      }
    }

    if (filters.yearMin) {
      result = result.filter((v) => v.Year && v.Year >= parseInt(filters.yearMin));
    }

    if (filters.yearMax) {
      result = result.filter((v) => v.Year && v.Year <= parseInt(filters.yearMax));
    }

    if (filters.priceMin) {
      result = result.filter((v) => v.PriceNew && v.PriceNew >= parseFloat(filters.priceMin));
    }

    if (filters.priceMax) {
      result = result.filter((v) => v.PriceNew && v.PriceNew <= parseFloat(filters.priceMax));
    }

    // Filter for vehicles without images
    // A vehicle has no image if both image_id AND thumbnail_url are missing/empty
    if (filters.withoutImage) {
      result = result.filter((vehicle) => {
        const imageValue = vehicle.Image;
        // Check if Image field is empty or null
        if (!imageValue || typeof imageValue !== 'string' || !imageValue.trim()) return true;

        // Check if it's a valid image URL (Drive, Cloudinary, or data URL)
        const isUrl =
          imageValue.startsWith('http://') ||
          imageValue.startsWith('https://') ||
          imageValue.startsWith('data:');

        // Check if it's a Cloudinary public_id (folder/path format like "vehicles/cars/abc123")
        const isCloudinaryPublicId = /^[a-zA-Z0-9_\-]+(\/[a-zA-Z0-9_\-]+)*$/.test(imageValue);

        return !(isUrl || isCloudinaryPublicId);
      });
    }

    // Apply sorting
    if (sortField) {
      result.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];

        if (aVal === null || aVal === undefined) return sortDirection === "asc" ? 1 : -1;
        if (bVal === null || bVal === undefined) return sortDirection === "asc" ? -1 : 1;

        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortDirection === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }

        return 0;
      });
    }

    return result;
  }, [vehicles, filters, sortField, sortDirection, hasServerSideFilters]);

  // Pagination
  const totalPages = Math.ceil(filteredVehicles.length / pageSize);
  const paginatedVehicles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVehicles.slice(start, start + pageSize);
  }, [filteredVehicles, currentPage, pageSize]);

  // Reset page when filters change - use setTimeout to avoid synchronous setState in effect
  useEffect(() => {
    const timeoutId = setTimeout(() => setCurrentPage(1), 0);
    return () => clearTimeout(timeoutId);
  }, [filters.search, filters.category, filters.brand, filters.condition, filters.color, filters.yearMin, filters.yearMax, filters.priceMin, filters.priceMax, filters.dateFrom, filters.dateTo, filters.withoutImage, pageSize]);

  // Initialize filters from URL query params (so dashboard links like
  // `/vehicles?category=car&condition=new&noImage=1` work).
  const categoryParam = searchParams.get("category");
  const conditionParam = searchParams.get("condition");
  const withoutImageParam = searchParams.get("withoutImage");
  const noImageParam = searchParams.get("noImage") || withoutImageParam;

  useEffect(() => {
    const nextCategory = categoryParam ? normalizeCategoryLabel(categoryParam) : "All";
    const nextCondition = conditionParam ? normalizeConditionLabel(conditionParam) : "All";
    const nextWithoutImage = noImageParam === "1" || noImageParam === "true";

    // Use setTimeout to avoid synchronous setState in effect
    const timeoutId = setTimeout(() => {
      setFilters((prev) => {
        // Avoid no-op state writes that can cause render loops on some mobile browsers.
        if (
          prev.category === nextCategory &&
          prev.condition === nextCondition &&
          prev.withoutImage === nextWithoutImage
        ) {
          return prev;
        }

        return {
          ...prev,
          category: nextCategory,
          condition: nextCondition,
          withoutImage: nextWithoutImage,
        };
      });
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [categoryParam, conditionParam, noImageParam]);


  // Check if filters are active
  const isFiltered = useMemo(() => {
    return (
      filters.search !== "" ||
      filters.category !== "All" ||
      filters.brand !== "All" ||
      filters.yearMin !== "" ||
      filters.yearMax !== "" ||
      filters.priceMin !== "" ||
      filters.priceMax !== "" ||
      filters.condition !== "All" ||
      filters.color !== "All" ||
      filters.dateFrom !== "" ||
      filters.dateTo !== "" ||
      filters.withoutImage
    );
  }, [filters]);

  // Compute filtered meta for when filters are active
  const filteredMeta = useMemo(() => computeVehicleMeta(filteredVehicles), [filteredVehicles]);

  // KPI calculations - use API meta for all-time, filteredMeta for filtered view
  // This fixes the mismatch: meta.total = actual count, NOT max(ID)
  // Using double optional chaining (??) to prevent undefined errors on iPhone Safari
  const kpis = useMemo(() => {
    const isFilteredView = viewMode === "filtered" && isFiltered;

    if (isFilteredView) {
      return {
        total: filteredMeta?.total ?? 0,
        cars: filteredMeta?.countsByCategory?.Cars ?? 0,
        motorcycles: filteredMeta?.countsByCategory?.Motorcycles ?? 0,
        tukTuks: filteredMeta?.countsByCategory?.TukTuks ?? 0,
        avgPrice: filteredMeta?.avgPrice ?? 0,
      };
    }

    // All-time view: use API meta (source of truth)
    // Defensive: ensure meta and countsByCategory exist before accessing properties
    return {
      total: meta?.total ?? vehicles?.length ?? 0,
      cars: meta?.countsByCategory?.Cars ?? 0,
      motorcycles: meta?.countsByCategory?.Motorcycles ?? 0,
      tukTuks: meta?.countsByCategory?.TukTuks ?? 0,
      avgPrice: meta?.avgPrice ?? 0,
    };
  }, [filteredMeta, meta, vehicles, viewMode, isFiltered]);


  // Handlers - Optimized with useCallback for instant response
  const handleSort = useCallback((field: keyof Vehicle) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }, [sortField]);

  const handleAdd = useCallback(() => {
    setSelectedVehicle(null);
    setEditingVehicle(null);
    setIsAddEditModalOpen(true);
  }, []);

  const handleEditClick = useCallback((vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setEditingVehicle(vehicle);
    setIsAddEditModalOpen(true);
  }, []);

  const handleDeleteClick = useCallback((vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDeleteModalOpen(true);
  }, []);

  // Instant filter handlers for KPI cards
  const handleTotalClick = useCallback(() => {
    setFilters(prev => ({ ...prev, category: "All" }));
    setViewMode("all-time");
  }, []);

  const handleCarsClick = useCallback(() => {
    setFilters(prev => ({ ...prev, category: "Cars" }));
    setViewMode("filtered");
  }, []);

  const handleMotorcyclesClick = useCallback(() => {
    setFilters(prev => ({ ...prev, category: "Motorcycles" }));
    setViewMode("filtered");
  }, []);

  const handleTukTuksClick = useCallback(() => {
    setFilters(prev => ({ ...prev, category: "TukTuks" }));
    setViewMode("filtered");
  }, []);

  const handlePriceClick = useCallback(() => {
    setSortField("PriceNew");
    setSortDirection("desc");
  }, []);


  // Handle adding a new vehicle (POST /api/vehicles)
  const handleSaveVehicle = async (data: Partial<Vehicle>, imageFile?: File): Promise<void> => {
    const formData = new FormData();

    // Create Mapping between Frontend Fields and Database Fields
    // Don't send Price40 or Price70 as they are calculated values not in DB
    const fieldMapping: Record<string, string> = {
      'PriceNew': 'market_price',  // DB column name
      'Brand': 'brand',
      'Model': 'model',
      'Year': 'year',
      'Category': 'category',
      'Condition': 'condition',
      'Color': 'color',
      'Plate': 'plate',
      'TaxType': 'tax_type',
      'BodyType': 'body_type',
      'VehicleId': 'vehicle_id',
      'Image': 'image',
      'Time': 'time',
      // Note: Price40 and Price70 are not included here as they don't exist in DB
    };

    Object.entries(data).forEach(([key, value]) => {
      // Skip fields not in the mapping (like Price40, Price70)
      if (!fieldMapping[key]) {
        return;
      }

      // Validation: Don't append undefined, null, or string "undefined"
      const isInvalid =
        value === undefined ||
        value === null ||
        value === "undefined" ||
        value === "NaN" ||
        (typeof value === 'number' && isNaN(value));

      if (!isInvalid) {
        // Use Database Field Name instead of Frontend Field Name
        const dbFieldName = fieldMapping[key];
        formData.append(dbFieldName, String(value));
      }
      // If invalid, just skip (omit) - PostgreSQL prefers missing key over "undefined"
    });

    if (imageFile) {
      formData.append("image", imageFile);
    }

    // Debug Log: See actual values being sent to Server
    console.log("[handleSaveVehicle] Payload to be sent:");
    for (const pair of formData.entries()) {
      console.log(pair[0], pair[1]);
    }

    const response = await fetch('/api/vehicles', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to save vehicle");
    }
    // Return void instead of response.json() to match expected signature
    await response.json();
  };

  // Unified handler that routes to add or update based on editingVehicle state
  const handleSubmitVehicle = async (data: Partial<Vehicle>, imageFile?: File | null): Promise<void> => {
    if (editingVehicle) {
      // UPDATE mode: Use updateVehicle with Cloudinary upload
      console.log("[handleSubmitVehicle] UPDATE mode - using updateVehicle", {
        vehicleId: editingVehicle.VehicleId,
        hasImageFile: !!imageFile,
        hasImageInData: !!data.Image,
      });

      // Set optimistic update flag to prevent useEffect from overwriting
      optimisticUpdateInProgress.current = true;

      // Use the updateVehicle hook which handles Cloudinary upload and PUT request
      await updateVehicle(editingVehicle.VehicleId, data, editingVehicle, imageFile || null);

      // Close modal and clear editing state on success
      // (onSuccess callback handles this, but we also do it here as backup)
      setIsAddEditModalOpen(false);
      setEditingVehicle(null);
      setSelectedVehicle(null);
    } else {
      // ADD mode: Use handleSaveVehicle with FormData POST
      console.log("[handleSubmitVehicle] ADD mode - using handleSaveVehicle", {
        hasImageFile: !!imageFile,
      });

      await handleSaveVehicle(data, imageFile ?? undefined);

      // Close modal and refresh vehicle list
      setIsAddEditModalOpen(false);
      // Trigger a refetch to get the new vehicle
      void refetch();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedVehicle?.VehicleId) return;

    // Close modal immediately for instant feedback
    setIsDeleteModalOpen(false);
    setSelectedVehicle(null);

    const loadingToastId = addToast("Deleting vehicle...", "info");

    // Optimistic delete: remove from UI immediately
    setVehicles((prev) => prev.filter((v) => v.VehicleId !== selectedVehicle.VehicleId));

    try {
      await deleteVehicle(selectedVehicle);
      removeToast(loadingToastId);
    } catch {
      removeToast(loadingToastId);
      // Error is handled by onError callback (restore happens there)
    }
  };


  if (isIOSSafari) {
    const safeTotalPages = Math.max(1, totalPages);
    const safeCurrentPage = Math.min(currentPage, safeTotalPages);

    return (
      <>
        <div className="min-h-screen pb-20 lg:pb-0 bg-gray-50 dark:bg-gray-950">
          <div className="mx-auto max-w-4xl p-4 sm:p-6">
            {/* iOS Status Bar */}
            <div className="mb-4 rounded-lg bg-emerald-600 px-4 py-3 text-white shadow-md">
              <p className="text-xs font-medium">iOS Compatibility Mode • {filteredVehicles.length} vehicles</p>
            </div>

            {/* iOS Search Bar */}
            <div className="mb-4 rounded-xl bg-white p-1 shadow-sm dark:bg-gray-900">
              <div className="flex items-center gap-2 px-3 py-2">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      search: event.target.value,
                    }))
                  }
                  placeholder="Search vehicles..."
                  className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
                />
              </div>
            </div>

            {/* Show content immediately - no loading blocker */}
            {error ? (
              <div className="rounded-2xl bg-red-50 p-6 text-center shadow-sm dark:bg-red-900/20">
                <p className="mb-3 text-sm text-red-700 dark:text-red-300">{error}</p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-md active:scale-95 transition-transform"
                >
                  Retry
                </button>
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-gray-900">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">No vehicles found</p>
              </div>
            ) : (
              <>
                {/* iOS Vehicle Card List with Images and Expand */}
                <div className="space-y-3">
                  {paginatedVehicles.map((vehicle) => (
                    <IOSVehicleCard
                      key={vehicle.VehicleId}
                      vehicle={vehicle}
                      isAdmin={isAdmin}
                      onEdit={handleEditClick}
                      onDelete={handleDeleteClick}
                    />
                  ))}
                </div>

                {/* iOS Pagination */}
                <div className="mt-4 flex items-center justify-between rounded-xl bg-white p-3 shadow-sm dark:bg-gray-900">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={safeCurrentPage <= 1}
                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95 transition-transform dark:text-gray-300"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Prev
                  </button>

                  <div className="flex items-center gap-1">
                    <span className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white">
                      {safeCurrentPage}
                    </span>
                    <span className="text-sm text-gray-400">/</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {safeTotalPages}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(safeTotalPages, prev + 1))}
                    disabled={safeCurrentPage >= safeTotalPages}
                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95 transition-transform dark:text-gray-300"
                  >
                    Next
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Modals - Added for iOS */}
        <VehicleModal
          isOpen={isAddEditModalOpen}
          vehicle={selectedVehicle}
          onClose={() => setIsAddEditModalOpen(false)}
          onSave={handleSubmitVehicle}
        />

        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          vehicle={selectedVehicle}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          isDeleting={isDeleting}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen pb-20 lg:pb-0 bg-[#e0e5ec]">
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
        {/* Header - Neumorphism Style */}
        <div className="mb-6">
          <DashboardHeader />
        </div>

        {isIOSSafari ? (
          <div className="mb-4 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-900/20 dark:text-amber-200">
            iPhone Safari compatibility mode is active to prevent tab crashes on large vehicle lists.
          </div>
        ) : null}

        {/* Data Status Bar - Neumorphism Style - ALWAYS SHOW */}
        <div className="relative z-[1] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 p-5 bg-[#e0e5ec] rounded-[20px] shadow-[8px_8px_16px_#a3b1c6,-8px_-8px_16px_#ffffff]">
          {/* Left Section - Info & Controls */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-6 text-sm">
            {/* Last Sync */}
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-4 w-4 text-emerald-500"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
              <span>
                Last sync: <span className="font-medium text-gray-900 dark:text-gray-100">{lastSyncTime ? lastSyncTime.toLocaleString() : "Never"}</span>
              </span>
            </div>

            {/* NEW: Tiny Background Refresh Indicator */}
            {loading && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                <span className="text-xs text-emerald-600 font-medium">background refresh</span>
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={() => void refetch()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-fit"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>

            {/* Active Filters Count */}
            {isFiltered && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
                  {[
                    filters.search,
                    filters.category !== "All" ? filters.category : null,
                    filters.brand !== "All" ? filters.brand : null,
                    filters.condition !== "All" ? filters.condition : null,
                    filters.color !== "All" ? filters.color : null,
                    filters.yearMin || filters.yearMax ? "Year" : null,
                    filters.priceMin || filters.priceMax ? "Price" : null,
                    filters.dateFrom || filters.dateTo ? "Date" : null,
                    filters.withoutImage ? "No Image" : null,
                  ].filter(Boolean).length} active
                </span>
              </div>
            )}
          </div>

          {/* Center/Right Section - View Mode Toggle & Clear Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            {/* View Mode Toggle - Mobile-First Responsive */}
            <div className="ec-status-toggle flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-gray-100/80 dark:bg-gray-700/50 rounded-lg p-1 w-full sm:w-auto">
              <button
                onClick={() => setViewMode("all-time")}
                className={`ec-status-btn flex-1 sm:flex-initial min-h-[44px] px-4 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                  viewMode === "all-time"
                    ? "ec-status-btn-active bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "ec-status-btn-inactive text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
              >
                All-time Totals
              </button>
              <button
                onClick={() => setViewMode("filtered")}
                disabled={!isFiltered}
                className={`ec-status-btn flex-1 sm:flex-initial min-h-[44px] px-4 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                  viewMode === "filtered"
                    ? "ec-status-btn-active bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "ec-status-btn-inactive text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                }`}
              >
                Filtered Results
              </button>
            </div>

            {/* Clear Filters Button */}
            {isFiltered && (
              <GlassButton
                onClick={() => {
                  setFilters({
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
                  setViewMode("all-time");
                }}
                className="text-sm w-full sm:w-auto justify-center"
                variant="outline"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-4 w-4 mr-1"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
                Clear Filters
              </GlassButton>
            )}
          </div>
        </div>



        {/* KPI Cards - Professional Neumorphism Design */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <NeuKpiCard
            category="total"
            label={viewMode === "filtered" && isFiltered ? "Filtered Vehicles" : "Total Vehicles"}
            value={kpis.total.toLocaleString()}
            subtitle={viewMode === "filtered" && isFiltered ? `of ${meta?.total ?? vehicles.length} total` : undefined}
            onClick={handleTotalClick}
            isActive={filters.category === "All"}
          />
          <NeuKpiCard
            category="cars"
            label="Cars"
            value={kpis.cars.toLocaleString()}
            onClick={handleCarsClick}
            isActive={filters.category === "Cars"}
          />
          <NeuKpiCard
            category="motorcycles"
            label="Motorcycles"
            value={kpis.motorcycles.toLocaleString()}
            onClick={handleMotorcyclesClick}
            isActive={filters.category === "Motorcycles"}
          />
          <NeuKpiCard
            category="tuktuks"
            label="Tuk Tuks"
            value={kpis.tukTuks.toLocaleString()}
            onClick={handleTukTuksClick}
            isActive={filters.category === "TukTuks"}
          />
          <NeuKpiCard
            category="price"
            label="Avg Price"
            value={kpis.avgPrice > 0 ? `$${Math.round(kpis.avgPrice).toLocaleString()}` : "-"}
            onClick={handlePriceClick}
          />
        </div>


        {/* Add Button - Professional Neumorphism */}
        {isAdmin && (
          <div className="mb-6">
            <button
              onClick={handleAdd}
              className={cn(
                "group flex items-center gap-3 px-6 py-3.5 rounded-xl",
                "bg-[#e0e5ec] text-[#2ecc71]",
                "shadow-[6px_6px_12px_#bebebe,-6px_-6px_12px_#ffffff]",
                "hover:shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff]",
                "active:shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff]",
                "hover:text-[#27ad60]",
                "transition-all duration-200",
                "w-full sm:w-auto",
                "font-semibold text-sm"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-lg",
                "bg-[#2ecc71] text-white",
                "shadow-[2px_2px_4px_#27ad60,-2px_-2px_4px_#35eb82]",
                "group-hover:shadow-[inset_2px_2px_4px_#27ad60,inset_-2px_-2px_4px_#35eb82]",
                "transition-all duration-200"
              )}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  className="h-5 w-5"
                >
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
              </div>
              <span>Add Vehicle</span>
            </button>
          </div>
        )}

        {/* Filters Section */}
        <div className="mb-6 relative z-10">
          <FiltersBar
            filters={filters}
            onFilterChange={setFilters}
            vehicles={vehicles}
            resultCount={filteredVehicles.length}
            totalCount={viewMode === "filtered" ? filteredVehicles.length : (meta?.total ?? vehicles.length)}
            isFiltered={isFiltered}
            onClearFilters={() => {
              setFilters({
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
              setViewMode("all-time");
            }}
          />
        </div>

          {/* Content Section - Neumorphism Style */}
          <div className="rounded-[20px] overflow-hidden bg-[#e0e5ec] shadow-[8px_8px_16px_#a3b1c6,-8px_-8px_16px_#ffffff]">
            {/* Error State - Show immediately */}
            {error && (
              <div className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="h-8 w-8 text-red-600 dark:text-red-400"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" x2="12" y1="8" y2="12" />
                    <line x1="12" x2="12.01" y1="16" y2="16" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Failed to load vehicles
                </h3>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-2xl mx-auto">
                  <p className="whitespace-pre-line">{error}</p>

                  {/* Dev mode: Show detailed error information */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-left">
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">
                        Development Mode - Error Details:
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400 font-mono">
                        Check browser console for full error stack trace
                      </p>
                    </div>
                  )}

                  {/* Config error: Show setup instructions */}
                  {isConfigError(error) && (
                    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-left border border-amber-200 dark:border-amber-800">
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-2">
                        Setup Instructions:
                      </p>
                      <ol className="text-xs text-amber-700 dark:text-amber-300 list-decimal list-inside space-y-1">
                        <li>Create a <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">.env.local</code> file in your project root</li>
                        <li>Add: <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">NEXT_PUBLIC_API_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec</code></li>
                        <li>Replace with your actual Google Apps Script URL</li>
                        <li>Restart the development server</li>
                      </ol>
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <GlassButton onClick={() => refetch()}>Try Again</GlassButton>
                  {process.env.NODE_ENV === 'development' && (
                    <GlassButton
                      onClick={() => window.location.reload()}
                      variant="outline"
                    >
                      Reload Page
                    </GlassButton>
                  )}
                </div>
              </div>
            )}

            {/* NEW: Background Refresh Indicator - Tiny dot only */}
            {loading && (
              <div className="flex items-center justify-center p-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                  <span className="text-sm text-slate-500 font-medium">Refreshing data...</span>
                </div>
              </div>
            )}

            {/* Empty State - Show when no data (not loading) */}
            {!loading && !error && filteredVehicles.length === 0 && (

            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-8 w-8 text-gray-400"
                >
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                  <circle cx="7" cy="17" r="2" />
                  <path d="M9 17h6" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No vehicles found
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {vehicles.length === 0
                  ? "Get started by adding your first vehicle."
                  : "Try adjusting your filters to see more results."}
              </p>
            </div>
          )}

          {/* Data Display */}
          {!loading && !error && filteredVehicles.length > 0 && (
            <>
              {/* NEW: VirtualTable - 60fps Infinite Scrolling */}
              {!isIOSSafari ? (
                <div className="h-[70vh] min-h-[400px]">
                  <VirtualTable
                    vehicles={filteredVehicles}
                    height={70 * 16} // 70vh in pixels (16px base)
                    itemSize={80}
                    isAdmin={isAdmin}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </div>
              ) : null}


              {/* Mobile Cards - Keep pagination for iOS */}
              <div className={isIOSSafari ? "space-y-3 p-4" : "lg:hidden space-y-3 p-4"}>
                {paginatedVehicles.map((vehicle, index) => (
                  <VehicleCardMobile
                    key={vehicle.VehicleId || `mobile-${index}`}
                    vehicle={vehicle}
                    index={index}
                    isAdmin={isAdmin}
                    disableImages={isIOSSafari}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </div>

              {/* Mobile Pagination Only */}
              {isIOSSafari && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredVehicles.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              )}


            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <VehicleModal
        isOpen={isAddEditModalOpen}
        vehicle={selectedVehicle}
        onClose={() => setIsAddEditModalOpen(false)}
        onSave={handleSubmitVehicle}
        uploadProgress={uploadProgress}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        vehicle={selectedVehicle}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />

    </div>
  );
}
