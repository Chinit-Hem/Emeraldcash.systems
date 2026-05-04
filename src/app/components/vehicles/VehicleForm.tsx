"use client";

import { ImageInput } from "@/components/ui/ImageInput";
import { formatFileSize as formatImageSize } from "@/lib/compressImage";
import { safeBase64ToFile } from "@/lib/fileToDataUrl";
import { formatCurrency } from "@/lib/format";
import { useTranslation } from "@/lib/i18n";
import { useLanguage } from "@/lib/LanguageContext";
import { derivePrices } from "@/lib/pricing";
import type { Vehicle } from "@/lib/types";
import {
  COLOR_OPTIONS,
  PLATE_NUMBER_HINTS,
  PLATE_NUMBER_MAX_LENGTH,
  TAX_TYPE_METADATA,
} from "@/lib/types";
import React, { useCallback, useEffect, useRef, useState } from "react";

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

// Glassmorphism Card Component
function GlassCard({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`
      relative overflow-hidden
      bg-slate-900/40 backdrop-blur-2xl
      border border-white/[0.08]
      rounded-2xl
      shadow-sm
      ${className}
    `}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
      {children}
    </div>
  );
}

// Glassmorphism Input Component
function GlassInput({
  label,
  value,
  onChange,
  onBlur,
  error,
  required,
  disabled,
  placeholder,
  type = "text",
  className = "",
  list,
  maxLength,
  step,
  min,
}: {
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  type?: string;
  className?: string;
  list?: string;
  maxLength?: number;
  step?: string;
  min?: string;
}) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-300 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        list={list}
        maxLength={maxLength}
        step={step}
        min={min}
        className={`
          w-full h-11 px-4 rounded-xl
          bg-white/5 border border-white/10
          text-white placeholder-slate-400
          focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50' : ''}
          ${className}
        `}
      />
      {error && (
        <p className="mt-1.5 text-sm text-red-400 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

// Glassmorphism Button Component
function GlassButton({
  children,
  type = "button",
  variant = "primary",
  fullWidth = false,
  isLoading = false,
  disabled = false,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  type?: "button" | "submit";
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const baseStyles = "inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-medium transition-all duration-200 active:scale-[0.98]";
  const variantStyles = {
    primary: "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm hover:bg-slate-50",
    secondary: "bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 hover:border-white/20 hover:text-white",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
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

// Glassmorphism Section Card
function GlassSectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <GlassCard className="p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-emerald-400">
          {icon}
        </div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
      </div>
      {children}
    </GlassCard>
  );
}

// Glassmorphism Select Component
function GlassSelect({
  label,
  value,
  onChange,
  onBlur,
  error,
  required,
  disabled,
  options,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-300 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          className={`
            w-full h-11 px-4 rounded-xl
            bg-white/5 border border-white/10
            text-white placeholder-slate-400
            focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            appearance-none
            ${error ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50' : ''}
          `}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-800 text-white">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-400 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

export function VehicleForm({
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
  const [imageLoading, _setImageLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [compressedPreview, setCompressedPreview] = useState<{
    url: string;
    originalSize: number;
    compressedSize: number;
    compressionRatio: string;
  } | null>(null);

  // isCompressing setter is used for image handling logic
  const setCompressing = setIsCompressing;
  void setCompressing;

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(vehicle) || uploadedImage !== null;
  const prevVehicleRef = useRef(vehicle);
  const pendingUpdateRef = useRef<Partial<Vehicle> | null>(null);

  useEffect(() => {
    if (prevVehicleRef.current !== vehicle) {
      prevVehicleRef.current = vehicle;
      pendingUpdateRef.current = vehicle;
    }
  }, [vehicle]);

  useEffect(() => {
    if (pendingUpdateRef.current !== null) {
      const update = pendingUpdateRef.current;
      pendingUpdateRef.current = null;
      const timeoutId = setTimeout(() => {
        setFormData(update);
        setUploadedImage(null);
        setErrors({});
        setTouched({});
        setCompressedPreview(null);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [vehicle]);

  useEffect(() => {
    if (vehicle.Image && typeof vehicle.Image === 'string' && vehicle.Image.startsWith('http')) {
      const currentImage = formData.Image;
      if (currentImage && typeof currentImage === 'string' && (currentImage.startsWith('blob:') || currentImage.startsWith('data:'))) {
        Promise.resolve().then(() => {
          setFormData(prev => ({ ...prev, Image: vehicle.Image }));
        });
      }
    }
  }, [vehicle.Image, formData.Image]);

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
          error = "Brand is required";
        }
        break;
      case "Model":
        if (!value || String(value).trim() === "") {
          error = "Model is required";
        }
        break;
      case "Category":
        if (!value || String(value).trim() === "") {
          error = "Category is required";
        }
        break;
      case "Year":
        if (value !== null && value !== undefined && value !== "") {
          const year = Number(value);
          const currentYear = new Date().getFullYear() + 2;
          if (isNaN(year) || year < 1900 || year > currentYear) {
            error = `Year must be between 1900 and ${currentYear}`;
          }
        }
        break;
      case "PriceNew":
        if (value !== null && value !== undefined && value !== "") {
          const price = Number(value);
          if (isNaN(price) || price < 0) {
            error = "Price must be a positive number";
          }
        }
        break;
    }

    setErrors((prev) => ({ ...prev, [field]: error }));
    return error === "";
  }, []);

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

  useEffect(() => {
    return () => {
      const currentImage = formData.Image;
      if (typeof currentImage === 'string' && currentImage.startsWith("blob:")) {
        URL.revokeObjectURL(currentImage);
      }
    };
  }, [formData.Image]);

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

  const icons = {
    image: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </svg>
    ),
    basic: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
        <circle cx="7" cy="17" r="2" />
        <path d="M9 17h6" />
        <circle cx="17" cy="17" r="2" />
      </svg>
    ),
    specs: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    pricing: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2v20M2 12h20" />
      </svg>
    ),
  };

  const isKm = language === 'km';

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Image Section */}
      <GlassSectionCard title={isKm ? "រូបភាពយានយន្ត" : "Vehicle Image"} icon={icons.image}>
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
          disabled={imageLoading || isSubmitting}
          maxSizeMB={5}
        />
        {imageLoading && (
          <p className="mt-3 text-sm text-slate-400 flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {isKm ? "កំពុងដំណើរការរូបភាព..." : "Processing image..."}
          </p>
        )}
        {uploadedImage instanceof File && (
          <p className="mt-3 text-sm text-emerald-400">
            {isKm ? "រួចរាល់" : "Ready"}: {formatImageSize(uploadedImage.size)}
          </p>
        )}

        {compressedPreview && isCompressing && (
          <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                <img
                  src={compressedPreview.url}
                  alt="Compressed preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-emerald-500/20 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {isKm ? "កំពុងបង្ហាប់រូបភាព..." : "Optimizing image..."}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {formatImageSize(compressedPreview.originalSize)} → {formatImageSize(compressedPreview.compressedSize)}
                  <span className="font-medium ml-1 text-emerald-400">(-{compressedPreview.compressionRatio})</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {errors.Image && (
          <p className="mt-3 text-sm text-red-400">{errors.Image}</p>
        )}
      </GlassSectionCard>

      {/* Basic Information */}
      <GlassSectionCard title={isKm ? "ព័ត៌មានមូលដ្ឋាន" : "Basic Information"} icon={icons.basic}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassInput
            label={isKm ? "ម៉ាក" : "Brand"}
            value={formData.Brand || ""}
            onChange={(e) => handleChange("Brand", e.target.value)}
            onBlur={() => handleBlur("Brand")}
            error={touched.Brand ? errors.Brand : undefined}
            required
            disabled={isSubmitting}
            placeholder={isKm ? "ឧ. តូយ៉ូតា" : "e.g. Toyota"}
          />
          <GlassInput
            label={isKm ? "ម៉ូដែល" : "Model"}
            value={formData.Model || ""}
            onChange={(e) => handleChange("Model", e.target.value)}
            onBlur={() => handleBlur("Model")}
            error={touched.Model ? errors.Model : undefined}
            required
            disabled={isSubmitting}
            placeholder={isKm ? "ឧ. កាមរី" : "e.g. Camry"}
          />
          <GlassSelect
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
          <GlassInput
            label={isKm ? "លេខស្លាក" : "Plate Number"}
            value={formData.Plate || ""}
            onChange={(e) => handleChange("Plate", e.target.value.toUpperCase())}
            maxLength={PLATE_NUMBER_MAX_LENGTH}
            placeholder={`${isKm ? "ឧ. " : "e.g. "}${PLATE_NUMBER_HINTS[0]}`}
            disabled={isSubmitting}
            className="font-mono uppercase"
          />
          <GlassInput
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
      </GlassSectionCard>

      {/* Specifications */}
      <GlassSectionCard title={isKm ? "លក្ខណៈសម្បត្តិ" : "Specifications"} icon={icons.specs}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassInput
            label={isKm ? "ពណ៌" : "Color"}
            list="colorsList"
            value={formData.Color || ""}
            onChange={(e) => handleChange("Color", e.target.value)}
            disabled={isSubmitting}
            placeholder={isKm ? "វាយឬជ្រើសរើសពណ៌" : "Type or select color"}
          />
          <datalist id="colorsList">
            {COLOR_OPTIONS.map((color) => (
              <option key={color.value} value={color.value} />
            ))}
          </datalist>
          <GlassInput
            label={isKm ? "ស្ថានភាព" : "Condition"}
            value={formData.Condition || ""}
            onChange={(e) => handleChange("Condition", e.target.value)}
            disabled={isSubmitting}
            placeholder={isKm ? "ឧ. ថ្មី ប្រើប្រាស់ ល្អ" : "e.g. New, Used, Excellent"}
          />
          <GlassInput
            label={isKm ? "ប្រភេទខ្លឹម" : "Body Type"}
            value={formData.BodyType || ""}
            onChange={(e) => handleChange("BodyType", e.target.value)}
            disabled={isSubmitting}
            placeholder={isKm ? "ឧ. សេដាន អេសយូវី រថយន្តដឹក" : "e.g. Sedan, SUV, Truck"}
          />
          <GlassInput
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
      </GlassSectionCard>

      {/* Pricing */}
      <GlassSectionCard title={isKm ? "តម្លៃ" : "Pricing"} icon={icons.pricing}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassInput
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
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              {isKm ? "DOC 40% (ស្វ័យប្រវត្តិ)" : "DOC 40% (Auto)"}
            </label>
            <div className="w-full h-11 px-4 flex items-center bg-white/5 border border-white/10 rounded-xl text-white font-medium">
              {formatCurrency(derivedPrices.Price40)}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              {isKm ? "Vehicles 70% (ស្វ័យប្រវត្តិ)" : "Vehicles 70% (Auto)"}
            </label>
            <div className="w-full h-11 px-4 flex items-center bg-white/5 border border-white/10 rounded-xl text-white font-medium">
              {formatCurrency(derivedPrices.Price70)}
            </div>
          </div>
        </div>
      </GlassSectionCard>

      {/* Submit Error */}
      {submitError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {submitError}
          </p>
        </div>
      )}

      {/* Sticky Footer */}
      <div className="sticky bottom-0 -mx-4 md:-mx-6 -mb-4 md:-mb-6 mt-8 bg-slate-900/80 backdrop-blur-xl p-4 md:p-6 rounded-b-2xl border-t border-white/10">
        {/* Upload Progress Indicator */}
        {uploadProgress?.stage && (
          <div className="mb-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white capitalize">
                  {uploadProgress.stage}...
                </p>
                <div className="mt-2 h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress.progress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {uploadProgress.progress}%
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <GlassButton
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isSubmitting || isCompressing || !!uploadProgress?.stage}
            disabled={!hasChanges || isSubmitting || isCompressing || !!uploadProgress?.stage}
            className="order-1 sm:order-2"
          >
            {uploadProgress?.stage
              ? `${uploadProgress.stage.charAt(0).toUpperCase() + uploadProgress.stage.slice(1)}... ${uploadProgress.progress}%`
              : isCompressing
                ? (isKm ? "កំពុងដំណើរការរូបភាព..." : "Processing Image...")
                : isSubmitting
                  ? (isKm ? "កំពុងរក្សាទុក..." : "Saving Changes...")
                  : (isKm ? "រក្សាទុកការផ្លាស់ប្តូរ" : "Save Changes")}
          </GlassButton>
          <GlassButton
            type="button"
            variant="secondary"
            fullWidth
            onClick={onCancel}
            disabled={isSubmitting || !!uploadProgress?.stage}
            className="order-2 sm:order-1"
          >
            {isModal ? (isKm ? "បោះបង់" : "Cancel") : (isKm ? "ត្រឡប់ក្រោយ" : "Back")}
          </GlassButton>
        </div>
        {hasChanges && !isSubmitting && !uploadProgress?.stage && (
          <p className="text-center text-sm text-amber-400 mt-3">
            {isKm ? "អ្នកមានការផ្លាស់ប្តូរដែលមិនទាន់រក្សាទុក" : "You have unsaved changes"}
          </p>
        )}
      </div>
    </form>
  );

  // Render with modal wrapper if isModal is true
  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm">
        <div className="min-h-screen px-4 py-4 md:py-8">
          <div className="max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
            <GlassCard className="overflow-hidden">
              {/* Modal Header */}
              <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-xl p-4 md:p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-white">
                      {modalTitle}
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                      {vehicle.Brand} {vehicle.Model} • {vehicle.Plate}
                    </p>
                  </div>
                  <button
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-6 w-6"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-4 md:p-6">
                {formContent}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    );
  }

  // Regular inline form
  return formContent;
}
