"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "@/shared/components/ui/glass/GlassToast";
import { cn } from "@/shared/utils/ui";
import {
  VEHICLE_BRAND_OPTIONS_BY_CATEGORY,
  getVehicleModelOptionsForBrand,
  type Vehicle,
} from "@/shared/types/types";
import { derivePrices } from "@/systems/vms/utils/pricing";
import ImageInput from "@/shared/components/ui/ImageInput";
import { TukTukIcon } from "@/shared/components/icons/TukTukIcon";
import { useAddVehicleOptimistic } from "@/systems/vms/components/vehicles/useAddVehicleOptimistic";

// Icons
import {
  Car, Bike, Tag, Calendar, DollarSign,
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

type CategoryOption = "Cars" | "Motorcycles" | "TukTuks";

export const COLOR_OPTIONS = [
  { value: "White", hex: "#FFFFFF" },
  { value: "Black", hex: "#000000" },
  { value: "Silver", hex: "#C0C0C0" },
  { value: "Gray", hex: "#808080" },
  { value: "Red", hex: "#FF0000" },
  { value: "Blue", hex: "#0000FF" },
  { value: "Green", hex: "#008000" },
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
    value: "TukTuks" as const,
    label: "TukTuks",
    icon: <TukTukIcon className="w-6 h-6" />,
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
  TukTuks: {
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

function getBrandOptions(category?: string) {
  return VEHICLE_BRAND_OPTIONS_BY_CATEGORY[
    category as keyof typeof VEHICLE_BRAND_OPTIONS_BY_CATEGORY
  ] ?? VEHICLE_BRAND_OPTIONS_BY_CATEGORY.Cars;
}

function getModelOptions(category?: string, brand?: string) {
  return category === "Motorcycles" ? getVehicleModelOptionsForBrand(brand) : [];
}

// UI Components
function ModalBackdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[300] overflow-y-auto bg-slate-900/60 backdrop-blur-sm"
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
        type="button"
        onClick={onClose}
        aria-label="Close add vehicle modal"
        title="Close add vehicle modal"
        className="w-10 h-10 rounded-xl bg-white shadow-md hover:shadow-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all hover:rotate-90"
      >
        <X className="w-5 h-5" aria-hidden="true" />
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
export default function AddVehicleModalOptimistic({ isOpen, onClose, onSuccess }: AddVehicleModalProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const { addVehicle, isAdding, isProcessing } = useAddVehicleOptimistic({
    onSuccess: (vehicle) => {
      toastSuccess(`Vehicle "${vehicle.Brand} ${vehicle.Model}" created!`);
      onSuccess();
      onClose();
    },
    onError: (err) => toastError(err.message),
  });

  // Form state
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<FormErrors>({});
  const [imageValues, setImageValues] = useState<string[]>([]);
  const [isImageProcessing, setIsImageProcessing] = useState(false);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setFormData(INITIAL_FORM_DATA);
      setErrors({});
      setImageValues([]);
      setIsImageProcessing(false);
    }
  }, [isOpen]);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.Brand?.trim()) newErrors.Brand = "Brand is required";
    if (!formData.Model?.trim()) newErrors.Model = "Model is required";
    if (!formData.Year || formData.Year < 1900 || formData.Year > new Date().getFullYear() + 1) newErrors.Year = "Valid year required";
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

  const handleImagesChange = useCallback((values: string[]) => {
    setImageValues(values);
    setFormData(prev => ({ ...prev, Image: values[0] || "", Images: values }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await addVehicle({ ...formData, Image: imageValues[0] || "", Images: imageValues }, undefined);
    } catch (err) {
      // Error handled by useAddVehicleOptimistic onError
    }
  }, [addVehicle, formData, imageValues, validateForm]);

  if (!isOpen) return null;

  const isDisabled = isAdding || isProcessing || isImageProcessing;
  const examples = getBasicInfoExamples(formData.Category);
  const brandOptions = getBrandOptions(formData.Category);
  const modelOptions = getModelOptions(formData.Category, formData.Brand || examples.brand);

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
                  disabled={isDisabled}
                  list="vehicle-brand-options"
                />
                <datalist id="vehicle-brand-options">
                  {brandOptions.map((brand) => (
                    <option key={brand} value={brand} />
                  ))}
                </datalist>
                <FormInput
                  label="Model *"
                  placeholder={examples.model}
                  value={formData.Model || ""}
                  onChange={(e) => handleInputChange("Model", e.target.value)}
                  error={errors.Model}
                  disabled={isDisabled}
                  list={modelOptions.length > 0 ? "vehicle-model-options" : undefined}
                />
                <datalist id="vehicle-model-options">
                  {modelOptions.map((model) => (
                    <option key={model} value={model} />
                  ))}
                </datalist>
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
                  disabled={isDisabled}
                />
                <FormInput
                  label="Plate"
                  placeholder={examples.plate}
                  value={formData.Plate || ""}
                  onChange={(e) => handleInputChange("Plate", e.target.value.toUpperCase())}
                  error={errors.Plate}
                  maxLength={PLATE_NUMBER_MAX_LENGTH}
                  disabled={isDisabled}
                />
              </div>
            </FormSection>

            {/* Pricing */}
            <FormSection title="Pricing" icon={DollarSign}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormInput
                  label="Market Price *"
                  type="number"
                  placeholder={examples.price}
                  value={formData.PriceNew || ""}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  error={errors.PriceNew}
                  icon={DollarSign}
                  disabled={isDisabled}
                />
                <FormInput label="40% Price" type="number" value={formData.Price40 || ""} disabled className="bg-slate-50" />
                <FormInput label="70% Price" type="number" value={formData.Price70 || ""} disabled className="bg-slate-50" />
              </div>
              <p className="text-xs text-slate-500">
                DOC 40% and Vehicles 70% are calculated automatically from Market Price.
              </p>
            </FormSection>

            {/* Image */}
            <FormSection title="Vehicle Image" icon={ImageIconComp}>
              <ImageInput
                value={imageValues[0] || ""}
                values={imageValues}
                onChange={(value) => handleImagesChange(value ? [value] : [])}
                onChangeMany={handleImagesChange}
                className="w-full"
                maxSizeMB={10}
                multiple
                maxImages={12}
                disabled={isDisabled}
                onProcessingChange={setIsImageProcessing}
              />
            </FormSection>

            {/* Description */}
            <FormSection title="Description" icon={FileText}>
              <textarea
                value={formData.Description || ""}
                onChange={(e) => handleInputChange("Description", e.target.value)}
                placeholder="Additional details..."
                rows={3}
                className="w-full p-3 border border-slate-200 rounded-xl resize-vertical focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50"
                disabled={isDisabled}
              />
            </FormSection>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isDisabled}
              className="px-4 py-2 rounded-xl font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDisabled}
              className="px-6 py-2 rounded-xl font-medium text-white bg-emerald-500 hover:bg-emerald-600 shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isImageProcessing || isAdding || isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isImageProcessing || isProcessing ? "Processing image..." : "Adding..."}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Add Vehicle
                </>
              )}
            </button>
          </div>
        </form>
      </ModalContainer>
    </ModalBackdrop>
  );
}
