"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthUser } from "@/app/components/AuthContext";
import { useToast } from "@/components/ui/glass/GlassToast";
import { GlassCard } from "@/components/ui/glass/GlassCard";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { CardSkeleton } from "@/app/components/LoadingSkeleton";

import { ConfirmDeleteModal } from "@/app/components/vehicles/ConfirmDeleteModal";
import { useVehicle } from "@/app/components/vehicles/useVehicle";
import { useUpdateVehicleOptimistic } from "@/app/components/vehicles/useUpdateVehicleOptimistic";
import { useDeleteVehicle } from "@/app/components/vehicles/useDeleteVehicle";
import { useVehicles } from "@/lib/useVehicles";
import { formatVehicleId, formatVehicleTime } from "@/lib/format";
import type { Vehicle } from "@/lib/types";

import ErrorBoundary from "@/app/components/ErrorBoundary";

export default function EditVehiclePage() {
  return (
    <ErrorBoundary>
      <EditVehicleInner />
    </ErrorBoundary>
  );
}

// Reserved words that cannot be used as vehicle IDs
const RESERVED_IDS = ['edit', 'add', 'view', 'new', 'create', 'delete'];

function EditVehicleInner() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const rawId = typeof params?.id === "string" ? params.id : "";
  
  // Check if the ID is a reserved word (e.g., someone navigated to /vehicles/edit)
  const isReservedId = RESERVED_IDS.includes(rawId.toLowerCase());
  const id = isReservedId ? "" : rawId;
  
  const user = useAuthUser();
  const { success, error: showError } = useToast();
  
  const isAdmin = user?.role === "Admin";
  const userRole = user?.role || "Viewer";

  // Redirect to vehicles list if ID is a reserved word
  useEffect(() => {
    if (isReservedId) {
      router.push("/vehicles");
    }
  }, [isReservedId, router]);

  // Hooks
  const { vehicle, loading, error: fetchError, refetch } = useVehicle(id);
  
  // Local state - initialize with vehicle when it loads
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [localVehicle, setLocalVehicle] = useState<Vehicle | null>(null);
  
