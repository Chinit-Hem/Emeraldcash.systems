/**
 * VehicleFormUnified - Master Component for All Vehicle Forms
 *
 * A single, high-performance component that handles all vehicle form layouts
 * using the useVehicleForm hook. Supports multiple layout variants while
 * maintaining consistent validation and API service integration.
 *
 * Layout Variants:
 * - "default": Standard grid layout (used in add/edit pages)
 * - "compact": Compact list layout (for side panels)
 * - "modal": Full modal overlay (for dashboard quick add/edit)
 * - "wizard": Step-by-step wizard (for guided entry)
 *
 * @module VehicleFormUnified
 */

"use client";

import { GlassButton } from "@/components/ui/glass/GlassButton";
import { GlassField } from "@/components/ui/glass/GlassField";
import { ImageInput } from "@/components/ui/ImageInput";
import { SectionCard } from "@/components/ui/SectionCard";
import { formatFileSize as formatImageSize } from "@/lib/compressImage";
import { formatCurrency } from "@/lib/format";
import {
  COLOR_OPTIONS,
  PLATE_NUMBER_HINTS,
  PLATE_NUMBER_MAX_LENGTH,
  TAX_TYPE_METADATA,
  type Vehicle,
} from "@/lib/types";
import { userStaffService, type UnifiedUser } from "@/services/UserStaffService";
import { useVehicleFormUnified as useVehicleForm, type UseVehicleFormOptions } from "@/lib/useVehicleFormUnified";
import React, { useEffect, useMemo, useState } from "react";



// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Layout variant options
 */
export type VehicleFormLayout = "default" | "compact" | "modal" | "wizard";

/**
 * Props for VehicleFormUnified
 */
export interface VehicleFormUnifiedProps {
  /** Initial vehicle data */
  vehicle: Vehicle;
  /** Submit handler */
  onSubmit: (data: Partial<Vehicle>, imageFile: File | null) => Promise<void>;
  /** Cancel/close handler */
  onCancel: () => void;
  /** Layout variant */
  layout?: VehicleFormLayout;
  /** Modal title (for modal layout) */
  modalTitle?: string;
  /** Additional className for container */
  className?: string;
  /** Custom fields to render (for composition) */
  children?: React.ReactNode;
  /** Special fields configuration */
  specialFields?: SpecialFieldConfig[];
  /** Disable specific sections */
  disabledSections?: FormSection[];
  /** Current wizard step (for wizard layout) */
  wizardStep?: number;
  /** Total wizard steps (for wizard layout) */
  totalWizardSteps?: number;
  /** Wizard step change handler */
  onWizardStepChange?: (step: number) => void;
  /** External error to display */
  externalError?: string | null;
  /** Clear external error handler */
  onClearExternalError?: () => void;
}

/**
 * Form sections that can be disabled
 */
export type FormSection = "image" | "basic" | "specs" | "pricing" | "assignment";

/**
 * Special field configuration for composition
 */
export interface SpecialFieldConfig {
  name: string;
  label: string;
  type?: "text" | "number" | "select" | "textarea";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  section: FormSection;
  render?: (props: {
    value: unknown;
    onChange: (value: unknown) => void;
    onBlur: () => void;
    error?: string;
    disabled: boolean;
  }) => React.ReactNode;
}

// ============================================================================
// Icons
// ============================================================================

const ICONS = {
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
  close: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  ),
  spinner: (
    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
};

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Image Upload Section - Using ImageInput component
 */
