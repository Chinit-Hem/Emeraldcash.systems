"use client";

import React, { Suspense, useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { NeuVehicleListSkeleton } from "@/shared/components/skeletons/NeuVehicleListSkeleton";
import { useOptimisticVehicles } from "@/systems/vms/hooks/useOptimisticVehicles";
import type { Vehicle } from "@/shared/types/types";

// Lazy load heavy components
const VehicleTable = dynamic(() => import("@/systems/vms/components/dashboard/VehicleTable"), {
  loading: () => <NeuVehicleListSkeleton />,
  ssr: false,
});

const VehicleCard = dynamic(() => import("@/systems/vms/components/VehicleCard"), {
  loading: () => <NeuVehicleListSkeleton />,
  ssr: false,
});

interface OptimizedVehicleListProps {
  initialVehicles: Vehicle[];
  viewMode?: "table" | "grid";
  onDelete?: (vehicleId: string | number) => Promise<void>;
  onUpdate?: (vehicle: Vehicle) => Promise<Vehicle>;
  children?: React.ReactNode;
}

/**
 * OptimizedVehicleList - Vehicle list with optimistic updates
 * 
 * Features:
 * - Instant UI updates (optimistic)
 * - Automatic rollback on error
 * - Lazy loaded components
 * - Skeleton loading states
 */
export function OptimizedVehicleList({
  initialVehicles,
  viewMode = "table",
  onDelete,
  onUpdate,
  children,
}: OptimizedVehicleListProps) {
  const {
    vehicles,
    pendingOperations,
    optimisticDelete,
    optimisticUpdate,
    isPending,
  } = useOptimisticVehicles(initialVehicles);

  const [activeVehicleId, setActiveVehicleId] = useState<string | number | null>(null);

  // Optimistic delete handler
  const handleDelete = useCallback(
    async (vehicleId: string | number) => {
      setActiveVehicleId(vehicleId);
      
      try {
        // Optimistic update - UI updates immediately, then syncs with server
        await optimisticDelete(vehicleId, async () => {
          if (onDelete) {
            await onDelete(vehicleId);
          }
        });
      } catch (err) {
        // Error is handled by useOptimisticVehicles - automatic rollback
        console.error("Delete failed:", err);
      } finally {
        setActiveVehicleId(null);
      }
    },
    [optimisticDelete, onDelete]
  );

  // Optimistic update handler
  const handleUpdate = useCallback(
    async (vehicle: Vehicle) => {
      try {
        // Optimistic update - UI updates immediately, then syncs with server
        await optimisticUpdate(vehicle, async () => {
          if (onUpdate) {
            return await onUpdate(vehicle);
          }
          return vehicle;
        });
      } catch (err) {
        // Error is handled by useOptimisticVehicles - automatic rollback
        console.error("Update failed:", err);
      }
    },
    [optimisticUpdate, onUpdate]
  );

  // Render children with injected props if provided, otherwise render default
  if (children) {
    return (
      <div className="space-y-4">
        <Suspense fallback={<NeuVehicleListSkeleton />}>
          {children}
        </Suspense>
      </div>
    );
  }

  // Default render - just show the skeleton while loading
  return (
    <div className="space-y-4">
      <Suspense fallback={<NeuVehicleListSkeleton />}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((vehicle, index) => (
            <div
              key={vehicle.VehicleId}
              className={`transition-all duration-200 ${
                activeVehicleId === vehicle.VehicleId ? "opacity-50 scale-95" : ""
              } ${pendingOperations.some(op => 
                (op.type === "update" && op.vehicle.VehicleId === vehicle.VehicleId) ||
                (op.type === "delete" && op.vehicleId === vehicle.VehicleId)
              ) ? "ring-2 ring-emerald-500" : ""}`}
            >
              <VehicleCard
                vehicle={vehicle}
                index={index}
                isAdmin={true}
                onDelete={() => handleDelete(vehicle.VehicleId)}
              />
            </div>
          ))}
        </div>
      </Suspense>
    </div>
  );
}

/**
 * OptimisticVehicleCard - Individual vehicle card with optimistic actions
 */
interface OptimisticVehicleCardProps {
  vehicle: Vehicle;
  onDelete: () => Promise<void>;
  onUpdate: (updates: Partial<Vehicle>) => Promise<void>;
  index: number;
  isAdmin: boolean;
}

export function OptimisticVehicleCard({
  vehicle,
  onDelete,
  onUpdate,
  index,
  isAdmin,
}: OptimisticVehicleCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  }, [onDelete]);

  const handleUpdate = useCallback(
    async (updates: Partial<Vehicle>) => {
      setIsUpdating(true);
      try {
        await onUpdate(updates);
      } finally {
        setIsUpdating(false);
      }
    },
    [onUpdate]
  );

  return (
    <div
      className={`relative transition-all duration-200 ${
        isDeleting ? "opacity-50 scale-95" : ""
      } ${isUpdating ? "ring-2 ring-emerald-500" : ""}`}
    >
      <VehicleCard
        vehicle={vehicle}
        index={index}
        isAdmin={isAdmin}
        onDelete={handleDelete}
      />
    </div>
  );
}
