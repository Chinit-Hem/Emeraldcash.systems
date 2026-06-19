"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ImageModal from "@/shared/components/ImageModal";
import { formatCurrency, formatVehicleTime, formatVehicleId } from "@/shared/utils/format";
import { driveThumbnailUrl, extractDriveFileId } from "@/shared/utils/drive";
import type { Vehicle } from "@/shared/types/types";
import { TAX_TYPE_METADATA } from "@/shared/types/types";
import { cn } from "@/shared/utils/ui";
import { withVehicleListQueryFallback } from "@/systems/vms/utils/vehicleListState";
import { useVehicleListBackLink } from "@/systems/vms/hooks/useVehicleListBackLink";
import { getCanonicalBrandName, getDisplayBrandName, getDisplayModelName } from "@/systems/vms/utils/vehicleBrandMetadata";

// Modern Icon Components
const Icons = {
  Back: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  Edit: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  ),
  Delete: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  ),
  List: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  ),
  Clock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Category: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M4 7V4h3" />
      <path d="M17 4h3v3" />
      <path d="M4 17v3h3" />
      <path d="M17 20h3v-3" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Plate: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="7" width="18" height="10" rx="2" />
      <path d="M7 10h.01" />
      <path d="M17 10h.01" />
    </svg>
  ),
  Year: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Color: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="10" />
      <path d="m4.9 4.9 14.2 14.2" />
    </svg>
  ),
  Condition: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  BodyType: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  ),
  Tax: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 2v20" />
      <path d="M2 12h20" />
      <path d="m4.9 4.9 14.2 14.2" />
      <path d="m19.1 4.9-14.2 14.2" />
    </svg>
  ),
  Image: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  ),
  Expand: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="m21 21-6-6m6 6v-4.8m0 4.8h-4.8" />
      <path d="M3 16.2V21m0 0h4.8M3 21l6-6" />
    </svg>
  ),
  Price: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  Info: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  ),
};

interface VehicleDetailsCardProps {
  vehicle: Vehicle;
  userRole: "Admin" | "Staff" | "Viewer" | string;
  onEdit?: () => void;
  onDelete?: () => void | Promise<void>;
  isDeleting?: boolean;
}

