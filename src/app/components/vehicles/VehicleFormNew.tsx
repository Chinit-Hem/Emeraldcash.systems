"use client";

import { ImageInput } from "@/components/ui/ImageInput";
import { formatFileSize as formatImageSize } from "@/lib/compressImage";
import { safeBase64ToFile } from "@/lib/fileToDataUrl";
import { formatCurrency } from "@/lib/format";
import { useTranslation } from "@/lib/i18n";
import { useLanguage } from "@/lib/LanguageContext";
import { derivePrices } from "@/lib/pricing";
import type { Vehicle } from "@/lib/types";
import { translateVehicleColor } from "@/lib/vehicleColors";
import {
  COLOR_OPTIONS,
  PLATE_NUMBER_HINTS,
  PLATE_NUMBER_MAX_LENGTH,
  TAX_TYPE_METADATA,
} from "@/lib/types";
import { cn } from "@/lib/ui";
import {
  AlertCircle,
  ArrowLeft,
  Car,
  CheckCircle2,
  ChevronRight,
  DollarSign,
  Image as ImageIcon,
  Loader2,
  Save,
  Wrench,
  X
} from "lucide-react";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";

const CATEGORY_OPTIONS = ["Cars", "Motorcycles", "Tuk Tuk"] as const;

interface VehicleFormProps {
  vehicle: Vehicle;
  onSubmit: (data: Partial<Vehicle>, imageFile: File | null) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  submitError: string | null;
  onClearError: () => void;
  isModal?: boolean;
  modalTitle?: string;
  uploadProgress?: {
    stage: 'compressing' | 'uploading' | 'processing' | 'saving' | null;
    progress: number;
  };
}

interface FormErrors {
  [key: string]: string;
}

// Modern Card Component - Clean Design
function ModernCard({
  children,
  className = "",
  hover = true
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={cn(
      "bg-white rounded-2xl",
      "shadow-sm",
      "border border-slate-100",
      hover && "hover:bg-slate-50 transition-all duration-300 hover:-translate-y-0.5",
      className
    )}>
      {children}
    </div>
  );
}

// Modern Input Component with Shadow
interface ModernInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
  icon?: React.ReactNode;
}

const ModernInput = memo(function ModernInput({
  label,
  error,
  required,
  icon,
  className = "",
  ...props
}: ModernInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-600 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className={cn(
        "relative flex items-center",
        "bg-white rounded-xl",
        "shadow-sm",
        isFocused
          ? "shadow-sm ring-2 ring-emerald-100"
          : "hover:bg-slate-50",
        "transition-all duration-200",
        className
      )}>
        {icon && (
          <div className="pl-4 text-slate-400">
            {icon}
          </div>
        )}
        <input
          {...props}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          className={cn(
            "w-full h-12 px-4 bg-transparent border-none outline-none",
            "text-slate-800 placeholder-slate-400",
            "rounded-xl",
            icon && "pl-2"
          )}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </div>
  );
});

// Modern Select Component with Shadow
interface ModernSelectProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  options: { value: string; label: string }[];
}

const ModernSelect = memo(function ModernSelect({
  label,
  value,
  onChange,
  onBlur,
  error,
  required,
  disabled,
  options,
}: ModernSelectProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-600 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className={cn(
        "relative",
        "bg-white rounded-xl",
        "shadow-sm",
        isFocused
          ? "shadow-sm ring-2 ring-emerald-100"
          : "hover:bg-slate-50",
        "transition-all duration-200"
      )}>
        <select
          value={value}
          onChange={onChange}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          onFocus={() => setIsFocused(true)}
          disabled={disabled}
          className={cn(
            "w-full h-12 px-4 bg-transparent border-none outline-none appearance-none",
            "text-slate-800",
            "rounded-xl cursor-pointer",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-white text-slate-800">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <ChevronRight className="w-4 h-4 rotate-90" />
        </div>
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </div>
  );
});

// Modern Button Component
interface ModernButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  isLoading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const ModernButton = memo(function ModernButton({
  variant = "secondary",
  isLoading,
  fullWidth,
  children,
  className = "",
  disabled,
  ...props
}: ModernButtonProps) {
  const baseStyles = cn(
    "relative inline-flex items-center justify-center gap-2",
    "h-12 px-6 rounded-xl font-medium",
    "transition-all duration-200",
    "active:scale-[0.98]",
    fullWidth && "w-full",
    disabled && "opacity-50 cursor-not-allowed",
    className
  );

  const variantStyles = {
    primary: cn(
      "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white",
      "shadow-sm",
      "hover:from-emerald-600 hover:to-emerald-700",
      "hover:bg-slate-50"
    ),
    secondary: cn(
      "bg-white text-slate-700 border border-slate-200",
      "shadow-sm",
      "hover:bg-slate-50 hover:border-slate-300",
      "hover:bg-slate-50"
    ),
    danger: cn(
      "bg-gradient-to-r from-red-500 to-red-600 text-white",
      "shadow-sm",
      "hover:from-red-600 hover:to-red-700",
      "hover:bg-slate-50"
    ),
  };

  return (
    <button
      className={cn(baseStyles, variantStyles[variant])}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
});

// Section Card Component - Modern Clean Style
function SectionCard({
  title,
  icon: Icon,
  children,
  delay = 0,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      className="animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <ModernCard className="overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          </div>
          {children}
        </div>
      </ModernCard>
    </div>
  );
}

// Helper functions
function sanitizeNumericInput(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    if (Number.isNaN(value)) {
      return null;
    }
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === "undefined" || trimmed === "NaN") {
      return null;
    }
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) {
      return null;
    }
    return parsed;
  }

  return null;
}

