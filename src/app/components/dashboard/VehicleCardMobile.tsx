"use client";

import { derivePrices } from "@/lib/pricing";
import type { Vehicle } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatPrice, getVehicleThumbnailUrl } from "@/lib/vehicle-helpers";

interface VehicleCardMobileProps {
  vehicle: Vehicle;
  index: number;
  isAdmin: boolean;
  disableImages?: boolean;
  onEdit?: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
  key?: React.Key;
}



export default function VehicleCardMobile({
  vehicle,
  index,
  isAdmin,
  disableImages = false,
  onEdit,
  onDelete,
}: VehicleCardMobileProps) {

  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const vehicleId = vehicle.VehicleId;
  const derived = derivePrices(vehicle.PriceNew);
  const price40 = vehicle.Price40 ?? derived.Price40;
  const price70 = vehicle.Price70 ?? derived.Price70;

  // Use centralized utility for image URL
  const thumbUrl = useMemo(() => {
    if (disableImages || imageError) return null;
    return getVehicleThumbnailUrl(vehicle.Image, "w300-h300");
  }, [disableImages, vehicle.Image, imageError]);

  return (
    <div
      className={`lg:hidden rounded-xl overflow-hidden bg-slate-100 shadow-sm ${
        index % 2 === 0 ? "" : "bg-slate-100/80"
      }`}
    >
      {/* Main Card Content */}
      <div
        className="p-4 flex gap-4 cursor-pointer active:bg-slate-100 transition-all duration-200"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Image */}
        <div className="flex-shrink-0">
          {thumbUrl ? (
             
            <img
              src={thumbUrl}
              alt={`${vehicle.Brand} ${vehicle.Model}`}
              className="h-20 w-20 rounded-xl object-cover shadow-sm bg-slate-100"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="h-20 w-20 rounded-xl bg-slate-100 flex items-center justify-center shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-8 w-8 text-[#4a4a5a]"
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
              <h3 className="font-semibold text-[#1a1a2e] truncate">
                {vehicle.Brand} {vehicle.Model}
              </h3>
              <p className="text-sm text-[#4a4a5a]">
                {vehicle.Year || "-"} • {vehicle.Category}
              </p>
            </div>
            <span
              className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shadow-sm ${
                vehicle.Condition === "New"
                  ? "bg-slate-100 text-[#10b981]"
                  : vehicle.Condition === "Used"
                  ? "bg-slate-100 text-[#3b82f6]"
                  : "bg-slate-100 text-[#4a4a5a]"
              }`}
            >
              {vehicle.Condition || "Unknown"}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="text-lg font-bold text-[#10b981]">
              {formatPrice(vehicle.PriceNew)}
            </div>
            <div className="flex items-center text-[#4a4a5a]">
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
        <div className="px-4 pb-4 border-t border-slate-200">
          <div className="pt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-[#4a4a5a]">Vehicle ID:</span>
              <p className="font-mono text-[#1a1a2e]">{vehicle.VehicleId || "-"}</p>
            </div>
            <div>
              <span className="text-[#4a4a5a]">Plate:</span>
              <p className="font-mono text-[#1a1a2e]">{vehicle.Plate || "-"}</p>
            </div>

            <div>
              <span className="text-[#4a4a5a]">Tax Type:</span>
              <p className="text-[#1a1a2e]">{vehicle.TaxType || "-"}</p>
            </div>
            <div>
              <span className="text-[#4a4a5a]">Body Type:</span>
              <p className="text-[#1a1a2e]">{vehicle.BodyType || "-"}</p>
            </div>
            <div>
              <span className="text-[#4a4a5a]">Color:</span>
              <p className="text-[#1a1a2e]">{vehicle.Color || "-"}</p>
            </div>
            <div>
              <span className="text-[#4a4a5a]">D.O.C. 40%:</span>
              <p className="font-semibold text-[#ef4444]">
                {formatPrice(price40)}
              </p>
            </div>
            <div>
              <span className="text-[#4a4a5a]">Vehicles 70%:</span>
              <p className="font-semibold text-[#10b981]">
                {formatPrice(price70)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => router.push(`/vehicles/${encodeURIComponent(vehicleId)}/view`)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-[#10b981] rounded-xl font-medium shadow-sm active:bg-slate-100 transition-all duration-200"
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
                  onClick={() => onEdit ? onEdit(vehicle) : router.push(`/vehicles/${encodeURIComponent(vehicleId)}/edit`)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-[#3b82f6] rounded-xl font-medium shadow-sm active:bg-slate-100 transition-all duration-200"
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
                  onClick={() => onDelete(vehicle)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-[#ef4444] rounded-xl font-medium shadow-sm active:bg-slate-100 transition-all duration-200"
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