// Sync local vehicle with fetched vehicle when it changes (on initial load or refetch)
  // Using setTimeout to defer state update and avoid the setState-in-effect warning
  const hasInitializedRef = React.useRef(false);
  useEffect(() => {
    if (vehicle && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      // Defer state update to next tick to avoid synchronous setState in effect
      const timeoutId = setTimeout(() => {
        setLocalVehicle(vehicle);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [vehicle]);

  // Derived value for safe access - handles both null cases
  const currentVehicle = localVehicle ?? vehicle ?? null;
  // Fetch all vehicles for navigation - use high limit to ensure current vehicle is included
  const { vehicles: allVehicles } = useVehicles({ noCache: true, limit: 10000 });
  
  // Calculate next and previous vehicles
  const { nextVehicle, prevVehicle } = useMemo(() => {
    if (!allVehicles || allVehicles.length === 0 || !vehicle) {
      return { nextVehicle: null, prevVehicle: null };
    }
    
    const currentIndex = allVehicles.findIndex(v => v.VehicleId === vehicle.VehicleId);
    if (currentIndex === -1) {
      return { nextVehicle: null, prevVehicle: null };
    }
    
    const next = currentIndex < allVehicles.length - 1 ? allVehicles[currentIndex + 1] : null;
    const prev = currentIndex > 0 ? allVehicles[currentIndex - 1] : null;
    
    return { nextVehicle: next, prevVehicle: prev };
  }, [allVehicles, vehicle]);

  const handleUpdateSuccess = useCallback((updatedVehicle?: Vehicle) => {
    success("Vehicle updated successfully");
    
    // If we have the updated vehicle with new image, update local state immediately
    // so the form shows the new Cloudinary image before navigating
    if (updatedVehicle) {
      // Update local vehicle state so the form shows the new image immediately
      setLocalVehicle(updatedVehicle);
    }
    
    // Refresh vehicle data to ensure cache is updated
    refetch();
    
    // Navigate to view page after a short delay to show the success
    setTimeout(() => {
      router.push(`/vehicles/${id}/view`);
    }, 1200); // Slightly longer delay so user can see the new image
  }, [success, router, id, refetch]);

  const handleUpdateError = useCallback((err: string) => {
    showError(err);
    setSubmitError(err);
  }, [showError]);

  const { updateVehicle, isUpdating } = useUpdateVehicleOptimistic({
    onSuccess: handleUpdateSuccess,
    onError: (error) => handleUpdateError(error.message),
  });

  const handleDeleteSuccess = useCallback(() => {
    success("Vehicle deleted successfully");
    setIsDeleteModalOpen(false);
    router.push("/vehicles");
  }, [success, router]);

  const handleDeleteError = useCallback((err: string) => {
    showError(err);
  }, [showError]);

  const { deleteVehicle, isDeleting } = useDeleteVehicle(
    handleDeleteSuccess,
    handleDeleteError
  );

  // Handle form submission
  const handleSubmit = useCallback(async (formData: Partial<Vehicle>, image: File | string | null) => {
const vehicleToUpdate = currentVehicle;
    if (!vehicleToUpdate) return;
    
    setSubmitError(null);
    
    // IMPORTANT: Exclude Image from formData to prevent data URLs from being saved
    // The image will be handled separately via the imageFile parameter
    const { Image: _Image, ...dataWithoutImage } = formData;
    
    const updateData = {
      ...dataWithoutImage,
      VehicleId: vehicleToUpdate.VehicleId,
    };
    
    // Extract File from image if it's a File, otherwise pass null
    const imageFile = image instanceof File ? image : null;
    
    // Call updateVehicle with all required parameters: vehicleId, data, originalVehicle, imageFile
    await updateVehicle(
      vehicleToUpdate.VehicleId,
      updateData,
      vehicleToUpdate,
      imageFile
    );
  }, [localVehicle, vehicle, updateVehicle]);

  // Handle cancel with unsaved changes warning
  const handleCancel = useCallback(() => {
    router.push(`/vehicles/${id}/view`);
  }, [router, id]);

  // Handle delete
  const handleDelete = useCallback(async () => {
const vehicleToDelete = currentVehicle;
    if (!vehicleToDelete) return;
    await deleteVehicle(vehicleToDelete);
}, [currentVehicle, deleteVehicle]);

  // Clear submit error
  const handleClearError = useCallback(() => {
    setSubmitError(null);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <CardSkeleton className="h-[600px]" />
        </div>
      </div>
    );
  }

  // Error state
  if (fetchError) {
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
            <p className="text-gray-600 dark:text-gray-400 mb-6">{fetchError}</p>
            <div className="flex gap-3 justify-center">
              <GlassButton onClick={() => refetch()} variant="primary">
                Retry
              </GlassButton>
              <GlassButton onClick={() => router.push("/vehicles")} variant="secondary">
                Back to List
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  // Not found state
  if (!localVehicle && !vehicle) {
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
            <GlassButton onClick={() => router.push("/vehicles")} variant="primary">
              Back to Vehicles
            </GlassButton>
          </GlassCard>
        </div>
      </div>
    );
  }

// Permission check
  if (!isAdmin) {
    const vehicleForView = currentVehicle;
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <GlassCard variant="elevated" className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 text-amber-600"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                <path d="M8 11h8" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Only Admin can edit vehicles.
            </p>
            <div className="flex gap-3 justify-center">
              <GlassButton onClick={() => router.push("/vehicles")} variant="secondary">
                Back to List
              </GlassButton>
              <GlassButton 
                onClick={() => vehicleForView && router.push(`/vehicles/${vehicleForView.VehicleId}/view`)} 
                variant="primary"
              >
                View Vehicle
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto">
        {/* Main Glass Card */}
        <GlassCard 
          variant="elevated" 
          className="overflow-hidden bg-gradient-to-br from-white/70 via-emerald-50/10 via-red-50/5 via-emerald-50/10 to-white/70 dark:from-white/8 dark:via-emerald-500/10 dark:via-red-900/5 dark:via-emerald-900/8 dark:to-white/8 border-white/20 dark:border-white/10"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <GlassButton
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="flex items-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                  Back
                </GlassButton>
                
                {/* Navigation Buttons */}
                <div className="flex items-center gap-1 border-l border-gray-300 dark:border-gray-600 pl-3">
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={() => prevVehicle && router.push(`/vehicles/${prevVehicle.VehicleId}/edit`)}
                    disabled={!prevVehicle}
                    className="flex items-center gap-1 px-2"
                    title={prevVehicle ? `Previous: ${prevVehicle.Brand} ${prevVehicle.Model}` : 'No previous vehicle'}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                    <span className="hidden sm:inline">Prev</span>
                  </GlassButton>
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={() => nextVehicle && router.push(`/vehicles/${nextVehicle.VehicleId}/edit`)}
                    disabled={!nextVehicle}
                    className="flex items-center gap-1 px-2"
                    title={nextVehicle ? `Next: ${nextVehicle.Brand} ${nextVehicle.Model}` : 'No next vehicle'}
                  >
                    <span className="hidden sm:inline">Next</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </GlassButton>
                </div>

                <div>
<h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                    Edit Vehicle
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    ID: {formatVehicleId(currentVehicle?.VehicleId ?? "")}
                  </p>
                </div>
              </div>
              
{/* Status Chips */}
              <div className="flex items-center gap-2 flex-wrap">
                {currentVehicle?.Category && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                    {currentVehicle.Category}
                  </span>
                )}
                {currentVehicle?.Condition && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    {currentVehicle.Condition}
                  </span>
                )}
                {currentVehicle?.Time && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                    Updated: {formatVehicleTime(currentVehicle.Time)}
                  </span>
                )}
              </div>
            </div>
          </div>

{/* Form Content */}
          <div className="p-4 md:p-6 space-y-6">
            <VehicleForm
              vehicle={currentVehicle as Vehicle}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={isUpdating}
              submitError={submitError}
              onClearError={handleClearError}
            />
          </div>

          {/* Delete Section - Only for Admin */}
          <div className="px-4 md:px-6 pb-4 md:pb-6">
            <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Danger Zone
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Permanently delete this vehicle and all associated data
                  </p>
                </div>
                <GlassButton
                  variant="danger"
                  size="md"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                  Delete Vehicle
                </GlassButton>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

{/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        vehicle={currentVehicle as Vehicle}
        isOpen={isDeleteModalOpen}
        isDeleting={isDeleting}
        userRole={userRole}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
