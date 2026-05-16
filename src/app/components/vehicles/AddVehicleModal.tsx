"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/glass/GlassToast";
import { cn } from "@/lib/ui";
import type { Vehicle } from "@/lib/types";
import { derivePrices } from "@/lib/pricing";
import { base64ToBlob } from "@/lib/base64ToBlob";
import { formatFileSize as formatImageSize } from "@/lib/compressImage";
import ImageInput from "@/components/ui/ImageInput";

// Icons (import common ones used in project)
import {
  Car, Bike, Tag, Calendar, DollarSign, CheckCircle2,
  FileText, ImageIcon as ImageIconComp, Loader2, Save,
  Sparkles, X, AlertCircle
} from "lucide-react";

// Types
interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormErrors {
  [key: string]: string;
}

type CategoryOption = "Cars" | "Motorcycles" | "Tuk Tuk";

// Constants from project
export const COLOR_OPTIONS = [
  { value: "White", hex: "#FFFFFF" },
  { value: "Black", hex: "#000000" },
  { value: "Silver", hex: "#C0C0C0" },
  { value: "Gray", hex: "#808080" },
  { value: "Red", hex: "#FF0000" },
  { value: "Blue", hex: "#0000FF" },
  { value: "Green", hex: "#008000" },
  // Add more as needed
];

const PLATE_NUMBER_MAX_LENGTH = 20;

const CATEGORY_OPTIONS: { value: CategoryOption; label: string; icon: React.ReactNode; color: string }[] = [
  {
    value: "Cars" as const,
    label: "Cars",
    icon: <Car className="w-6 h-6" />,
    color: "#3b82f6",
  },
  {
    value: "Motorcycles" as const,
    label: "Motorcycles",
    icon: <Bike className="w-6 h-6" />,
    color: "#8b5cf6",
  },
  {
    value: "Tuk Tuk" as const,
    label: "TukTuks",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="18" r="3" />
        <path d="M6 18h12" />
        <path d="M3 12h18v6H3z" />
      </svg>
    ),
    color: "#f97316",
  },
];

const INITIAL_FORM_DATA: Partial<Vehicle> = {
  Category: "Cars",
  Brand: "",
  Model: "",
  Year: null,
  Plate: "",
  PriceNew: null,
  Price40: null,
  Price70: null,
  TaxType: "",
  Condition: "",
  BodyType: "",
  Color: "",
  Image: "",
  Description: "",
};

const BASIC_INFO_EXAMPLES: Record<CategoryOption, {
  brand: string;
  model: string;
  year: string;
  plate: string;
  price: string;
}> = {
  Cars: {
    brand: "Toyota",
    model: "Camry",
    year: "2023",
    plate: "ABC-123",
    price: "15000",
  },
  Motorcycles: {
    brand: "Honda",
    model: "Dream",
    year: "2023",
    plate: "1AB-1234",
    price: "1500",
  },
  "Tuk Tuk": {
    brand: "Bajaj",
    model: "RE",
    year: "2022",
    plate: "PP-1234",
    price: "3500",
  },
};

function getBasicInfoExamples(category?: string) {
  return BASIC_INFO_EXAMPLES[category as CategoryOption] ?? BASIC_INFO_EXAMPLES.Cars;
}

// UI Components (kept as-is, minimal fixes)
function ModalBackdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function ModalContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn("w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden")}>
      {children}
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="sticky top-0 z-10 px-6 py-4 bg-gradient-to-r from-emerald-50 to-white border-b border-emerald-100 flex items-center justify-between">
      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-emerald-500" />
        {title}
      </h2>
      <button
        onClick={onClose}
        className="w-10 h-10 rounded-xl bg-white shadow-md hover:shadow-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all hover:rotate-90"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

function FormSection({
  title,
  icon: Icon,
  children
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-emerald-600" />
        </div>
        <h3 className="font-semibold text-slate-700">{title}</h3>
      </div>
      {children}
    </div>
  );
}

const FormInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; icon?: React.ComponentType<{ className?: string }>; }>(
  ({ label, error, icon: Icon, className, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
          {label}
        </label>
        <div className={cn(
          "relative rounded-xl border bg-white transition-all",
          isFocused ? "border-emerald-400 ring-2 ring-emerald-500/20 shadow-sm" : "border-slate-200 hover:border-slate-300",
          error && "border-red-300 ring-2 ring-red-500/20"
        )}>
          <input
            ref={ref}
            onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
            onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
            className={cn("w-full px-3 py-2.5 bg-transparent border-none outline-none rounded-xl text-slate-800 placeholder-slate-400", className)}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </p>
        )}
      </div>
    );
  }
);
FormInput.displayName = "FormInput";

function CategorySelector({ value, onChange }: { value: string; onChange: (value: CategoryOption) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">Category</label>
      <div className="grid grid-cols-3 gap-3">
        {CATEGORY_OPTIONS.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => onChange(cat.value)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
              value === cat.value ? "border-emerald-500 bg-emerald-50 shadow-md" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
            )}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
              style={{ backgroundColor: value === cat.value ? `${cat.color}20` : '#f1f5f9', color: cat.color }}
            >
              {cat.icon}
            </div>
            <span className={cn("text-sm font-medium", value === cat.value ? "text-slate-800" : "text-slate-600")}>
              {cat.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Main Component
// DEPRECATED - use AddVehicleModalOptimistic
export default function AddVehicleModal({ isOpen, onClose, onSuccess }: AddVehicleModalProps) {
  const { success: toastSuccess, error: toastError } = useToast();

  // Form state
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<FormErrors>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const uploadVehicleImage = useCallback(async (file: File, category?: string): Promise<string> => {
    const uploadFormData = new FormData();
    uploadFormData.append("image", file);
    if (category) uploadFormData.append("category", category);

    const uploadRes = await fetch("/api/upload", {
      method: "POST",
      body: uploadFormData,
      credentials: "include",
    });

    const uploadData = await uploadRes.json().catch(() => null);
    if (!uploadRes.ok || !uploadData?.ok || !uploadData?.data?.url) {
      throw new Error(uploadData?.error || "Image upload failed");
    }

    return uploadData.data.url as string;
  }, []);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setFormData(INITIAL_FORM_DATA);
      setErrors({});
      setImagePreview(null);
      setImageFile(null);
    }
  }, [isOpen]);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.Brand?.trim()) newErrors.Brand = "Brand is required";
    if (!formData.Model?.trim()) newErrors.Model = "Model is required";
    if (!formData.Year || formData.Year < 1900 || formData.Year > new Date().getFullYear() + 1) newErrors.Year = "Valid year required";
    if (!formData.Plate?.trim()) newErrors.Plate = "Plate is required";
    if (!formData.PriceNew || formData.PriceNew <= 0) newErrors.PriceNew = "Valid price required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleInputChange = useCallback((field: keyof Vehicle, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as string]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field as string];
        return next;
      });
    }
  }, [errors]);

  const handlePriceChange = useCallback((value: string) => {
    const numValue = value ? parseFloat(value) : null;
    setFormData(prev => {
      const newData = { ...prev, PriceNew: numValue };
      if (numValue && numValue > 0) {
        const prices = derivePrices(numValue);
        newData.Price40 = prices.Price40;
        newData.Price70 = prices.Price70;
      }
      return newData;
    });
  }, []);

  const handleImageChange = useCallback((value: string | null) => {
    setImagePreview(value);
    if (value?.startsWith('data:')) {
      try {
        const blob = base64ToBlob(value);
        setImageFile(new File([blob], 'vehicle.jpg', { type: blob.type }));
        setFormData(prev => ({ ...prev, Image: "" }));
      } catch {
        setImageFile(null);
        setFormData(prev => ({ ...prev, Image: "" }));
      }
    } else if (typeof value === "string" && (value.startsWith("http://") || value.startsWith("https://"))) {
      setImageFile(null);
      setFormData(prev => ({ ...prev, Image: value }));
    } else {
      setImageFile(null);
      setFormData(prev => ({ ...prev, Image: "" }));
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toastError("Please fix form errors");
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare payload
      const payload: Partial<Vehicle> = { ...formData };
      if (imageFile) {
        payload.Image = await uploadVehicleImage(imageFile, formData.Category);
      }

      // Create vehicle
      const res = await fetch('/api/vehicles/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create vehicle');
      }

      await res.json();
      toastSuccess("Vehicle created successfully!");
      onSuccess();
      onClose();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to save vehicle");
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, imageFile, validateForm, toastError, toastSuccess, onSuccess, onClose, uploadVehicleImage]);

  if (!isOpen) return null;
  const examples = getBasicInfoExamples(formData.Category);

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalContainer>
        <form onSubmit={handleSubmit} className="max-h-[90vh] overflow-y-auto">
          <ModalHeader title="Add New Vehicle" onClose={onClose} />

          <div className="p-6 space-y-6">
            {/* Category */}
            <FormSection title="Category" icon={Tag}>
              <CategorySelector
                value={formData.Category || "Cars"}
                onChange={(cat) => handleInputChange("Category", cat)}
              />
            </FormSection>

            {/* Basic Info */}
            <FormSection title="Basic Information" icon={Tag}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Brand *"
                  placeholder={examples.brand}
                  value={formData.Brand || ""}
                  onChange={(e) => handleInputChange("Brand", e.target.value)}
                  error={errors.Brand}
                  icon={Tag}
                />
                <FormInput
                  label="Model *"
                  placeholder={examples.model}
                  value={formData.Model || ""}
                  onChange={(e) => handleInputChange("Model", e.target.value)}
                  error={errors.Model}
                />
                <FormInput
                  label="Year *"
                  type="number"
                  value={formData.Year || ""}
                  onChange={(e) => handleInputChange("Year", parseInt(e.target.value) || null)}
                  error={errors.Year}
                  icon={Calendar}
                  min={1900}
                  max={new Date().getFullYear() + 1}
                  placeholder={examples.year}
                />
                <FormInput
                  label="Plate *"
                  placeholder={examples.plate}
                  value={formData.Plate || ""}
                  onChange={(e) => handleInputChange("Plate", e.target.value.toUpperCase())}
                  error={errors.Plate}
                  maxLength={PLATE_NUMBER_MAX_LENGTH}
                />
              </div>
            </FormSection>

            {/* Pricing */}
            <FormSection title="Pricing" icon={DollarSign}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormInput
                  label="New Price *"
                  type="number"
                  placeholder={examples.price}
                  value={formData.PriceNew || ""}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  error={errors.PriceNew}
                  icon={DollarSign}
                />
                <FormInput label="40% Price" type="number" value={formData.Price40 || ""} disabled className="bg-slate-50" />
                <FormInput label="70% Price" type="number" value={formData.Price70 || ""} disabled className="bg-slate-50" />
              </div>
            </FormSection>

            {/* Image */}
            <FormSection title="Vehicle Image" icon={ImageIconComp}>
              <ImageInput
                value={imagePreview || formData.Image || ""}
                onChange={handleImageChange}
                className="w-full"
                maxSizeMB={10}
              />
              {imageFile && (
                <p className="text-xs text-emerald-500 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Ready: {formatImageSize(imageFile.size)}
                </p>
              )}
            </FormSection>

            {/* Description */}
            <FormSection title="Description" icon={FileText}>
              <textarea
                value={formData.Description || ""}
                onChange={(e) => handleInputChange("Description", e.target.value)}
                placeholder="Additional details..."
                rows={3}
                className="w-full p-3 border border-slate-200 rounded-xl resize-vertical focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
              />
            </FormSection>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 rounded-xl font-medium text-white bg-emerald-500 hover:bg-emerald-600 shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Vehicle
                </>
              )}
            </button>
          </div>
        </form>
      </ModalContainer>
    </ModalBackdrop>
  );
}

