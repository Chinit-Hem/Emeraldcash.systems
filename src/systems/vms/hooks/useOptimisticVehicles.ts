/**
 * useOptimisticVehicles - Optimistic UI updates for vehicle operations
 * 
 * Features:
 * - Instant UI updates for add, delete, update operations
 * - Automatic rollback on error
 * - Seamless sync with backend
 * - Toast notifications for feedback
 */

"use client";

import { useState, useCallback, useRef } from "react";
import type { Vehicle } from "@/shared/types/types";
import { useToast } from "@/shared/components/ui/glass/GlassToast";

type OptimisticOperation = 
  | { type: "add"; vehicle: Vehicle }
  | { type: "delete"; vehicleId: string | number }
  | { type: "update"; vehicle: Vehicle };

interface UseOptimisticVehiclesOptions {
  onError?: (error: Error, operation: OptimisticOperation) => void;
  onSuccess?: (operation: OptimisticOperation) => void;
}

interface UseOptimisticVehiclesReturn {
  vehicles: Vehicle[];
  pendingOperations: OptimisticOperation[];
  optimisticAdd: (vehicle: Vehicle, apiCall: () => Promise<Vehicle>) => Promise<void>;
  optimisticDelete: (vehicleId: string | number, apiCall: () => Promise<void>) => Promise<void>;
  optimisticUpdate: (vehicle: Vehicle, apiCall: () => Promise<Vehicle>) => Promise<void>;
  isPending: boolean;
  syncWithServer: (serverVehicles: Vehicle[]) => void;
}

export function useOptimisticVehicles(
  initialVehicles: Vehicle[] = [],
  options: UseOptimisticVehiclesOptions = {}
): UseOptimisticVehiclesReturn {
  const toast = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [pendingOperations, setPendingOperations] = useState<OptimisticOperation[]>([]);
  const operationIdRef = useRef(0);

  // Generate temporary ID for optimistic additions
  const generateTempId = useCallback(() => {
    return `temp-${Date.now()}-${++operationIdRef.current}`;
  }, []);

  // Sync with server data (call when fresh data arrives)
  const syncWithServer = useCallback((serverVehicles: Vehicle[]) => {
    setVehicles(serverVehicles);
    setPendingOperations([]);
  }, []);

  // Optimistic add operation
  const optimisticAdd = useCallback(async (
    vehicle: Omit<Vehicle, "VehicleId">,
    apiCall: () => Promise<Vehicle>
  ) => {
    const tempId = generateTempId();
    const optimisticVehicle = {
      ...vehicle,
      VehicleId: tempId,
      _optimistic: true,
      _createdAt: Date.now(),
    } as Vehicle;

    // Add to pending operations
    const operation: OptimisticOperation = { type: "add", vehicle: optimisticVehicle };
    setPendingOperations(prev => [...prev, operation]);

    // Optimistically update UI
    setVehicles(prev => [optimisticVehicle, ...prev]);

    toast.info("Adding vehicle...");

    try {
      // Make API call
      const savedVehicle = await apiCall();

      // Replace optimistic vehicle with real one
      setVehicles(prev => 
        prev.map(v => v.VehicleId === tempId ? savedVehicle : v)
      );

      setPendingOperations(prev => 
        prev.filter(op => !(op.type === "add" && op.vehicle.VehicleId === tempId))
      );

      toast.success("Vehicle added successfully");

      options.onSuccess?.(operation);
    } catch (error) {
      // Rollback: Remove optimistic vehicle
      setVehicles(prev => prev.filter(v => v.VehicleId !== tempId));
      setPendingOperations(prev => 
        prev.filter(op => !(op.type === "add" && op.vehicle.VehicleId === tempId))
      );

      const err = error instanceof Error ? error : new Error("Failed to add vehicle");
      
      toast.error(`Failed to add vehicle: ${err.message}`);

      options.onError?.(err, operation);
      throw err;
    }
  }, [generateTempId, options, toast]);

  // Optimistic delete operation
  const optimisticDelete = useCallback(async (
    vehicleId: string | number,
    apiCall: () => Promise<void>
  ) => {
    // Find vehicle for potential rollback
    const vehicleToDelete = vehicles.find(v => v.VehicleId === vehicleId);
    if (!vehicleToDelete) return;

    // Add to pending operations
    const operation: OptimisticOperation = { type: "delete", vehicleId };
    setPendingOperations(prev => [...prev, operation]);

    // Optimistically remove from UI
    setVehicles(prev => prev.filter(v => v.VehicleId !== vehicleId));

    toast.info("Deleting vehicle...");

    try {
      // Make API call
      await apiCall();

      setPendingOperations(prev => 
        prev.filter(op => !(op.type === "delete" && op.vehicleId === vehicleId))
      );

      toast.success("Vehicle deleted successfully");

      options.onSuccess?.(operation);
    } catch (error) {
      // Rollback: Restore vehicle
      setVehicles(prev => {
        const exists = prev.some(v => v.VehicleId === vehicleId);
        if (!exists && vehicleToDelete) {
          return [...prev, vehicleToDelete];
        }
        return prev;
      });
      
      setPendingOperations(prev => 
        prev.filter(op => !(op.type === "delete" && op.vehicleId === vehicleId))
      );

      const err = error instanceof Error ? error : new Error("Failed to delete vehicle");
      
      toast.error(`Failed to delete vehicle: ${err.message}`);

      options.onError?.(err, operation);
      throw err;
    }
  }, [vehicles, options, toast]);

  // Optimistic update operation
  const optimisticUpdate = useCallback(async (
    updatedVehicle: Vehicle,
    apiCall: () => Promise<Vehicle>
  ) => {
    const vehicleId = updatedVehicle.VehicleId;
    const previousVehicle = vehicles.find(v => v.VehicleId === vehicleId);
    
    if (!previousVehicle) return;

    // Add to pending operations
    const operation: OptimisticOperation = { type: "update", vehicle: updatedVehicle };
    setPendingOperations(prev => [...prev, operation]);

    // Optimistically update UI
    setVehicles(prev => 
      prev.map(v => v.VehicleId === vehicleId ? { ...updatedVehicle, _optimistic: true } : v)
    );

    toast.info("Updating vehicle...");

    try {
      // Make API call
      const savedVehicle = await apiCall();

      // Update with confirmed data
      setVehicles(prev => 
        prev.map(v => v.VehicleId === vehicleId ? savedVehicle : v)
      );

      setPendingOperations(prev => 
        prev.filter(op => !(op.type === "update" && op.vehicle.VehicleId === vehicleId))
      );

      toast.success("Vehicle updated successfully");

      options.onSuccess?.(operation);
    } catch (error) {
      // Rollback: Restore previous state
      setVehicles(prev => 
        prev.map(v => v.VehicleId === vehicleId ? previousVehicle : v)
      );
      
      setPendingOperations(prev => 
        prev.filter(op => !(op.type === "update" && op.vehicle.VehicleId === vehicleId))
      );

      const err = error instanceof Error ? error : new Error("Failed to update vehicle");
      
      toast.error(`Failed to update vehicle: ${err.message}`);

      options.onError?.(err, operation);
      throw err;
    }
  }, [vehicles, options, toast]);

  const isPending = pendingOperations.length > 0;

  return {
    vehicles,
    pendingOperations,
    optimisticAdd,
    optimisticDelete,
    optimisticUpdate,
    isPending,
    syncWithServer,
  };
}

export default useOptimisticVehicles;