export function VehicleDetailsCard({
  vehicle,
  userRole,
  onEdit,
  onDelete,
  isDeleting = false,
}: VehicleDetailsCardProps) {
  const router = useRouter();
  const { href: listHref, label: backToListLabel, searchParams } = useVehicleListBackLink();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const isAdmin = userRole === "Admin";
  const canEdit = isAdmin;  // Only Admin can edit vehicles
  const canDelete = isAdmin;

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else {
      router.push(withVehicleListQueryFallback(`/vehicles/${vehicle.VehicleId}/edit`, searchParams));
    }
  };

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete();
    }
    setIsDeleteDialogOpen(false);
  };

  const handleBackToList = () => {
    router.replace(listHref, { scroll: false });
  };

  // Helper to get proper image URL
  const getImageUrl = (imageUrl: unknown): string | null => {
    if (imageUrl === null || imageUrl === undefined) return null;

    let url: string;
    if (Array.isArray(imageUrl)) {
      if (imageUrl.length === 0) return null;
      const firstElement = imageUrl[0];
      if (typeof firstElement !== 'string') return null;
      url = firstElement;
    } else if (typeof imageUrl === 'string') {
      url = imageUrl;
    } else {
      try {
        url = String(imageUrl);
        if (url === '[object Object]' || url === 'undefined' || url === 'null') return null;
      } catch {
        return null;
      }
    }

    if (!url || typeof url !== 'string' || !url.trim() || url === 'undefined' || url === 'null') return null;

    if (url.includes('res.cloudinary.com')) return url;

    const fileId = extractDriveFileId(url);
    if (fileId) {
      return driveThumbnailUrl(fileId, "w800-h600");
    }

    return url;
  };

  const displayImageUrl = getImageUrl(vehicle.Image);
  const taxTypeMeta = TAX_TYPE_METADATA.find((tt) => tt.value === vehicle.TaxType);
  const displayBrand = getDisplayBrandName(vehicle.Brand);
  const modelDisplay = getDisplayModelName(vehicle.Model);

  // Color mapping for visual indicator
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

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 pb-32 md:pb-8">
        {/* Header Section */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleBackToList}
                  aria-label="Back to vehicle list"
                  title="Back to vehicle list"
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <Icons.Back />
                </button>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Vehicle Details
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    ID: {formatVehicleId(vehicle.VehicleId)}
                  </p>
                </div>
              </div>

              {/* Category Badge */}
              <span className={cn(
                "px-4 py-2 rounded-full text-sm font-semibold shadow-sm",
                vehicle.Category === "Cars" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                vehicle.Category === "Motorcycles" && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
                vehicle.Category?.toLowerCase().includes("tuk") && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
                !["Cars", "Motorcycles"].includes(vehicle.Category || "") && !vehicle.Category?.toLowerCase().includes("tuk") && "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
              )}>
                {vehicle.Category?.toLowerCase().includes("tuk") ? "TukTuks" : vehicle.Category}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left Column - Image (7 columns) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Main Image Card */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 overflow-hidden border border-slate-100 dark:border-slate-700">
                {displayImageUrl ? (
                  <div
                    className="relative aspect-[16/10] cursor-pointer group overflow-hidden"
                    onClick={() => setIsImageModalOpen(true)}
                  >
                    <img
                      src={displayImageUrl}
                      alt={`${vehicle.Brand} ${vehicle.Model}`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Click to expand button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        <Icons.Expand />
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">Click to Enlarge</span>
                      </div>
                    </div>

                    {/* Thumbnail label */}
                    <div className="absolute top-4 left-4">
                      <span className="bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium">
                        Thumbnail
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-[16/10] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex flex-col items-center justify-center p-8">
                    <div className="w-24 h-24 rounded-2xl bg-white dark:bg-slate-600 shadow-lg flex items-center justify-center mb-4">
                      <Icons.Image />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                      No image available
                    </p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                      Upload an image to showcase this vehicle
                    </p>
                  </div>
                )}
              </div>

              {/* Vehicle Title Card - Mobile Only */}
              <div className="lg:hidden bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-slate-900/30 p-6 border border-slate-100 dark:border-slate-700">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {displayBrand} {modelDisplay}
                </h2>
                <div className="flex items-center gap-3 mt-3 text-slate-600 dark:text-slate-400">
                  <span className="font-mono text-sm bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-lg">
                    {vehicle.Plate || "No Plate"}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-sm font-medium">{vehicle.Year || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Right Column - Details (5 columns) */}
            <div className="lg:col-span-5 space-y-6">

              {/* Vehicle Identity - Desktop */}
              <div className="hidden lg:block">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                  {displayBrand} {modelDisplay}
                </h2>
                <div className="flex items-center gap-3 mt-3 text-slate-600 dark:text-slate-400">
                  <span className="font-mono text-sm bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600">
                    {vehicle.Plate || "No Plate"}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-base font-medium">{vehicle.Year || "N/A"}</span>
                </div>
              </div>

              {/* Information Grid */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-slate-900/30 p-6 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Icons.Info />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Information</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Category */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 hover:border-emerald-200 dark:hover:border-emerald-700 transition-colors">
                    <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                      <Icons.Category />
                      <span className="text-xs font-semibold uppercase tracking-wider">Category</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{vehicle.Category || "—"}</p>
                  </div>

                  {/* Plate */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 hover:border-emerald-200 dark:hover:border-emerald-700 transition-colors">
                    <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                      <Icons.Plate />
                      <span className="text-xs font-semibold uppercase tracking-wider">Plate</span>
                    </div>
                    <p className="text-sm font-mono font-semibold text-slate-900 dark:text-white uppercase">{vehicle.Plate || "—"}</p>
                  </div>

                  {/* Year */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 hover:border-emerald-200 dark:hover:border-emerald-700 transition-colors">
                    <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                      <Icons.Year />
                      <span className="text-xs font-semibold uppercase tracking-wider">Year</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{vehicle.Year || "—"}</p>
                  </div>

                  {/* Color */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 hover:border-emerald-200 dark:hover:border-emerald-700 transition-colors">
                    <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                      <Icons.Color />
                      <span className="text-xs font-semibold uppercase tracking-wider">Color</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {vehicle.Color && (
                        <div
                          className="w-4 h-4 rounded-full border-2 border-white dark:border-slate-600 shadow-sm"
                          style={{ backgroundColor: getColorHex(vehicle.Color) }}
                        />
                      )}
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{vehicle.Color || "—"}</p>
                    </div>
                  </div>

                  {/* Condition */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 hover:border-emerald-200 dark:hover:border-emerald-700 transition-colors">
                    <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                      <Icons.Condition />
                      <span className="text-xs font-semibold uppercase tracking-wider">Condition</span>
                    </div>
                    <span className={cn(
                      "inline-flex px-3 py-1 rounded-full text-xs font-bold",
                      vehicle.Condition === "New" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                      vehicle.Condition === "Used" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                      (!vehicle.Condition || vehicle.Condition === "Unknown") && "bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-300"
                    )}>
                      {vehicle.Condition || "Unknown"}
                    </span>
                  </div>

                  {/* Body Type */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 hover:border-emerald-200 dark:hover:border-emerald-700 transition-colors">
                    <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                      <Icons.BodyType />
                      <span className="text-xs font-semibold uppercase tracking-wider">Body Type</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{vehicle.BodyType || "—"}</p>
                  </div>

                  {/* Tax Type - Full Width */}
                  <div className="col-span-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 hover:border-emerald-200 dark:hover:border-emerald-700 transition-colors">
                    <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                      <Icons.Tax />
                      <span className="text-xs font-semibold uppercase tracking-wider">Tax Type</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{vehicle.TaxType || "—"}</p>
                    {taxTypeMeta?.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">{taxTypeMeta.description}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Price Cards */}
              <div className="grid grid-cols-1 gap-4">
                {/* Market Price */}
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 p-5 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-1 opacity-90">
                      <Icons.Price />
                      <span className="text-xs font-semibold uppercase tracking-wider">Market Price</span>
                    </div>
                    <p className="text-3xl font-bold">{formatCurrency(vehicle.PriceNew)}</p>
                    <p className="text-xs opacity-75 mt-1">Full vehicle value</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* DOC 40% */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-slate-900/30 p-5 border border-slate-100 dark:border-slate-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-rose-100 dark:bg-rose-900/20 rounded-full -mr-10 -mt-10 blur-xl" />
                    <div className="relative">
                      <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">DOC 40%</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(vehicle.Price40)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Down payment</p>
                    </div>
                  </div>

                  {/* Vehicles 70% */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-slate-900/30 p-5 border border-slate-100 dark:border-slate-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100 dark:bg-blue-900/20 rounded-full -mr-10 -mt-10 blur-xl" />
                    <div className="relative">
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Vehicles 70%</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(vehicle.Price70)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Installment</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Added Time */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-slate-900/30 p-5 border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400">
                  <Icons.Clock />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Added Time</p>
                  <p className="text-sm font-mono font-semibold text-slate-900 dark:text-white">{formatVehicleTime(vehicle.Time)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Action Bar */}
        <div className="hidden md:block fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700 p-4 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage this vehicle</p>
            <div className="flex items-center gap-3">
              {canEdit && (
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <Icons.Edit />
                  <span>Edit Vehicle</span>
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => setIsDeleteDialogOpen(true)}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-semibold shadow-lg shadow-rose-200 dark:shadow-rose-900/30 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  <Icons.Delete />
                  <span>Delete</span>
                </button>
              )}
              <button
                onClick={handleBackToList}
                className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-all duration-200"
              >
                <Icons.List />
                <span>{backToListLabel}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Action Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700 p-4 z-40 safe-area-pb">
          <div className="flex gap-3">
            {canEdit && (
              <button
                onClick={handleEdit}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold shadow-lg transition-all duration-200"
              >
                <Icons.Edit />
                <span>Edit</span>
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={isDeleting}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-semibold shadow-lg transition-all duration-200 disabled:opacity-50"
              >
                <Icons.Delete />
                <span>Delete</span>
              </button>
            )}
            <button
              onClick={handleBackToList}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold"
            >
              <Icons.List />
              <span>{backToListLabel}</span>
            </button>
          </div>
        </div>

        {/* Image Modal */}
        <ImageModal
          isOpen={isImageModalOpen}
          imageUrl={displayImageUrl || (Array.isArray(vehicle.Image) ? vehicle.Image[0] : typeof vehicle.Image === 'string' ? vehicle.Image : '')}
          alt={`${vehicle.Brand} ${vehicle.Model}`}
          onClose={() => setIsImageModalOpen(false)}
        />

        {/* Delete Confirmation Dialog */}
        {isDeleteDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-rose-500 to-rose-600 p-6 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <Icons.Delete />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Delete Vehicle</h3>
                    <p className="text-rose-100 text-sm">This action cannot be undone</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-6">
                  <p className="font-bold text-slate-900 dark:text-white text-lg">
                    {displayBrand} {modelDisplay}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-slate-500 dark:text-slate-400">
                    <Icons.Plate />
                    <span className="font-mono text-sm uppercase">{vehicle.Plate || "-"}</span>
                  </div>
                </div>

                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                  Are you sure you want to delete this vehicle? All data including images and pricing information will be permanently removed from the system.
                </p>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsDeleteDialogOpen(false)}
                    disabled={isDeleting}
                    className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 py-3 px-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-semibold shadow-lg shadow-rose-200 dark:shadow-rose-900/30 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {isDeleting && (
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    <span>Delete Vehicle</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
