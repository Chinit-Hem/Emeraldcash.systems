"use client";

import { useLanguage } from "@/lib/LanguageContext";
import { derivePrices } from "@/lib/pricing";
import type { Vehicle } from "@/lib/types";
import { cn } from "@/lib/ui";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useState, useCallback, useEffect, type CSSProperties, type Dispatch, type SetStateAction } from "react";
import { formatPrice, getVehicleThumbnailUrl } from "@/lib/vehicle-helpers";
import { getVehicleColorHex, translateVehicleColor } from "@/lib/vehicleColors";
import { OptimizedImage } from "@/components/OptimizedImage";

interface VehicleRowProps {
  vehicle: Vehicle;
  index: number;
  style: CSSProperties;
  isAdmin: boolean;
  visibleColumns: string[];
  sortField: keyof Vehicle | null;
  sortDirection: "asc" | "desc";
  onSort: (field: keyof Vehicle) => void;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
  imageErrors: Set<string>;
  setImageErrors: Dispatch<SetStateAction<Set<string>>>;
  deletingId: string | null;
  handleOptimisticDelete: (vehicle: Vehicle) => Promise<void>;
  router: AppRouterInstance;
}

export default function VehicleRow({
  vehicle,
  index,
  style,
  isAdmin,
  visibleColumns,
  sortField,
  sortDirection,
  onSort,
  onEdit,
  onDelete,
  imageErrors,
  setImageErrors,
  deletingId,
  handleOptimisticDelete,
  router,
}: VehicleRowProps) {
  const { language } = useLanguage();
  const [imageError, setImageError] = useState(false);
  const vehicleId = vehicle.VehicleId;
  const colorLabel = translateVehicleColor(vehicle.Color, language);

  useEffect(() => {
    setImageError(false);
    setImageErrors((prev) => {
      if (!prev.has(vehicleId)) return prev;
      const next = new Set(prev);
      next.delete(vehicleId);
      return next;
    });
  }, [vehicle.Image, vehicleId, setImageErrors]);

  const derived = derivePrices(vehicle.PriceNew);
  const price40 = vehicle.Price40 ?? derived.Price40;
  const price70 = vehicle.Price70 ?? derived.Price70;

  const thumbUrl = !imageError
    ? getVehicleThumbnailUrl(vehicle.Image)
    : null;

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageErrors((prev) => new Set(prev).add(vehicleId));
  }, [vehicleId, setImageErrors]);

  return (
    <div
      className={cn(
        "flex border-b border-slate-200 last:border-b-0 hover:bg-slate-50 active:bg-slate-100 transition-colors",
        index % 2 === 0 ? "bg-white" : "bg-slate-50"
      )}
      style={style}
      onClick={() => router.push(`/vehicles/${encodeURIComponent(vehicleId)}/view`)}
    >
      {visibleColumns.includes('id') && (
        <div className="px-4 py-3 whitespace-nowrap text-sm font-mono text-[#4a4a5a] w-20 flex-shrink-0">
          {vehicle.VehicleId || "-"}
        </div>
      )}

      {visibleColumns.includes('image') && (
        <div className="px-4 py-3 w-20 flex-shrink-0">
          {thumbUrl ? (
            <OptimizedImage
              src={thumbUrl}
              alt={`${vehicle.Brand} ${vehicle.Model}`}
              width={48}
              height={48}
              className="h-12 w-12 rounded-lg object-cover shadow-sm bg-slate-100"
              onError={handleImageError}
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
        </div>
      )}

      {visibleColumns.includes('category') && (
        <div className="px-4 py-3 whitespace-nowrap text-sm text-[#4a4a5a] w-24 flex-shrink-0">
          {vehicle.Category || "-"}
        </div>
      )}

      {visibleColumns.includes('brand') && (
        <div className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[#1a1a2e] w-32 flex-shrink-0">
          {vehicle.Brand || "-"}
        </div>
      )}

      {visibleColumns.includes('model') && (
        <div className="px-4 py-3 text-sm text-[#4a4a5a] min-w-[120px] flex-1">
          {vehicle.Model || "-"}
        </div>
      )}

      {visibleColumns.includes('year') && (
        <div className="px-4 py-3 whitespace-nowrap text-sm text-[#4a4a5a] w-20 flex-shrink-0">
          {vehicle.Year || "-"}
        </div>
      )}

      {visibleColumns.includes('plate') && (
        <div className="px-4 py-3 whitespace-nowrap text-sm font-mono text-[#4a4a5a] w-24 flex-shrink-0">
          {vehicle.Plate || "-"}
        </div>
      )}

      {visibleColumns.includes('priceNew') && (
        <div className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-[#10b981] w-32 flex-shrink-0">
          {formatPrice(vehicle.PriceNew)}
        </div>
      )}

      {visibleColumns.includes('price40') && (
        <div className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-[#ef4444] w-28 flex-shrink-0">
          {formatPrice(price40)}
        </div>
      )}

      {visibleColumns.includes('price70') && (
        <div className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-[#10b981] w-32 flex-shrink-0">
          {formatPrice(price70)}
        </div>
      )}

      {visibleColumns.includes('taxType') && (
        <div className="px-4 py-3 whitespace-nowrap text-sm text-[#4a4a5a] w-28 flex-shrink-0">
          {vehicle.TaxType || "-"}
        </div>
      )}

      {visibleColumns.includes('condition') && (
        <div className="px-4 py-3 whitespace-nowrap w-24 flex-shrink-0">
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
        </div>
      )}

      {visibleColumns.includes('bodyType') && (
        <div className="px-4 py-3 whitespace-nowrap text-sm text-[#4a4a5a] w-32 flex-shrink-0">
          {vehicle.BodyType || "-"}
        </div>
      )}

      {visibleColumns.includes('color') && (
        <div className="px-4 py-3 w-32 flex-shrink-0">
          <div className="flex items-center gap-2">
            {vehicle.Color ? (
              <>
                <div
                  className="w-4 h-4 rounded-full shadow-sm border-2 border-slate-200"
                  style={{
                    backgroundColor: getVehicleColorHex(vehicle.Color),
                  }}
                  title={colorLabel}
                />
                <span className="text-sm text-[#4a4a5a] font-medium">
                  {colorLabel}
                </span>
              </>
            ) : (
              <span className="text-sm text-[#4a4a5a]">-</span>
            )}
          </div>
        </div>
      )}

      {visibleColumns.includes('actions') && (
        <div className="px-4 py-3 w-32 flex-shrink-0">
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/vehicles/${encodeURIComponent(vehicleId)}/view`);
              }}
              className="rounded-lg p-1.5 text-[#4a4a5a] hover:bg-slate-100 transition-colors"
              title="View"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(vehicle);
                  }}
                  className="rounded-lg p-1.5 text-[#10b981] hover:bg-slate-100 transition-colors"
                  title="Edit"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
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
                    "rounded-lg p-1.5 transition-colors",
                    deletingId === vehicleId
                      ? "text-slate-400 cursor-not-allowed"
                      : "text-red-500 hover:bg-slate-100"
                  )}
                  title={deletingId === vehicleId ? "Deleting..." : "Delete"}
                >
                  {deletingId === vehicleId ? (
                    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
