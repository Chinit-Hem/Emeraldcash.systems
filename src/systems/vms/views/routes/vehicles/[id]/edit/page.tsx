"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthUser } from "@/shared/hooks/AuthContext";
import { hasAppPermission } from "@/shared/utils/permissions";
import { useToast } from "@/shared/components/ui/glass/GlassToast";
import { GlassCard } from "@/shared/components/ui/glass/GlassCard";
import { GlassButton } from "@/shared/components/ui/glass/GlassButton";
import { NeuVehicleFormSkeleton } from "@/shared/components/skeletons/NeuVehicleFormSkeleton";

import { ConfirmDeleteModal } from "@/systems/vms/components/vehicles/ConfirmDeleteModal";
import BasicVehicleForm from "@/systems/vms/components/dashboard/BasicVehicleForm";
import { useVehicle } from "@/systems/vms/components/vehicles/useVehicle";
import { useUpdateVehicleOptimistic } from "@/systems/vms/components/vehicles/useUpdateVehicleOptimistic";
import { useDeleteVehicle } from "@/systems/vms/components/vehicles/useDeleteVehicle";
import { useVehicles } from "@/systems/vms/hooks/useVehicles";
import { useVehicleListBackLink } from "@/systems/vms/hooks/useVehicleListBackLink";
import {
  getVehicleGroupKey,
  parseVehicleGroupByParam,
  withVehicleListQueryFallback
} from "@/systems/vms/utils/vehicleListState";
import { formatVehicleId, formatVehicleTime } from "@/shared/utils/format";
import type { Vehicle } from "@/shared/types/types";

import ErrorBoundary from "@/shared/components/ErrorBoundary";

export default function EditVehiclePage() {
  return (
    <ErrorBoundary>
      <EditVehicleInner />
    </ErrorBoundary>
  );
}

// Reserved words that cannot be used as vehicle IDs
const RESERVED_IDS = ['edit', 'add', 'view', 'new', 'create', 'delete'];
const VEHICLE_NAVIGATION_FETCH_LIMIT = 2000;

