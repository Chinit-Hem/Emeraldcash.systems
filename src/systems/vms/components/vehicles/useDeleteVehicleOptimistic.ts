"use client";

import { useState, useCallback } from "react";
import { extractDriveFileId } from "@/shared/utils/drive";
import { refreshVehicleCache } from "@/systems/vms/utils/vehicleCache";
import type { Vehicle } from "@/shared/types/types";

interface UseDeleteVehicleOptimisticOptions {
  onSuccess?: (vehicle: Vehicle) => void;
  onError?: (error: Error, restoredVehicle: Vehicle) => void;
}

interface UseDeleteVehicleOptimisticReturn {
  deleteVehicle: (vehicle: Vehicle) => Promise<void>;
  isDeleting: boolean;
}

export function useDeleteVehicleOptimistic(
  options: UseDeleteVehicleOptimisticOptions = {}
): UseDeleteVehicleOptimisticReturn {
  const { onSuccess, onError } = options;
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteVehicle = useCallback(
    async (vehicle: Vehicle): Promise<void> => {
      setIsDeleting(true);

      try {
        const imageFileId = extractDriveFileId(vehicle.Image);

        const res = await fetch(`/api/vehicles/${encodeURIComponent(vehicle.VehicleId)}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            imageFileId,
            imageUrl: vehicle.Image,
          }),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || `Failed to delete vehicle: ${res.status}`);
        }

        const result = await res.json();

        if (!result.ok) {
          throw new Error(result.error || "Failed to delete vehicle");
        }

        // Refresh shared client cache so list/search views immediately reflect deletion.
        await refreshVehicleCache();

        // Call success callback
        onSuccess?.(vehicle);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to delete vehicle");
        onError?.(error, vehicle);
        throw error;
      } finally {
        setIsDeleting(false);
      }
    },
    [onSuccess, onError]
  );

  return {
    deleteVehicle,
    isDeleting,
  };
}

