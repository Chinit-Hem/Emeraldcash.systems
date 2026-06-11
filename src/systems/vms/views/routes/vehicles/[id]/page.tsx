"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthUser } from "@/shared/hooks/AuthContext";
import { VehicleDetailsCard } from "@/systems/vms/components/vehicles/VehicleDetailsCard";
import { VehicleForm } from "@/systems/vms/components/vehicles/VehicleForm";
import { GlassCard } from "@/shared/components/ui/glass/GlassCard";
import { NeuVehicleFormSkeleton } from "@/shared/components/skeletons/NeuVehicleFormSkeleton";

import { extractDriveFileId } from "@/shared/utils/drive";
import { refreshVehicleCache, writeVehicleCache } from "@/systems/vms/utils/vehicleCache";
import type { Vehicle } from "@/shared/types/types";
import { derivePrices } from "@/systems/vms/utils/pricing";
import { withVehicleListQueryFallback } from "@/systems/vms/utils/vehicleListState";
import { useVehicleListBackLink } from "@/systems/vms/hooks/useVehicleListBackLink";
import { useMounted } from "@/shared/hooks/useMounted";
import ErrorBoundary from "@/shared/components/ErrorBoundary";

export default function VehicleDetailPage() {
  return (
    <ErrorBoundary>
      <VehicleDetailInner />
    </ErrorBoundary>
  );
}

