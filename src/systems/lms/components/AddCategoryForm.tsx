/**
 * Add Category Form Component
 * 
 * Form for creating new training categories with:
 * - Name and description fields
 * - Icon selection (Lucide icons)
 * - Color selection
 * - Order index
 * 
 * @module AddCategoryForm
 */

"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Plus,
  BookOpen,
  AlertCircle,
  X,
  Calculator,
  Monitor,
  Users,
  Shield,
  TrendingUp,
  Settings,
  FileText,
  Award,
  HelpCircle,
} from "lucide-react";
import { GlassCard } from "@/shared/components/ui/glass/GlassCard";
import { GlassButton } from "@/shared/components/ui/glass/GlassButton";
import { GlassField } from "@/shared/components/ui/glass/GlassField";

// ============================================================================
// Types
// ============================================================================

interface AddCategoryFormProps {
  onSubmit: (categoryData: CategoryFormData) => Promise<void>;
  onCancel: () => void;
}

export interface CategoryFormData {
  name: string;
  description: string;
  icon: string;
  color: string;
  orderIndex: number;
}

// ============================================================================
// Constants
// ============================================================================

const AVAILABLE_ICONS = [
  { name: "Calculator", component: Calculator, label: "Calculator" },
  { name: "Monitor", component: Monitor, label: "Monitor" },
  { name: "Users", component: Users, label: "Users" },
  { name: "Shield", component: Shield, label: "Shield" },
  { name: "TrendingUp", component: TrendingUp, label: "Trending" },
  { name: "Settings", component: Settings, label: "Settings" },
  { name: "FileText", component: FileText, label: "Document" },
  { name: "Award", component: Award, label: "Award" },
  { name: "HelpCircle", component: HelpCircle, label: "Help" },
  { name: "BookOpen", component: BookOpen, label: "Book" },
];

const AVAILABLE_COLORS = [
  { name: "emerald", class: "bg-emerald-500", label: "Emerald" },
  { name: "blue", class: "bg-blue-500", label: "Blue" },
  { name: "purple", class: "bg-purple-500", label: "Purple" },
  { name: "orange", class: "bg-orange-500", label: "Orange" },
  { name: "red", class: "bg-red-500", label: "Red" },
  { name: "pink", class: "bg-pink-500", label: "Pink" },
  { name: "cyan", class: "bg-cyan-500", label: "Cyan" },
  { name: "indigo", class: "bg-indigo-500", label: "Indigo" },
];

// ============================================================================
// Debounce Hook
// ============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// Main Component
// ============================================================================

export function AddCategoryForm({
  onSubmit,
  onCancel,
}: AddCategoryFormProps) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    description: "",
    icon: "BookOpen",
    color: "emerald",
    orderIndex: 0,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CategoryFormData, string>> & { submit?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof CategoryFormData, boolean>>>({});

  // Debounced form data for validation
  const debouncedName = useDebounce(formData.name, 300);

  // Validate form - memoized based on debounced values
  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof CategoryFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Category name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Category name must be at least 2 characters";
    } else if (formData.name.trim().length > 50) {
      newErrors.name = "Category name must be less than 50 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData.name]);

  // Validate on debounced name change
  useEffect(() => {
    if (touched.name && debouncedName) {
      validateForm();
    }
  }, [debouncedName, touched.name, validateForm]);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      description: "",
      icon: "BookOpen",
      color: "emerald",
      orderIndex: 0,
    });
    setErrors({});
    setTouched({});
  }, []);

  // Optimized input change handler with debounced error clearing
  const handleInputChange = useCallback((field: keyof CategoryFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Clear error immediately for better UX
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  // Handle field blur for validation
  const handleBlur = useCallback((field: keyof CategoryFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateForm();
  }, [validateForm]);

  // Handle form submission with optimistic updates
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({ name: true, description: true, icon: true, color: true, orderIndex: true });

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Optimistic update - clear form immediately for better UX
      const submitData = { ...formData };
      resetForm();
      
      await onSubmit(submitData);
    } catch (error) {
      console.error("[AddCategoryForm] Submit error:", error);
      setErrors((prev) => ({
        ...prev,
        submit: "Failed to create category. Please try again.",
      }));
      // Restore form data on error
      setFormData(formData);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, onSubmit, resetForm]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm">
      <div className="min-h-screen px-4 py-4 md:py-8">
        <div className="max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
          <GlassCard className="overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 p-4 md:p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <Plus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                      Add New Category
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Create a training category for organizing lessons
                    </p>
                  </div>
                </div>
                <button
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-6">
              {/* Error Summary */}
              {errors.submit && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-400">{errors.submit}</p>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  onBlur={() => handleBlur("name")}
                  placeholder="e.g., Vehicle Valuation"
                  className={`w-full px-4 py-2.5 rounded-lg border ${
                    errors.name 
                      ? 'border-red-500 ring-1 ring-red-500' 
                      : 'border-gray-200 dark:border-gray-700'
                  } bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.name}
                  </p>
                )}
                {!errors.name && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Enter a descriptive name for the category
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <GlassField
                  label="Description"
                  helperText="Brief description of what this category covers"
                >
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="e.g., Learn vehicle valuation techniques and pricing strategies..."
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  />
                </GlassField>
              </div>

              {/* Icon Selection */}
              <div>
                <GlassField
                  label="Icon"
                  helperText="Select an icon to represent this category"
                >
                  <div className="grid grid-cols-5 gap-2 mt-2">
                    {AVAILABLE_ICONS.map((icon) => {
                      const IconComponent = icon.component;
                      return (
                        <button
                          key={icon.name}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, icon: icon.name }))}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            formData.icon === icon.name
                              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30"
                              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                          }`}
                          title={icon.label}
                        >
                          <IconComponent
                            className={`w-5 h-5 mx-auto ${
                              formData.icon === icon.name
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-gray-500 dark:text-gray-400"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </GlassField>
              </div>

              {/* Color Selection */}
              <div>
                <GlassField
                  label="Color"
                  helperText="Select a color theme for this category"
                >
                  <div className="flex flex-wrap gap-2 mt-2">
                    {AVAILABLE_COLORS.map((color) => (
                      <button
                        key={color.name}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, color: color.name }))}
                        className={`w-10 h-10 rounded-lg ${color.class} transition-all ${
                          formData.color === color.name
                            ? "ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900 scale-110"
                            : "hover:scale-105"
                        }`}
                        title={color.label}
                      />
                    ))}
                  </div>
                </GlassField>
              </div>

              {/* Order Index */}
              <div>
                <GlassField
                  label="Order"
                  helperText="Position in the category list (0 = first)"
                >
                  <input
                    type="number"
                    min="0"
                    value={formData.orderIndex}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        orderIndex: parseInt(e.target.value) || 0,
                      }));
                    }}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </GlassField>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <GlassButton
                  type="button"
                  variant="secondary"
                  className="sm:flex-1"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  type="submit"
                  variant="primary"
                  className="sm:flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Creating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Create Category
                    </span>
                  )}
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

export default AddCategoryForm;
