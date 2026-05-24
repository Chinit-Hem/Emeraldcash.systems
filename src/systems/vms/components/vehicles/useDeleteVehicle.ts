"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { extractDriveFileId } from "@/shared/utils/drive";
import { invalidateAllCaches } from "@/systems/vms/utils/vehicleCache";
import type { Vehicle } from "@/shared/types/types";

interface UseDeleteVehicleResult {
  deleteVehicle: (vehicle: Vehicle) => Promise<boolean>;
  isDeleting: boolean;
  error: string | null;
}

export function useDeleteVehicle(
  onSuccess?: () => void,
  onError?: (error: string) => void
): UseDeleteVehicleResult {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteVehicle = useCallback(
    async (vehicle: Vehicle): Promise<boolean> => {
      setIsDeleting(true);
      setError(null);

      try {
        const imageFileId = extractDriveFileId(vehicle.Image);
        
        const res = await fetch(`/api/vehicles/${encodeURIComponent(vehicle.VehicleId)}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ 
            imageFileId, 
            imageUrl: vehicle.Image 
          }),
        });

        if (res.status === 401) {
          router.push("/login?redirect=" + encodeURIComponent(window.location.pathname));
          return false;
        }

        if (res.status === 403) {
          throw new Error("You don't have permission to delete this vehicle");
        }

        const json = await res.json().catch(() => ({}));
        
        if (!res.ok || json.ok === false) {
          throw new Error(json.error || "Failed to delete vehicle");
        }

        // Invalidate all caches to ensure vehicle list is updated
        invalidateAllCaches();

        onSuccess?.();
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to delete vehicle";
        setError(errorMessage);
        onError?.(errorMessage);
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [router, onSuccess, onError]
  );

  return {
    deleteVehicle,
    isDeleting,
    error,
  };
}
