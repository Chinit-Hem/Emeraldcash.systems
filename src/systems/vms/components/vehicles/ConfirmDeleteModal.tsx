"use client";

import React, { useEffect, useCallback } from "react";
import { GlassCard } from "@/shared/components/ui/glass/GlassCard";
import { GlassButton } from "@/shared/components/ui/glass/GlassButton";
import { formatCurrency } from "@/shared/utils/format";
import { getDisplayBrandName, getDisplayModelName } from "@/systems/vms/utils/vehicleBrandMetadata";
import { hasAppPermission } from "@/shared/utils/permissions";
import type { Vehicle } from "@/shared/types/types";

interface ConfirmDeleteModalProps {
  vehicle: Vehicle;
  isOpen: boolean;
  isDeleting: boolean;
  userRole: "Admin" | "Staff" | "Viewer" | string;
  onConfirm: () => void;
  onCancel: () => void;
}

function deferMicrotask(callback: () => void): void {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(callback);
    return;
  }
  Promise.resolve().then(callback);
}

export function ConfirmDeleteModal({
  vehicle,
  isOpen,
  isDeleting,
  userRole,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  const canDelete = hasAppPermission(userRole, "vehicles:delete");

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
      if (e.key === "Enter" && !isDeleting) {
        onConfirm();
      }
    },
    [onCancel, onConfirm, isDeleting]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);


  if (!isOpen) return null;

  // Staff/Viewer cannot delete - show restricted view
  if (!canDelete) {
    return (
      <div
        className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
      >
        <div onClick={(e) => e.stopPropagation()}>
          <GlassCard
            variant="elevated"
            className="w-full max-w-md animate-in fade-in zoom-in duration-200"
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6 text-amber-600"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                    <path d="M8 11h8" />
                  </svg>
                </div>
                <h2
                  id="delete-modal-title"
                  className="text-xl font-bold text-gray-900 dark:text-white"
                >
                  Access Restricted
                </h2>
              </div>

              <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                Only <strong>Admin</strong> users can delete vehicles. Please contact an administrator if you need to remove this vehicle.
              </p>

              <GlassButton variant="secondary" fullWidth onClick={onCancel}>
                Close
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div onClick={(e) => e.stopPropagation()}>
        <GlassCard
          variant="elevated"
          className="w-full max-w-lg animate-in fade-in zoom-in duration-200"
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6 text-red-600"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="m15 9-6 6" />
                  <path d="m9 9 6 6" />
                </svg>
              </div>
              <h2
                id="delete-modal-title"
                className="text-xl font-bold text-gray-900 dark:text-white"
              >
                Confirm Permanent Deletion
              </h2>
            </div>

            {/* Warning Message */}
            <div className="p-4 mb-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-300 font-medium">
                ⚠️ This action cannot be undone. The vehicle and all associated data will be permanently removed.
              </p>
            </div>

            {/* Vehicle Summary */}
            <div className="mb-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Vehicle to Delete
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Brand:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {getDisplayBrandName(vehicle.Brand)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Model:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {getDisplayModelName(vehicle.Model)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Plate:</span>
                  <span className="ml-2 font-mono font-medium text-gray-900 dark:text-white uppercase">
                    {vehicle.Plate || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Year:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {vehicle.Year || "N/A"}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500 dark:text-gray-400">Market Price:</span>
                  <span className="ml-2 font-medium text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(vehicle.PriceNew)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <GlassButton
                variant="danger"
                fullWidth
                isLoading={isDeleting}
                onClick={onConfirm}
                disabled={isDeleting}
                className="order-1 sm:order-2"
              >
                {isDeleting ? "Deleting..." : "Permanently Delete Vehicle"}
              </GlassButton>
              <GlassButton
                variant="secondary"
                fullWidth
                onClick={onCancel}
                disabled={isDeleting}
                className="order-2 sm:order-1"
              >
                Cancel
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