function VehicleDetailInner() {
  const router = useRouter();
  const { href: listHref, label: backToListLabel, searchParams } = useVehicleListBackLink();
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const user = useAuthUser();
  const isMounted = useMounted();
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Determine user role
  const userRole = user?.role || "Viewer";

  const handleBackToList = useCallback(() => {
    router.push(listHref, { scroll: false });
  }, [listHref, router]);

  // Load vehicle data (client-side only)
  useEffect(() => {
    if (!id || !isMounted) return;

    // Try to find vehicle in cache first
    try {
      const cached = localStorage.getItem("vms-vehicles");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const found = (parsed as Vehicle[]).find((v) => v.VehicleId === id);
          if (found) {
            setVehicle(found);
            setLoading(false);
          }
        }
      }
    } catch {
      // Ignore cache errors
    }

    // Fetch fresh data in background
    let alive = true;
    setError("");

    async function fetchVehicle() {
      try {
        const res = await fetch(`/api/vehicles/${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (res.status === 404) {
          // Vehicle not found - let !vehicle state handle it
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch vehicle");
        const data = await res.json();
        if (!alive) return;
        const fetchedVehicle = data.data || data.vehicle;
        setVehicle(fetchedVehicle);
        
        // Update cache
        try {
          const cached = localStorage.getItem("vms-vehicles");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              const index = parsed.findIndex((v: Vehicle) => v.VehicleId === id);
              if (index >= 0) {
                parsed[index] = fetchedVehicle;
                localStorage.setItem("vms-vehicles", JSON.stringify(parsed));
              }
            }
          }
        } catch {
          // Ignore cache update errors
        }
      } catch (err) {
        if (!alive) return;
        if (!vehicle) {
          setError(err instanceof Error ? err.message : "Error loading vehicle");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchVehicle();
    return () => {
      alive = false;
    };
  }, [id, router, vehicle, isMounted]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!vehicle) return;
    
    setIsDeleting(true);
    try {
      const imageFileId = extractDriveFileId(vehicle.Image);
      const res = await fetch(`/api/vehicles/${encodeURIComponent(vehicle.VehicleId)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageFileId, imageUrl: vehicle.Image }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) {
        throw new Error(json.error || "Failed to delete vehicle");
      }

      await refreshVehicleCache();
      router.push(listHref, { scroll: false });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  }, [listHref, vehicle, router]);

  // Handle save
  const handleSave = useCallback(async (formData: Vehicle & { imageFile?: File | null }) => {

    if (!vehicle) return;

    setIsSaving(true);
    try {
      let cloudinaryImageUrl: string | null = null;

      // Step 1: Upload image to Cloudinary if provided
      if (formData.imageFile) {
        // Upload to Cloudinary using unsigned upload preset
        const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
          throw new Error("Cloudinary configuration missing");
        }

        const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
        const uploadFormData = new FormData();
        uploadFormData.append("file", formData.imageFile);
        uploadFormData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        uploadFormData.append("folder", "vms/vehicles");
        
        const uploadRes = await fetch(url, {
          method: "POST",
          body: uploadFormData,
        });

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json().catch(() => ({}));
          throw new Error(errorData.error?.message || "Failed to upload image to Cloudinary");
        }

        const uploadData = await uploadRes.json();
        cloudinaryImageUrl = uploadData.secure_url;
      }

      // Step 2: Prepare JSON payload with Cloudinary URL
      // IMPORTANT: Exclude Image from formData if we're uploading a new image
      // to prevent data URLs from being saved to the database
      const { imageFile: _imageFile, Image: _imageFromForm, ...dataWithoutFile } = formData;
      
      const derived = derivePrices(dataWithoutFile.PriceNew);
      
      const payload = {
        ...dataWithoutFile,
        VehicleId: vehicle.VehicleId,
        Price40: derived.Price40,
        Price70: derived.Price70,
        // Include the Cloudinary URL if image was uploaded, otherwise keep existing
        Image: cloudinaryImageUrl || vehicle.Image,
      };

      const res = await fetch(`/api/vehicles/${encodeURIComponent(vehicle.VehicleId)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const json = await res.json().catch(() => ({}));
      if (res.status === 403) throw new Error("Forbidden");
      if (!res.ok || json.ok === false) {
        throw new Error(json.error || "Failed to save vehicle");
      }

      // Get the updated vehicle from API response (includes Cloudinary URL)
      const responseData = json.data || json.vehicle || {};
      
      // Update local state with API response data (includes new Cloudinary URL)
      const updatedVehicle: Vehicle = {
        ...vehicle,
        ...formData,
        ...responseData, // API response takes precedence (includes Image URL)
        Price40: derivePrices(formData.PriceNew).Price40,
        Price70: derivePrices(formData.PriceNew).Price70,
      };

      setVehicle(updatedVehicle);

      // Update cache
      try {
        const cached = localStorage.getItem("vms-vehicles");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const index = parsed.findIndex((v: Vehicle) => v.VehicleId === vehicle.VehicleId);
            if (index >= 0) {
              parsed[index] = updatedVehicle;
              writeVehicleCache(parsed);
            }
          }
        }
      } catch {
        // Ignore cache errors
      }

      await refreshVehicleCache();
      setIsEditModalOpen(false);
      
      // Redirect to view page with refresh parameter to skip cache
      const viewHref = withVehicleListQueryFallback(`/vehicles/${vehicle.VehicleId}/view`, searchParams);
      router.push(`${viewHref}${viewHref.includes("?") ? "&" : "?"}refresh=1`);
      
      // Show success toast (you can integrate with your toast system)
      // toast.success("Vehicle updated successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setSubmitError(`Failed to save vehicle: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  }, [searchParams, vehicle, router]);

  // Loading state
  if (loading) {
    return <NeuVehicleFormSkeleton />;
  }


  // Error state
  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <GlassCard variant="elevated" className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 text-red-600"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6" />
                <path d="m9 9 6 6" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Error Loading Vehicle
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
              >
                Retry
              </button>
              <button
                onClick={handleBackToList}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                {backToListLabel}
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  // Not found state
  if (!vehicle) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <GlassCard variant="elevated" className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 text-gray-400"
              >
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <path d="M9 17h6" />
                <circle cx="17" cy="17" r="2" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Vehicle Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The vehicle you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <button
              onClick={handleBackToList}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              {backToListLabel}
            </button>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <VehicleDetailsCard
          vehicle={vehicle}
          userRole={userRole}
          onEdit={() => setIsEditModalOpen(true)}
          onDelete={handleDelete}
          isDeleting={isDeleting}
        />

      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <VehicleForm
          vehicle={vehicle}
          onSubmit={async (formData, imageFile) => {
            await handleSave({ ...formData, imageFile } as Vehicle & { imageFile?: File | null });
          }}
          onCancel={() => setIsEditModalOpen(false)}
          isSubmitting={isSaving}
          submitError={submitError}
          onClearError={() => setSubmitError(null)}
          isModal={true}
          modalTitle="Edit Vehicle"
        />
      )}
    </div>
  );
}
