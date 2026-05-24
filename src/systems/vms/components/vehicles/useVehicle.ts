"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { onVehicleCacheUpdate } from "@/systems/vms/utils/vehicleCache";
import type { Vehicle } from "@/shared/types/types";


interface UseVehicleResult {
  vehicle: Vehicle | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useVehicle(id: string): UseVehicleResult {
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use ref to prevent double fetches and track if we've loaded from cache
  const fetchedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchVehicle = useCallback(async () => {
    if (!id) return;

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      // Try cache first for instant UI
      if (!fetchedRef.current) {
        try {
          const cached = localStorage.getItem("vms-vehicles");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              const found = (parsed as Vehicle[]).find((v) => v.VehicleId === id);
              if (found) {
                setVehicle(found);
                setLoading(false);
                fetchedRef.current = true;
              }
            }
          }
        } catch {
          // Ignore cache errors
        }
      }

      // Fetch fresh data
      const res = await fetch(`/api/vehicles/${encodeURIComponent(id)}`, {
        cache: "no-store",
        credentials: "include",
        signal: abortControllerRef.current.signal,
      });

      if (res.status === 401) {
        router.push("/login?redirect=" + encodeURIComponent(window.location.pathname));
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to fetch vehicle: ${res.status}`);
      }

      const data = await res.json().catch(() => ({}));
      const fetchedVehicle = data.data || data.vehicle;

      if (!fetchedVehicle) {
        throw new Error("Vehicle not found");
      }

      setVehicle(fetchedVehicle);
      fetchedRef.current = true;

      // Update cache
      try {
        const cached = localStorage.getItem("vms-vehicles");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const index = parsed.findIndex((v: Vehicle) => v.VehicleId === id);
            if (index >= 0) {
              parsed[index] = fetchedVehicle;
            } else {
              parsed.push(fetchedVehicle);
            }
            localStorage.setItem("vms-vehicles", JSON.stringify(parsed));
          }
        }
      } catch {
        // Ignore cache update errors
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return; // Ignore abort errors
      }
      setError(err instanceof Error ? err.message : "Error loading vehicle");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchVehicle();

    return () => {
      // Cleanup: abort any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchVehicle]);

  // Listen for cache updates to refresh vehicle data when it changes
  useEffect(() => {
    return onVehicleCacheUpdate((vehicles) => {
      const updatedVehicle = vehicles.find((v) => v.VehicleId === id);
      if (updatedVehicle) {
        setVehicle(updatedVehicle);
      }
    });
  }, [id]);

  return {

    vehicle,
    loading,
    error,
    refetch: fetchVehicle,
  };
}
