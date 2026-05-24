"use client";

import { GlassButton } from "@/shared/components/ui/glass/GlassButton";
import type { Vehicle } from "@/shared/types/types";
import { useState } from "react";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  vehicle: Vehicle | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting?: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  vehicle,
  onClose,
  onConfirm,
  isDeleting: externalIsDeleting,
}: DeleteConfirmationModalProps) {
  const [internalIsDeleting, setInternalIsDeleting] = useState(false);
  
  // Use external isDeleting if provided (optimistic UI), otherwise use internal state
  const isDeleting = externalIsDeleting !== undefined ? externalIsDeleting : internalIsDeleting;

  const handleConfirm = async () => {
    // Only manage internal state if no external control
    if (externalIsDeleting === undefined) {
      setInternalIsDeleting(true);
    }
    try {
      await onConfirm();
    } finally {
      if (externalIsDeleting === undefined) {
        setInternalIsDeleting(false);
      }
    }
  };


  if (!isOpen || !vehicle) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] p-4 backdrop-blur-sm">
      <div className="ec-glassCard w-full max-w-md p-6 rounded-2xl">
        {/* Icon and Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full border border-[var(--accent-red)] bg-[var(--accent-red-soft)] p-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-[var(--accent-red)]"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Delete Vehicle
          </h3>
        </div>

        {/* Vehicle Info */}
        <div className="mb-6 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-soft)] p-4">
          <p className="font-medium text-[var(--text-primary)]">
            {vehicle.Brand} {vehicle.Model}
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {vehicle.Year || "-"} • {vehicle.Category} • Plate: {vehicle.Plate || "-"}
          </p>
        </div>

        {/* Warning Message */}
        <p className="mb-6 text-sm text-[var(--text-secondary)]">
          Are you sure you want to delete this vehicle? This action cannot be undone and the vehicle data will be permanently removed from the system.
        </p>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <GlassButton variant="ghost" onClick={onClose} disabled={isDeleting}>
            Cancel
          </GlassButton>
          <GlassButton
            variant="danger"
            onClick={handleConfirm}
            isLoading={isDeleting}
          >
            Delete Vehicle
          </GlassButton>
        </div>
      </div>
    </div>
  );
}