function EditVehicleInner() {
  const router = useRouter();
  const { href: listHref, label: backToListLabel, searchParams } = useVehicleListBackLink();
  const groupBy = parseVehicleGroupByParam(searchParams.get("groupBy"));
  const params = useParams<{ id: string }>();
  const rawId = typeof params?.id === "string" ? params.id : "";

  // Check if the ID is a reserved word (e.g., someone navigated to /vehicles/edit)
  const isReservedId = RESERVED_IDS.includes(rawId.toLowerCase());
  const id = isReservedId ? "" : rawId;

  const user = useAuthUser();
  const { success, error: showError } = useToast();

  const canEditVehicle = hasAppPermission(user?.role, "vehicles:edit");
  const userRole = user?.role || "Viewer";

  const handleBackToList = useCallback(() => {
    router.replace(listHref, { scroll: false });
  }, [listHref, router]);

  // Redirect to vehicles list if ID is a reserved word
  useEffect(() => {
    if (isReservedId) {
      router.replace(listHref, { scroll: false });
    }
  }, [isReservedId, listHref, router]);

  const getViewHref = useCallback((vehicleId: string) => (
    withVehicleListQueryFallback(`/vehicles/${encodeURIComponent(vehicleId)}/view`, searchParams)
  ), [searchParams]);

  const getEditHref = useCallback((vehicleId: string) => (
    withVehicleListQueryFallback(`/vehicles/${encodeURIComponent(vehicleId)}/edit`, searchParams)
  ), [searchParams]);

  // Hooks
  const { vehicle, loading, error: fetchError, refetch } = useVehicle(id);

  // Local state (simplified - no localVehicle sync delay)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Use vehicle directly - no local sync delay
  const currentVehicle = vehicle;

  // Fetch enough vehicles for next/previous navigation without pulling a huge dataset on every edit.
  const { vehicles: allVehicles } = useVehicles({ limit: VEHICLE_NAVIGATION_FETCH_LIMIT });

  const navigationVehicles = useMemo(() => {
    if (groupBy === "none" || !vehicle) return allVehicles;

    const currentGroupKey = getVehicleGroupKey(vehicle, groupBy);
    return allVehicles.filter((candidate) => getVehicleGroupKey(candidate, groupBy) === currentGroupKey);
  }, [allVehicles, groupBy, vehicle]);

  // Calculate next and previous vehicles
  const { nextVehicle, prevVehicle } = useMemo(() => {
    if (!navigationVehicles || navigationVehicles.length === 0 || !vehicle) {
      return { nextVehicle: null, prevVehicle: null };
    }

    const currentIndex = navigationVehicles.findIndex(v => v.VehicleId === vehicle.VehicleId);
    if (currentIndex === -1) {
      return { nextVehicle: null, prevVehicle: null };
    }

    const next = currentIndex < navigationVehicles.length - 1 ? navigationVehicles[currentIndex + 1] : null;
    const prev = currentIndex > 0 ? navigationVehicles[currentIndex - 1] : null;

    return { nextVehicle: next, prevVehicle: prev };
  }, [navigationVehicles, vehicle]);

  const handleUpdateSuccess = useCallback((_updatedVehicle?: Vehicle) => {
    success("Vehicle updated successfully");

    // Refresh vehicle data (hook handles optimistic update)
    refetch();

    // Navigate to view immediately (no delay needed)
    router.replace(getViewHref(id));
  }, [success, router, getViewHref, id, refetch]);


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
    router.replace(listHref, { scroll: false });
  }, [success, router, listHref]);

  const handleDeleteError = useCallback((err: string) => {
    showError(err);
  }, [showError]);

  const { deleteVehicle, isDeleting } = useDeleteVehicle(
    handleDeleteSuccess,
    handleDeleteError
  );

  // Handle form submission (simplified)
  const handleSubmit = useCallback(async (formData: Partial<Vehicle>, image?: File | null) => {
    if (!currentVehicle) return;

    setSubmitError(null);

    const imageFile = image instanceof File ? image : undefined;

    await updateVehicle(
      currentVehicle.VehicleId,
      formData,
      currentVehicle,
      imageFile
    );
  }, [currentVehicle, updateVehicle]);


  // Handle cancel with unsaved changes warning
  const handleCancel = useCallback(() => {
    router.replace(getViewHref(id));
  }, [router, getViewHref, id]);

  // Handle delete (simplified)
  const handleDelete = useCallback(async () => {
    if (!currentVehicle) return;
    await deleteVehicle(currentVehicle);
  }, [currentVehicle, deleteVehicle]);


  // Clear submit error
  const handleClearError = useCallback(() => {
    setSubmitError(null);
  }, []);

  // Loading state
  if (loading) {
    return <NeuVehicleFormSkeleton />;
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
              <GlassButton onClick={handleBackToList} variant="secondary">
                {backToListLabel}
              </GlassButton>
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
            <GlassButton onClick={handleBackToList} variant="primary">
              {backToListLabel}
            </GlassButton>
          </GlassCard>
        </div>
      </div>
    );
  }

  // Permission check
  if (!canEditVehicle) {
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
              You do not have permission to edit vehicles.
            </p>
            <div className="flex gap-3 justify-center">
              <GlassButton onClick={handleBackToList} variant="secondary">
                {backToListLabel}
              </GlassButton>
              <GlassButton
                onClick={() => vehicle && router.replace(getViewHref(vehicle.VehicleId))}
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
          className="overflow-hidden border-slate-200/70 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/80"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 p-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
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
                  <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
                    <GlassButton
                      variant="ghost"
                      size="sm"
                      onClick={() => prevVehicle && router.push(getEditHref(prevVehicle.VehicleId))}
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
                      onClick={() => nextVehicle && router.push(getEditHref(nextVehicle.VehicleId))}
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
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    Edit record
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950 dark:text-white md:text-3xl">
                    {currentVehicle?.Brand || "Vehicle"} {currentVehicle?.Model || ""}
                  </h1>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  ID {formatVehicleId(currentVehicle?.VehicleId ?? "")}
                </span>
                {currentVehicle?.Category && (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                    {currentVehicle.Category}
                  </span>
                )}
                {currentVehicle?.Condition && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {currentVehicle.Condition}
                  </span>
                )}
                {currentVehicle?.Time && (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Updated: {formatVehicleTime(currentVehicle.Time)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="space-y-6 p-4 md:p-6">
            <BasicVehicleForm
              vehicle={vehicle}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={isUpdating}
              submitError={submitError}
              onClearError={handleClearError}
            />

          </div>

          {/* Delete Section - Only for Admin */}
          <div className="px-4 pb-4 md:px-6 md:pb-6">
            <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4 dark:border-red-900/40 dark:bg-red-950/20 md:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-red-900 dark:text-red-200">
                    Danger Zone
                  </h3>
                  <p className="mt-1 text-sm text-red-700/80 dark:text-red-200/70">
                    Permanently delete this vehicle and all associated data.
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
        vehicle={vehicle}
        isOpen={isDeleteModalOpen}
        isDeleting={isDeleting}
        userRole={userRole}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

    </div>
  );
}
