"use client";

// import { VehicleFormUnified } from "@/lib/useVehicleFormUnified";
import type { Vehicle } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/LanguageContext";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";

interface BasicVehicleFormProps {
  vehicle: Vehicle;
  onSubmit: (data: Partial<Vehicle>, imageFile?: File | null | undefined) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  submitError?: string | null;
  onClearError: () => void;
  modalTitle?: string;
}

export default function BasicVehicleForm({
  vehicle,
  onSubmit,
  onCancel,
  isSubmitting,
  submitError,
  onClearError,
  modalTitle = "Vehicle Form"
}: BasicVehicleFormProps) {
  // Form logic here - minimal stub to fix parsing
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-6">{modalTitle}</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Form fields stub */}
          <input type="text" placeholder="Brand" className="p-3 border rounded-lg" />
          <input type="text" placeholder="Model" className="p-3 border rounded-lg" />
        </div>
        <div className="flex gap-3 pt-4">
          <button 
            onClick={onCancel} 
            className="flex-1 p-3 bg-gray-500 text-white rounded-lg"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            onClick={() => {}} 
            className="flex-1 p-3 bg-emerald-500 text-white rounded-lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
        {submitError && (
          <div className="p-3 bg-red-100 text-red-700 rounded-lg">
            {submitError}
          </div>
        )}
      </div>
    </div>
  );
}
