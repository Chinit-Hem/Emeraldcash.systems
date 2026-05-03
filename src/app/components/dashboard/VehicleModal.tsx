"use client";

import dynamic from "next/dynamic";
import BasicForm from "./BasicVehicleForm";
const HeavyForm = dynamic(() => import("./HeavyVehicleForm"), { 
  loading: () => <div className="h-12 bg-slate-100 animate-pulse rounded-lg mb-4" /> 
});
import { useUI } from "@/app/components/UIContext";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import type { Vehicle } from "@/lib/types";
import { useEffect, useState } from "react";

interface VehicleModalProps {
  isOpen: boolean;
  vehicle: Vehicle | null;
  onClose: () => void;
  onSave: (vehicle: Partial<Vehicle>, imageFile?: File) => Promise<void>;
  uploadProgress?: {
    stage: 'compressing' | 'uploading' | 'processing' | 'saving' | null;
    progress: number;
  };
}

/**
 * Unified Vehicle Modal
 * 
 * This component wraps the shared VehicleForm component to ensure
 * consistent styling and behavior across the entire application.
 * 
 * The VehicleForm component handles both modal and inline modes,
 * providing a unified user experience for adding and editing vehicles.
 */
export default function VehicleModal({ isOpen, vehicle, onClose, onSave, uploadProgress }: VehicleModalProps) {
  const { setIsModalOpen } = useUI();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lock body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Sync modal state with UI context
  useEffect(() => {
    if (isOpen) {
      setIsModalOpen(true);
      setError(null);
    } else {
      setIsModalOpen(false);
    }
  }, [isOpen, setIsModalOpen]);

  // Prepare vehicle data for the form
  const formVehicle: Vehicle = vehicle || {
    VehicleId: "",
    Brand: "",
    Model: "",
    Category: "",
    Plate: "",
    Year: null,
    Color: "",
    Condition: "New",
    BodyType: "",
    TaxType: "",
    PriceNew: null,
    Price40: null,
    Price70: null,
    Image: "",
    Time: "",
  };

  const handleSubmit = async (data: Partial<Vehicle>, imageFile: File | null) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await onSave(data, imageFile);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save vehicle";
      setError(message);
      console.error("[VehicleModal] Save error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearError = () => {
    setError(null);
  };

  if (!isOpen) return null;


  return (
    <>
      <BasicForm
        vehicle={formVehicle}
        onSubmit={handleSubmit}
        onCancel={onClose}
        isSubmitting={isLoading}
        submitError={error}
        onClearError={handleClearError}
        modalTitle={vehicle ? "Edit Vehicle" : "Add New Vehicle"}
      />
      <Suspense fallback={null}>
        <HeavyForm 
          vehicle={formVehicle} 
          onCancel={onClose}
          uploadProgress={uploadProgress}
        />
      </Suspense>
    </>
  );

}
