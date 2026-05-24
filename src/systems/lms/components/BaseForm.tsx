/**
 * Base Form Component for LMS
 * 
 * Abstract base class following OOAD principles:
 * - Encapsulation: Form state and validation logic
 * - Inheritance: Common form behavior for all LMS forms
 * - Polymorphism: Customizable render methods
 * 
 * @module lms/BaseForm
 */

"use client";

import React, { useState, useCallback } from "react";
import { NeuCard, NeuCardHeader, NeuButton } from "@/shared/components/ui";
import { X, Save } from "lucide-react";

// ============================================================================
// Types & Interfaces (OOAD: Abstraction)
// ============================================================================

export interface FormField<T> {
  name: keyof T;
  label: string;
  type?: "text" | "email" | "number" | "select" | "textarea" | "url";
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: (value: unknown) => string | null;
}

export interface BaseFormProps<T> {
  title: string;
  subtitle?: string;
  initialData: Partial<T>;
  fields: FormField<T>[];
  onSubmit: (data: T) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  icon?: React.ReactNode;
}

export interface FormState<T> {
  data: Partial<T>;
  errors: Partial<Record<keyof T, string>>;
  isSubmitting: boolean;
  isDirty: boolean;
}

// ============================================================================
// Validation Utilities
// ============================================================================

export const validators = {
  required: (fieldName: string) => (value: unknown): string | null => {
    if (value === null || value === undefined || value === "") {
      return `${fieldName} is required`;
    }
    return null;
  },
  
  email: (value: unknown): string | null => {
    if (!value) return null;
    const email = String(value);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }
    return null;
  },
  
  url: (value: unknown): string | null => {
    if (!value) return null;
    const url = String(value);
    try {
      new URL(url);
      return null;
    } catch {
      return "Please enter a valid URL";
    }
  },
  
  minLength: (min: number) => (value: unknown): string | null => {
    if (!value) return null;
    if (String(value).length < min) {
      return `Must be at least ${min} characters`;
    }
    return null;
  },
  
  number: (value: unknown): string | null => {
    if (value === null || value === undefined || value === "") return null;
    if (isNaN(Number(value))) {
      return "Must be a valid number";
    }
    return null;
  },
};

// ============================================================================
// Base Form Hook (OOAD: Encapsulation)
// ============================================================================

export function useBaseForm<T extends Record<string, unknown>>(
  initialData: Partial<T>,
  fields: FormField<T>[]
) {
  const [state, setState] = useState<FormState<T>>({
    data: { ...initialData },
    errors: {},
    isSubmitting: false,
    isDirty: false,
  });

  const updateField = useCallback((name: keyof T, value: unknown) => {
    setState((prev) => ({
      ...prev,
      data: { ...prev.data, [name]: value },
      isDirty: true,
      errors: { ...prev.errors, [name]: undefined },
    }));
  }, []);

  const validateField = useCallback((name: keyof T, value: unknown): string | null => {
    const field = fields.find((f) => f.name === name);
    if (!field) return null;

    // Check required
    if (field.required && (value === null || value === undefined || value === "")) {
      return `${field.label} is required`;
    }

    // Run custom validation
    if (field.validation) {
      return field.validation(value);
    }

    return null;
  }, [fields]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    fields.forEach((field) => {
      const value = state.data[field.name];
      const error = validateField(field.name, value);
      if (error) {
        newErrors[field.name] = error;
        isValid = false;
      }
    });

    setState((prev) => ({ ...prev, errors: newErrors }));
    return isValid;
  }, [fields, state.data, validateField]);

  const setError = useCallback((name: keyof T, error: string | null) => {
    setState((prev) => ({
      ...prev,
      errors: { ...prev.errors, [name]: error },
    }));
  }, []);

  const resetForm = useCallback(() => {
    setState({
      data: { ...initialData },
      errors: {},
      isSubmitting: false,
      isDirty: false,
    });
  }, [initialData]);

  const setSubmitting = useCallback((isSubmitting: boolean) => {
    setState((prev) => ({ ...prev, isSubmitting }));
  }, []);

  return {
    state,
    updateField,
    validateField,
    validateForm,
    setError,
    resetForm,
    setSubmitting,
  };
}

// ============================================================================
// Base Form Component (OOAD: Inheritance Base)
// ============================================================================

export function BaseForm<T extends Record<string, unknown>>({
  title,
  subtitle,
  initialData,
  fields,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  icon,
}: BaseFormProps<T>) {
  const { state, updateField, validateField, validateForm, setSubmitting, resetForm } =
    useBaseForm<T>(initialData, fields);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await onSubmit(state.data as T);
      resetForm();
    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (name: keyof T, value: unknown) => {
    updateField(name, value);
    const error = validateField(name, value);
    if (error) {
      // Error is handled by the hook
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm">
      <div className="min-h-screen px-4 py-4 md:py-8 flex items-center justify-center">
        <NeuCard className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <form onSubmit={handleSubmit}>
            <NeuCardHeader
              title={title}
              subtitle={subtitle}
              icon={icon}
              action={
                <button
                  type="button"
                  onClick={onCancel}
                  className="p-2 rounded-xl bg-white shadow-sm hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              }
            />

            <div className="space-y-6">
              {fields.map((field) => (
                <FormFieldRenderer
                  key={String(field.name)}
                  field={field}
                  value={state.data[field.name]}
                  error={state.errors[field.name]}
                  onChange={(value) => handleChange(field.name, value)}
                />
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-200/50">
              <NeuButton
                type="button"
                variant="secondary"
                onClick={onCancel}
                disabled={state.isSubmitting}
              >
                Cancel
              </NeuButton>
              <NeuButton
                type="submit"
                variant="primary"
                isLoading={state.isSubmitting}
                disabled={!state.isDirty}
              >
                <Save className="w-4 h-4 mr-2" />
                {submitLabel}
              </NeuButton>
            </div>
          </form>
        </NeuCard>
      </div>
    </div>
  );
}

// ============================================================================
// Form Field Renderer (OOAD: Polymorphism)
// ============================================================================

function FormFieldRenderer<T>({
  field,
  value,
  error,
  onChange,
}: {
  field: FormField<T>;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
}) {
  const baseInputClass = cn(
    "w-full h-11 px-4 bg-white rounded-xl border border-slate-200",
    "shadow-sm",
    "text-slate-800 placeholder-slate-400",
    "focus:outline-none focus:ring-2 focus:ring-emerald-500/20",
    "transition-all duration-200",
    error && "ring-2 ring-red-500/20"
  );

  const label = (
    <label className="block text-sm font-semibold text-slate-700 mb-2">
      {field.label}
      {field.required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );

  switch (field.type) {
    case "select":
      return (
        <div>
          {label}
          <div className="relative">
            <select
              value={String(value || "")}
              onChange={(e) => onChange(e.target.value)}
              className={cn(baseInputClass, "appearance-none cursor-pointer")}
              required={field.required}
            >
              <option value="">Select {field.label}</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
      );

    case "textarea":
      return (
        <div>
          {label}
          <textarea
            value={String(value || "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={cn(baseInputClass, "h-32 py-3 resize-none")}
            required={field.required}
          />
          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
      );

    case "number":
      return (
        <div>
          {label}
          <input
            type="number"
            value={String(value || "")}
            onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
            placeholder={field.placeholder}
            className={baseInputClass}
            required={field.required}
          />
          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
      );

    default:
      return (
        <div>
          {label}
          <input
            type={field.type || "text"}
            value={String(value || "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
            required={field.required}
          />
          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
      );
  }
}

// ============================================================================
// Utility
// ============================================================================

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