const ImageSection: React.FC<{
  formData: Partial<Vehicle>;
  uploadedImage: File | string | null;
  imageLoading: boolean;
  errors: Record<string, string>;
  isSubmitting: boolean;
  onImageChange: (image: File | string | null) => Promise<void>;
  onRemoveImage: () => void;
  layout: VehicleFormLayout;
}> = React.memo(({
  formData,
  uploadedImage,
  imageLoading,
  errors,
  isSubmitting,
  onImageChange,
  onRemoveImage,
  layout
}) => {
  const isCompact = layout === "compact";

  // Ensure Image is a string - handle cases where it might be an array or other type
  const imageValue = typeof formData.Image === 'string' ? formData.Image : '';

  // Convert uploadedImage to File for ImageInput compatibility
  const handleImageChange = async (value: string | null) => {
    if (!value) {
      onRemoveImage();
      return;
    }

    // If it's a URL (starts with http), pass it as string
    if (value.startsWith("http")) {
      await onImageChange(value);
      return;
    }

    // If it's a data URL, we need to convert it to a File
    // For now, we'll pass it as is and let the parent handle it
    await onImageChange(value);
  };

  return (
    <SectionCard title="Vehicle Image" icon={ICONS.image} className={isCompact ? "p-3" : undefined}>
      <ImageInput
        value={imageValue || undefined}
        onChange={handleImageChange}
        label={isCompact ? undefined : "Vehicle Image"}
        helperText={isCompact ? undefined : "Drag & drop, click to upload, paste URL, or Ctrl+V"}
        disabled={isSubmitting || imageLoading}
        maxSizeMB={5}
        className={isCompact ? "max-w-[200px]" : ""}
      />
      {uploadedImage instanceof File && (
        <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
          Ready: {formatImageSize(uploadedImage.size)}
        </p>
      )}
      {errors.Image && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.Image}</p>
      )}
    </SectionCard>
  );
});

ImageSection.displayName = "ImageSection";

/**
 * Basic Information Section
 */