function sanitizeVehicleDataForSubmit(data: Partial<Vehicle>): Partial<Vehicle> {
  const sanitized = { ...data };
  sanitized.Year = sanitizeNumericInput(data.Year);
  sanitized.PriceNew = sanitizeNumericInput(data.PriceNew);
  sanitized.Price40 = sanitizeNumericInput(data.Price40);
  sanitized.Price70 = sanitizeNumericInput(data.Price70);

  Object.keys(sanitized).forEach((key) => {
    const k = key as keyof Vehicle;
    if (sanitized[k] === undefined) {
      delete sanitized[k];
    }
  });

  return sanitized;
}

// Main Form Component
export const VehicleForm = memo(function VehicleForm({
  vehicle,
  onSubmit,
  onCancel,
  isSubmitting,
  submitError,
  onClearError,
  isModal = false,
  modalTitle = "Edit Vehicle",
  uploadProgress,
}: VehicleFormProps) {
  const { language } = useLanguage();
  const { t } = useTranslation(language);

  const [formData, setFormData] = useState<Partial<Vehicle>>(vehicle);
  const [uploadedImage, setUploadedImage] = useState<File | string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(vehicle) || uploadedImage !== null;
  const prevVehicleRef = useRef(vehicle);

  useEffect(() => {
    if (prevVehicleRef.current !== vehicle) {
      prevVehicleRef.current = vehicle;
      setFormData(vehicle);
      setUploadedImage(null);
      setErrors({});
      setTouched({});
    }
  }, [vehicle]);

  useEffect(() => {
    if (submitError) {
      onClearError();
    }
  }, [formData, uploadedImage, onClearError, submitError]);

  const handleChange = useCallback((field: keyof Vehicle, value: string | number | null) => {
    let sanitizedValue: string | number | null = value;
    if (field === "Year" || field === "PriceNew") {
      sanitizedValue = sanitizeNumericInput(value);
    }

    setFormData((prev) => {
      const next = { ...prev, [field]: sanitizedValue };

      if (field === "PriceNew") {
        const priceNew = sanitizedValue as number | null;
        const derived = derivePrices(priceNew);
        next.Price40 = derived.Price40;
        next.Price70 = derived.Price70;
      }

      return next;
    });

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  }, [errors]);

  const validateField = useCallback((field: keyof Vehicle, value: unknown): boolean => {
    let error = "";

    switch (field) {
      case "Brand":
        if (!value || String(value).trim() === "") {
          error = language === 'km' ? "ត្រូវការម៉ាក" : "Brand is required";
        }
        break;
      case "Model":
        if (!value || String(value).trim() === "") {
          error = language === 'km' ? "ត្រូវការម៉ូដែល" : "Model is required";
        }
        break;
      case "Category":
        if (!value || String(value).trim() === "") {
          error = language === 'km' ? "ត្រូវការប្រភេទ" : "Category is required";
        }
        break;
      case "Year":
        if (value !== null && value !== undefined && value !== "") {
          const year = Number(value);
          const currentYear = new Date().getFullYear() + 2;
          if (isNaN(year) || year < 1900 || year > currentYear) {
            error = language === 'km'
              ? `ឆ្នាំត្រូវតែចន្លោះពី ១៩០០ ដល់ ${currentYear}`
              : `Year must be between 1900 and ${currentYear}`;
          }
        }
        break;
      case "PriceNew":
        if (value !== null && value !== undefined && value !== "") {
          const price = Number(value);
          if (isNaN(price) || price < 0) {
            error = language === 'km' ? "តម្លៃត្រូវតែជាចំនួនវិជ្ជមាន" : "Price must be a positive number";
          }
        }
        break;
    }

    setErrors((prev) => ({ ...prev, [field]: error }));
    return error === "";
  }, [language]);

  const handleBlur = useCallback((field: keyof Vehicle) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  }, [formData, validateField]);

  const validateForm = useCallback((): boolean => {
    const requiredFields: (keyof Vehicle)[] = ["Brand", "Model", "Category"];
    let isValid = true;

    requiredFields.forEach((field) => {
      if (!validateField(field, formData[field])) {
        isValid = false;
      }
    });

    if (formData.Year !== null && formData.Year !== undefined) {
      if (!validateField("Year", formData.Year)) {
        isValid = false;
      }
    }

    if (formData.PriceNew !== null && formData.PriceNew !== undefined) {
      if (!validateField("PriceNew", formData.PriceNew)) {
        isValid = false;
      }
    }

    return isValid;
  }, [formData, validateField]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const allTouched: Record<string, boolean> = {};
    Object.keys(formData).forEach((key) => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    if (!validateForm()) {
      return;
    }

    let imageFile: File | null = null;
    let imageUrl: string | null = null;

    if (uploadedImage instanceof File) {
      imageFile = uploadedImage;
    } else if (typeof uploadedImage === "string" && uploadedImage.startsWith("data:image/")) {
      const { file: fileFromDataUrl, error: conversionError } = safeBase64ToFile(
        uploadedImage,
        `vehicle_image_${Date.now()}.jpg`
      );

      if (conversionError) {
        setErrors((prev) => ({ ...prev, Image: conversionError }));
        return;
      }

      if (fileFromDataUrl) {
        imageFile = fileFromDataUrl;
      } else {
        imageUrl = uploadedImage;
      }
    } else if (typeof uploadedImage === "string" && uploadedImage.trim() && (uploadedImage.startsWith("http://") || uploadedImage.startsWith("https://"))) {
      imageUrl = uploadedImage.trim();
    }

    let submitData: Partial<Vehicle>;
    if (imageFile) {
      const { Image: _Image, ...formDataWithoutImage } = formData;
      submitData = formDataWithoutImage;
    } else if (imageUrl) {
      submitData = { ...formData, Image: imageUrl };
    } else {
      submitData = formData;
    }

    const sanitizedSubmitData = sanitizeVehicleDataForSubmit(submitData);
    await onSubmit(sanitizedSubmitData, imageFile);
  }, [formData, uploadedImage, onSubmit, validateForm]);

  const handleRemoveImage = useCallback(() => {
    setFormData((prev) => ({ ...prev, Image: "" }));
    setUploadedImage(null);
  }, []);

  const derivedPrices = derivePrices(formData.PriceNew ?? null);

  const categoryValue = formData.Category || "";
  const categoryOptions =
    categoryValue && !CATEGORY_OPTIONS.includes(categoryValue as (typeof CATEGORY_OPTIONS)[number])
      ? [categoryValue, ...CATEGORY_OPTIONS]
      : [...CATEGORY_OPTIONS];

  const isKm = language === 'km';

  // Form sections
  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Image Section */}
      <SectionCard
        title={isKm ? "រូបភាពយានយន្ត" : "Vehicle Image"}
        icon={ImageIcon}
        delay={100}
      >
        <div className="space-y-4">
          <ImageInput
            value={typeof formData.Image === 'string' ? formData.Image.trim() || undefined : undefined}
            onChange={async (value) => {
              if (!value) {
                handleRemoveImage();
                return;
              }
              if (value.startsWith("http") || value.startsWith("data:")) {
                setFormData((prev) => ({ ...prev, Image: value }));
                setUploadedImage(value);
                setErrors((prev) => ({ ...prev, Image: "" }));
              }
            }}
            label={isKm ? "រូបភាពយានយន្ត" : "Vehicle Image"}
            helperText={isKm ? "ទាញយក ចុចដើម្បីផ្ទុកឡើង ឬបិទភ្ជាប់ URL" : "Drag & drop, click to upload, paste URL, or Ctrl+V to paste image"}
            disabled={isSubmitting}
            maxSizeMB={5}
          />

          {uploadProgress?.stage === 'compressing' && (
            <div className="flex items-center gap-2 text-[#718096]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">
                {isKm ? "កំពុងដំណើរការរូបភាព..." : "Processing image..."}
              </span>
            </div>
          )}

          {uploadedImage instanceof File && (
            <div className="flex items-center gap-2 text-[#2ecc71]">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm">
                {isKm ? "រួចរាល់" : "Ready"}: {formatImageSize(uploadedImage.size)}
              </span>
            </div>
          )}

          {errors.Image && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.Image}
            </p>
          )}
        </div>
      </SectionCard>

      {/* Basic Information */}
      <SectionCard
        title={isKm ? "ព័ត៌មានមូលដ្ឋាន" : "Basic Information"}
        icon={Car}
        delay={200}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ModernInput
            label={isKm ? "ម៉ាក" : "Brand"}
            value={formData.Brand || ""}
            onChange={(e) => handleChange("Brand", e.target.value)}
            onBlur={() => handleBlur("Brand")}
            error={touched.Brand ? errors.Brand : undefined}
            required
            disabled={isSubmitting}
            placeholder={isKm ? "ឧ. តូយ៉ូតា" : "e.g. Toyota"}
          />
          <ModernInput
            label={isKm ? "ម៉ូដែល" : "Model"}
            value={formData.Model || ""}
            onChange={(e) => handleChange("Model", e.target.value)}
            onBlur={() => handleBlur("Model")}
            error={touched.Model ? errors.Model : undefined}
            required
            disabled={isSubmitting}
            placeholder={isKm ? "ឧ. កាមរី" : "e.g. Camry"}
          />
          <ModernSelect
            label={isKm ? "ប្រភេទ" : "Category"}
            value={formData.Category || ""}
            onChange={(e) => handleChange("Category", e.target.value)}
            onBlur={() => handleBlur("Category")}
            error={touched.Category ? errors.Category : undefined}
            required
            disabled={isSubmitting}
            options={[
              { value: "", label: isKm ? "ជ្រើសរើសប្រភេទ" : "Select category" },
              ...categoryOptions.map((cat) => ({
                value: cat,
label: isKm ? (cat === "Cars" ? "រថយន្ត" : cat === "Motorcycles" ? "ម៉ូតូ" : "កង់បី") : cat
              }))
            ]}
          />
          <ModernInput
            label={isKm ? "លេខស្លាក" : "Plate Number"}
            value={formData.Plate || ""}
            onChange={(e) => handleChange("Plate", e.target.value.toUpperCase())}
            maxLength={PLATE_NUMBER_MAX_LENGTH}
            placeholder={`${isKm ? "ឧ. " : "e.g. "}${PLATE_NUMBER_HINTS[0]}`}
            disabled={isSubmitting}
            className="font-mono uppercase"
          />
          <ModernInput
            label={isKm ? "ឆ្នាំ" : "Year"}
            type="number"
            value={formData.Year || ""}
            onChange={(e) => handleChange("Year", e.target.value === "" ? null : parseInt(e.target.value))}
            onBlur={() => handleBlur("Year")}
            error={touched.Year ? errors.Year : undefined}
            disabled={isSubmitting}
            placeholder={isKm ? "ឧ. ២០២៣" : "e.g. 2023"}
          />
        </div>
      </SectionCard>

      {/* Specifications */}
      <SectionCard
        title={isKm ? "លក្ខណៈសម្បត្តិ" : "Specifications"}
        icon={Wrench}
        delay={300}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="relative">
            <ModernInput
              label={isKm ? "ពណ៌" : "Color"}
              list="colorsList"
              value={formData.Color || ""}
              onChange={(e) => handleChange("Color", e.target.value)}
              disabled={isSubmitting}
              placeholder={isKm ? "វាយឬជ្រើសរើសពណ៌" : "Type or select color"}
            />
            <datalist id="colorsList">
              {COLOR_OPTIONS.map((color) => (
                <option key={color.value} value={color.value} label={translateVehicleColor(color.value, language)} />
              ))}
            </datalist>
          </div>
          <ModernInput
            label={isKm ? "ស្ថានភាព" : "Condition"}
            value={formData.Condition || ""}
            onChange={(e) => handleChange("Condition", e.target.value)}
            disabled={isSubmitting}
            placeholder={isKm ? "ឧ. ថ្មី ប្រើប្រាស់ ល្អ" : "e.g. New, Used, Excellent"}
          />
          <ModernInput
            label={isKm ? "ប្រភេទខ្លឹម" : "Body Type"}
            value={formData.BodyType || ""}
            onChange={(e) => handleChange("BodyType", e.target.value)}
            disabled={isSubmitting}
            placeholder={isKm ? "ឧ. សេដាន អេសយូវី រថយន្តដឹក" : "e.g. Sedan, SUV, Truck"}
          />
          <div className="relative">
            <ModernInput
              label={isKm ? "ប្រភេទពន្ធ" : "Tax Type"}
              list="taxTypesList"
              value={formData.TaxType || ""}
              onChange={(e) => handleChange("TaxType", e.target.value)}
              disabled={isSubmitting}
              placeholder={isKm ? "វាយឬជ្រើសរើសប្រភេទពន្ធ" : "Type or select tax type"}
            />
            <datalist id="taxTypesList">
              {TAX_TYPE_METADATA.map((tt) => (
                <option key={tt.value} value={tt.label} />
              ))}
            </datalist>
          </div>
        </div>
      </SectionCard>

      {/* Pricing */}
      <SectionCard
        title={isKm ? "តម្លៃ" : "Pricing"}
        icon={DollarSign}
        delay={400}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <ModernInput
            label={isKm ? "តម្លៃទីផ្សារ" : "Market Price"}
            type="number"
            step="0.01"
            min="0"
            value={formData.PriceNew || ""}
            onChange={(e) => handleChange("PriceNew", e.target.value === "" ? null : parseFloat(e.target.value))}
            onBlur={() => handleBlur("PriceNew")}
            error={touched.PriceNew ? errors.PriceNew : undefined}
            disabled={isSubmitting}
            placeholder="0.00"
          />
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              {isKm ? "DOC 40% (ស្វ័យប្រវត្តិ)" : "DOC 40% (Auto)"}
            </label>
            <div className="h-12 px-4 flex items-center bg-slate-50 rounded-xl border border-slate-200 text-slate-800 font-medium">
              {formatCurrency(derivedPrices.Price40)}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              {isKm ? "Vehicles 70% (ស្វ័យប្រវត្តិ)" : "Vehicles 70% (Auto)"}
            </label>
            <div className="h-12 px-4 flex items-center bg-slate-50 rounded-xl border border-slate-200 text-slate-800 font-medium">
              {formatCurrency(derivedPrices.Price70)}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Submit Error */}
      {submitError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 animate-shake">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{submitError}</p>
        </div>
      )}

      {/* Progress Indicator */}
      {uploadProgress?.stage && (
        <ModernCard className="p-4" hover={false}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800 capitalize">
                {uploadProgress.stage}...
              </p>
              <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${uploadProgress.progress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {uploadProgress.progress}%
              </p>
            </div>
          </div>
        </ModernCard>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <ModernButton
          type="submit"
          variant="primary"
          fullWidth
          isLoading={isSubmitting || !!uploadProgress?.stage}
          disabled={!hasChanges || isSubmitting || !!uploadProgress?.stage}
          className="order-1 sm:order-2"
        >
          <Save className="w-4 h-4" />
          {uploadProgress?.stage
            ? `${uploadProgress.stage.charAt(0).toUpperCase() + uploadProgress.stage.slice(1)}... ${uploadProgress.progress}%`
            : isSubmitting
              ? (isKm ? "កំពុងរក្សាទុក..." : "Saving...")
              : (isKm ? "រក្សាទុក" : "Save Vehicle")}
        </ModernButton>
        <ModernButton
          type="button"
          variant="secondary"
          fullWidth
          onClick={onCancel}
          disabled={isSubmitting || !!uploadProgress?.stage}
          className="order-2 sm:order-1"
        >
          <ArrowLeft className="w-4 h-4" />
          {isModal ? (isKm ? "បោះបង់" : "Cancel") : (isKm ? "ត្រឡប់ក្រោយ" : "Back")}
        </ModernButton>
      </div>

      {/* Unsaved Changes Warning */}
      {hasChanges && !isSubmitting && !uploadProgress?.stage && (
        <p className="text-center text-sm text-amber-600 animate-pulse">
          {isKm ? "អ្នកមានការផ្លាស់ប្តូរដែលមិនទាន់រក្សាទុក" : "You have unsaved changes"}
        </p>
      )}
    </form>
  );

  // Modal wrapper
  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm">
        <div className="min-h-screen px-4 py-4 md:py-8">
          <div className="max-w-4xl mx-auto w-full animate-fade-in-up">
            <ModernCard className="overflow-hidden" hover={false}>
              {/* Modal Header */}
              <div className="sticky top-0 z-10 p-4 md:p-6 border-b border-slate-100 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-800">
                      {modalTitle}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      {vehicle.Brand} {vehicle.Model} • {vehicle.Plate}
                    </p>
                  </div>
                  <button
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-4 md:p-6">
                {formContent}
              </div>
            </ModernCard>
          </div>
        </div>
      </div>
    );
  }

  // Regular inline form
  return formContent;
});
