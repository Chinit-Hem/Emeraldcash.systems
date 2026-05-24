"use client";

import { driveThumbnailUrl, extractDriveFileId } from "@/shared/utils/drive";
import { derivePrices } from "@/systems/vms/utils/pricing";
import type { Vehicle } from "@/shared/types/types";
import { useRouter } from "next/navigation";
import React, { useMemo } from "react";

type VehicleCardProps = {
  vehicle: Vehicle;
  index: number;
  isAdmin: boolean;
  onDelete: (vehicle: Vehicle) => void;
  searchQuery?: string;
};

// Neumorphic Icon Button
function NeuIconButton({
  onClick,
  children,
  variant = "default",
  className = "",
}: {
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  variant?: "default" | "primary" | "danger";
  className?: string;
}) {
  const variantClasses = {
    default: "text-[#4a4a5a] shadow-sm active:bg-slate-100",
    primary: "text-blue-600 shadow-sm active:bg-slate-100",
    danger: "text-red-600 shadow-sm active:bg-slate-100",
  };

  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-[12px] bg-slate-100 transition-all ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export default function VehicleCard({
  vehicle,
  index,
  isAdmin,
  onDelete,
  searchQuery = "",
}: VehicleCardProps) {
  const router = useRouter();
  const vehicleId = vehicle.VehicleId;

  const derived = derivePrices(vehicle.PriceNew);
  const price70 = vehicle.Price70 ?? derived.Price70;

  const imageUrl = Array.isArray(vehicle.Image) 
    ? (vehicle.Image[0] || '') 
    : (vehicle.Image || '');
  
  const isCloudinary = typeof imageUrl === 'string' && 
    imageUrl !== 'undefined' && 
    imageUrl !== 'null' &&
    imageUrl.includes('res.cloudinary.com');
  
  const thumbUrl = useMemo(() => {
    if (isCloudinary) {
      return imageUrl;
    }
    const imageFileId = extractDriveFileId(imageUrl);
    return imageFileId
      ? `${driveThumbnailUrl(imageFileId, "w300-h300")}`
      : imageUrl;
  }, [isCloudinary, imageUrl]);

  const handleClick = () => {
    if (!vehicleId) return;
    router.push(`/vehicles/${encodeURIComponent(vehicleId)}/view`);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!vehicleId) return;
    router.push(`/vehicles/${encodeURIComponent(vehicleId)}/edit`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(vehicle);
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200/80 text-[#1a1a2e] rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div
      onClick={handleClick}
      className={`p-4 sm:p-6 flex gap-4 sm:gap-6 cursor-pointer transition-all rounded-[20px] bg-slate-100 shadow-sm hover:bg-slate-50 active:bg-slate-100`}
    >
      {/* Image */}
      <div className="flex-shrink-0">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={`${vehicle.Brand} ${vehicle.Model}`}
            loading="lazy"
            decoding="async"
            className="h-20 w-20 sm:h-24 sm:w-24 rounded-[16px] object-cover bg-slate-100 shadow-sm"
          />
        ) : (
          <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-[16px] bg-slate-100 shadow-sm flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
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
              {highlightText(`${vehicle.Brand} ${vehicle.Model}`, searchQuery)}
            </h3>
            <p className="text-sm text-[#4a4a5a]">
              {vehicle.Year || "-"} • {vehicle.Category}
            </p>
          </div>
          <span
            className={`flex-shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 shadow-sm ${
              vehicle.Condition === "New"
                ? "text-emerald-600"
                : vehicle.Condition === "Used"
                ? "text-blue-600"
                : "text-orange-600"
            }`}
          >
            {vehicle.Condition || "Unknown"}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-4 text-sm">
          <div>
            <span className="text-[#4a4a5a]">Plate:</span>{" "}
            <span className="font-mono text-[#1a1a2e]">{vehicle.Plate || "-"}</span>
          </div>
          <div>
            <span className="text-[#4a4a5a]">Tax:</span>{" "}
            <span className="text-[#1a1a2e]">{vehicle.TaxType || "-"}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-emerald-600">
              {vehicle.PriceNew == null ? "-" : `$${vehicle.PriceNew.toLocaleString()}`}
            </span>
            {price70 != null && (
              <span className="text-xs text-[#4a4a5a]">
                70%: ${price70.toLocaleString()}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <NeuIconButton
              onClick={handleClick}
              variant="default"
              aria-label="View"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </NeuIconButton>
            {isAdmin && (
              <>
                <NeuIconButton
                  onClick={handleEdit}
                  variant="primary"
                  aria-label="Edit"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" />
                  </svg>
                </NeuIconButton>
                <NeuIconButton
                  onClick={handleDelete}
                  variant="danger"
                  aria-label="Delete"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </NeuIconButton>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