const BasicInfoSection: React.FC<{
  formData: Partial<Vehicle>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  categoryOptions: string[];
  onChange: (field: keyof Vehicle, value: string | number | null) => void;
  onBlur: (field: keyof Vehicle) => void;
  layout: VehicleFormLayout;
}> = React.memo(({
  formData,
  errors,
  touched,
  isSubmitting,
  categoryOptions,
  onChange,
  onBlur,
  layout
}) => {
  const isCompact = layout === "compact";
  const gridCols = isCompact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2";

  return (
    <SectionCard title="Basic Information" icon={ICONS.basic} className={isCompact ? "p-3" : undefined}>
      <div className={`grid ${gridCols} gap-4`}>
        <GlassField
          label="Brand"
          value={formData.Brand || ""}
          onChange={(e) => onChange("Brand", e.target.value)}
          onBlur={() => onBlur("Brand")}
          error={touched.Brand ? errors.Brand : undefined}
          required
          disabled={isSubmitting}
          placeholder="e.g. Toyota"
        />
        <GlassField
          label="Model"
          value={formData.Model || ""}
          onChange={(e) => onChange("Model", e.target.value)}
          onBlur={() => onBlur("Model")}
          error={touched.Model ? errors.Model : undefined}
          required
          disabled={isSubmitting}
          placeholder="e.g. Camry"
        />
        <GlassField
          label="Category"
          as="select"
          value={formData.Category || ""}
          onChange={(e) => onChange("Category", e.target.value)}
          onBlur={() => onBlur("Category")}
          error={touched.Category ? errors.Category : undefined}
          required
          disabled={isSubmitting}
        >
          <option value="">Select category</option>
          {categoryOptions.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </GlassField>
        <GlassField
          label="Plate"
          value={formData.Plate || ""}
          onChange={(e) => onChange("Plate", e.target.value.toUpperCase())}
          maxLength={PLATE_NUMBER_MAX_LENGTH}
          placeholder={`e.g. ${PLATE_NUMBER_HINTS[0]}`}
          disabled={isSubmitting}
          className="font-mono uppercase"
        />
        <GlassField
          label="Year"
          type="number"
          value={formData.Year || ""}
          onChange={(e) => onChange("Year", e.target.value === "" ? null : parseInt(e.target.value))}
          onBlur={() => onBlur("Year")}
          error={touched.Year ? errors.Year : undefined}
          disabled={isSubmitting}
          placeholder="e.g. 2023"
        />
      </div>
    </SectionCard>
  );
});

BasicInfoSection.displayName = "BasicInfoSection";

/**
 * Specifications Section
 */
const SpecsSection: React.FC<{
  formData: Partial<Vehicle>;
  isSubmitting: boolean;
  onChange: (field: keyof Vehicle, value: string | number | null) => void;
  layout: VehicleFormLayout;
}> = React.memo(({
  formData,
  isSubmitting,
  onChange,
  layout
}) => {
  const isCompact = layout === "compact";
  const gridCols = isCompact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2";

  return (
    <SectionCard title="Specifications" icon={ICONS.specs} className={isCompact ? "p-3" : undefined}>
      <div className={`grid ${gridCols} gap-4`}>
        <GlassField
          label="Color"
          list="colorsList"
          value={formData.Color || ""}
          onChange={(e) => onChange("Color", e.target.value)}
          disabled={isSubmitting}
          placeholder="Type or select color"
        />
        <datalist id="colorsList">
          {COLOR_OPTIONS.map((color) => (
            <option key={color.value} value={color.value} />
          ))}
        </datalist>
        <GlassField
          label="Condition"
          value={formData.Condition || ""}
          onChange={(e) => onChange("Condition", e.target.value)}
          disabled={isSubmitting}
          placeholder="e.g. New, Used"
        />
        <GlassField
          label="Body Type"
          value={formData.BodyType || ""}
          onChange={(e) => onChange("BodyType", e.target.value)}
          disabled={isSubmitting}
          placeholder="e.g. Sedan, SUV"
        />
        <GlassField
          label="Tax Type"
          list="taxTypesList"
          value={formData.TaxType || ""}
          onChange={(e) => onChange("TaxType", e.target.value)}
          disabled={isSubmitting}
          placeholder="Type or select tax type"
          helperText={formData.TaxType ? TAX_TYPE_METADATA.find((tt) => tt.value === formData.TaxType)?.description : undefined}
        />
        <datalist id="taxTypesList">
          {TAX_TYPE_METADATA.map((tt) => (
            <option key={tt.value} value={tt.label} />
          ))}
        </datalist>
      </div>
    </SectionCard>
  );
});

SpecsSection.displayName = "SpecsSection";

/**
 * Pricing Section
 */
const PricingSection: React.FC<{
  formData: Partial<Vehicle>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  derivedPrices: { Price40: number | null; Price70: number | null };
  onChange: (field: keyof Vehicle, value: string | number | null) => void;
  onBlur: (field: keyof Vehicle) => void;
  layout: VehicleFormLayout;
}> = React.memo(({
  formData,
  errors,
  touched,
  isSubmitting,
  derivedPrices,
  onChange,
  onBlur,
  layout
}) => {
  const isCompact = layout === "compact";
  const gridCols = isCompact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3";

  return (
    <SectionCard title="Pricing" icon={ICONS.pricing} className={isCompact ? "p-3" : undefined}>
      <div className={`grid ${gridCols} gap-4`}>
        <GlassField
          label="Market Price"
          type="number"
          step="0.01"
          min="0"
          value={formData.PriceNew || ""}
          onChange={(e) => onChange("PriceNew", e.target.value === "" ? null : parseFloat(e.target.value))}
          onBlur={() => onBlur("PriceNew")}
          error={touched.PriceNew ? errors.PriceNew : undefined}
          disabled={isSubmitting}
          placeholder="0.00"
        />
        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            DOC 40% (Auto)
          </label>
          <div className="w-full h-11 px-4 flex items-center bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-300 font-medium">
            {formatCurrency(derivedPrices.Price40)}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            Vehicles 70% (Auto)
          </label>
          <div className="w-full h-11 px-4 flex items-center bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-300 font-medium">
            {formatCurrency(derivedPrices.Price70)}
          </div>
        </div>
      </div>
    </SectionCard>
  );
});

PricingSection.displayName = "PricingSection";

// ============================================================================
// Main Component
// ============================================================================

/**
 * VehicleFormUnified - Master component for all vehicle form layouts
 */
export function VehicleFormUnified({
  vehicle,
  onSubmit,
  onCancel,
  layout = "default",
  modalTitle = "Edit Vehicle",
  className = "",
  children,
  disabledSections = [],
  wizardStep = 1,
  totalWizardSteps = 3,
  onWizardStepChange,
  externalError,
  onClearExternalError,
}: VehicleFormUnifiedProps) {
  // Initialize form hook
  const hookOptions: UseVehicleFormOptions = useMemo(() => ({
    initialVehicle: vehicle,
    onSubmit,
    validateOnBlur: true,
    validateOnChange: false,
  }), [vehicle, onSubmit]);


  const {
    formData,
    errors,
    touched,
    uploadedImage,
    imageLoading,
    isSubmitting,
    hasChanges,
    derivedPrices,
    categoryOptions,
    handleChange,
    handleBlur,
    handleImageChange,
    handleRemoveImage,
    validateForm,
    handleSubmit,
  } = useVehicleForm(hookOptions);

  // Stock tracking users and status
  const [users, setUsers] = useState<UnifiedUser[]>([]);
  const [statusOptions] = useState([
    { value: 'PENDING', label: 'Pending Assignment' },
    { value: 'ASSIGNED', label: 'Assigned' },
    { value: 'ACCEPTED', label: 'Accepted' },
    { value: 'LOST', label: 'Lost / Missing' },
    { value: 'RETURNED', label: 'Returned' },
  ]);

  // Load users for dropdowns
  useEffect(() => {
    const loadUsers = async () => {
      const result = await userStaffService.getAllUsers();
      if (result.success) {
        setUsers(result.data || []);
      }
    };
    loadUsers();
  }, []);

  const userOptions = useMemo(() =>
    users.map(user => ({ value: String(user.staff_id || 0), label: `${user.full_name} (${user.username})` }))
  , [users]);


  // Clear external error when form changes
  React.useEffect(() => {
    if (externalError && onClearExternalError) {
      onClearExternalError();
    }
  }, [formData, uploadedImage, externalError, onClearExternalError]);

  // Determine which sections to show
  const showImage = !disabledSections.includes("image");
  const showBasic = !disabledSections.includes("basic");
  const showSpecs = !disabledSections.includes("specs");
  const showPricing = !disabledSections.includes("pricing");

  // Wizard step content
  const getWizardStepContent = () => {
    switch (wizardStep) {
      case 1:
        return (
          <>
            {showImage && (
              <ImageSection
                formData={formData}
                uploadedImage={uploadedImage}
                imageLoading={imageLoading}
                errors={errors}
                isSubmitting={isSubmitting}
                onImageChange={handleImageChange}
                onRemoveImage={handleRemoveImage}
                layout={layout}
              />
            )}
            {showBasic && (
              <BasicInfoSection
                formData={formData}
                errors={errors}
                touched={touched}
                isSubmitting={isSubmitting}
                categoryOptions={categoryOptions}
                onChange={handleChange}
                onBlur={handleBlur}
                layout={layout}
              />
            )}
          </>
        );
      case 2:
        return showSpecs ? (
          <SpecsSection
            formData={formData}
            isSubmitting={isSubmitting}
            onChange={handleChange}
            layout={layout}
          />
        ) : null;
      case 3:
        return showPricing ? (
          <PricingSection
            formData={formData}
            errors={errors}
            touched={touched}
            isSubmitting={isSubmitting}
            derivedPrices={derivedPrices}
            onChange={handleChange}
            onBlur={handleBlur}
            layout={layout}
          />
        ) : null;
      default:
        return null;
    }
  };

  // Render form content based on layout
  const renderFormContent = () => {
    if (layout === "wizard") {
      return (
        <div className="space-y-6">
          {/* Wizard Progress */}
          <div className="flex items-center gap-2 mb-6">
            {Array.from({ length: totalWizardSteps }, (_, i) => i + 1).map((step) => (
              <React.Fragment key={step}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === wizardStep
                      ? "bg-emerald-600 text-white"
                      : step < wizardStep
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {step < wizardStep ? "✓" : step}
                </div>
                {step < totalWizardSteps && (
                  <div className={`flex-1 h-1 rounded ${step < wizardStep ? "bg-emerald-100" : "bg-gray-100"}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step Content */}
          {getWizardStepContent()}

          {/* Custom children/special fields */}
          {children}

          {/* Wizard Navigation */}
          <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <GlassButton
              type="button"
              variant="secondary"
              onClick={() => onWizardStepChange?.(Math.max(1, wizardStep - 1))}
              disabled={wizardStep === 1 || isSubmitting}
            >
              Previous
            </GlassButton>
            {wizardStep < totalWizardSteps ? (
              <GlassButton
                type="button"
                variant="primary"
                onClick={() => {
                  if (validateForm()) {
                    onWizardStepChange?.(wizardStep + 1);
                  }
                }}
              >
                Next
              </GlassButton>
            ) : (
              <GlassButton
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={!hasChanges}
              >
                Save Vehicle
              </GlassButton>
            )}
          </div>
        </div>
      );
    }

    // Default, compact, and modal layouts
    return (
      <div className="space-y-6">
        {showImage && (
          <ImageSection
            formData={formData}
            uploadedImage={uploadedImage}
            imageLoading={imageLoading}
            errors={errors}
            isSubmitting={isSubmitting}
            onImageChange={handleImageChange}
            onRemoveImage={handleRemoveImage}
            layout={layout}
          />
        )}
        {showBasic && (
          <BasicInfoSection
            formData={formData}
            errors={errors}
            touched={touched}
            isSubmitting={isSubmitting}
            categoryOptions={categoryOptions}
            onChange={handleChange}
            onBlur={handleBlur}
            layout={layout}
          />
        )}
        {showSpecs && (
          <SpecsSection
            formData={formData}
            isSubmitting={isSubmitting}
            onChange={handleChange}
            layout={layout}
          />
        )}
        {showPricing && (
          <PricingSection
            formData={formData}
            errors={errors}
            touched={touched}
            isSubmitting={isSubmitting}
            derivedPrices={derivedPrices}
            onChange={handleChange}
            onBlur={handleBlur}
            layout={layout}
          />
        )}

        {/* Custom children/special fields */}
        {children}

        {/* Submit Error */}
        {(externalError || Object.keys(errors).some(k => errors[k])) && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-300 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {externalError || "Please fix the errors above"}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className={`flex ${layout === "compact" ? "flex-col" : "flex-col sm:flex-row"} gap-3 ${layout !== "modal" ? "sticky bottom-0 -mx-4 md:-mx-6 -mb-4 md:-mb-6 mt-8 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 p-4 md:p-6 rounded-b-2xl" : ""}`}>
          <GlassButton
            type="submit"
            variant="primary"
            size={layout === "compact" ? "md" : "lg"}
            fullWidth={layout !== "compact"}
            isLoading={isSubmitting}
            disabled={!hasChanges || isSubmitting}
            className={layout !== "compact" ? "order-1 sm:order-2" : ""}
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </GlassButton>
          <GlassButton
            type="button"
            variant="secondary"
            size={layout === "compact" ? "md" : "lg"}
            fullWidth={layout !== "compact"}
            onClick={onCancel}
            disabled={isSubmitting}
            className={layout !== "compact" ? "order-2 sm:order-1" : ""}
          >
            {layout === "modal" ? "Cancel" : "Back"}
          </GlassButton>
        </div>
        {hasChanges && !isSubmitting && layout !== "compact" && (
          <p className="text-center text-sm text-amber-600 dark:text-amber-400 mt-2">
            You have unsaved changes
          </p>
        )}
      </div>
    );
  };

  // Modal wrapper
  if (layout === "modal") {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm">
        <div className="min-h-screen px-4 py-4 md:py-8">
          <div className="max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-300 bg-gradient-to-br from-white/70 via-emerald-100/20 via-red-50/10 via-emerald-50/15 to-white/70 dark:from-white/8 dark:via-emerald-500/15 dark:via-red-900/8 dark:via-emerald-900/12 dark:to-white/8 rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 p-4 md:p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                    {modalTitle}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {vehicle.Brand} {vehicle.Model} • {vehicle.Plate}
                  </p>
                </div>
                <button
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  {ICONS.close}
                </button>
              </div>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className={`p-4 md:p-6 ${className}`}>
              {renderFormContent()}
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Standard form (default, compact, wizard)
  return (
    <form onSubmit={handleSubmit} className={className}>
      {renderFormContent()}
    </form>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default VehicleFormUnified;


export type { Vehicle } from "@/lib/types";

