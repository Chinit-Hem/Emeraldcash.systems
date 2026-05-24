/**
 * Add Staff Form Component - Advanced Neumorphism Style
 * 
 * Form for creating new staff members with:
 * - Full name and email
 * - Branch location
 * - Role selection (Admin, Staff)
 * - Phone number
 * 
 * @module AddStaffForm
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  User,
  Mail,
  MapPin,
  Phone,
  AlertCircle,
  X,
} from "lucide-react";
import { LMS_ROLES, type LmsRole } from "@/systems/lms/types/lms-schema";
import { NeuInput, NeuSelect } from "@/shared/components/ui/neu/NeuInput";

// ============================================================================
// Types
// ============================================================================

interface AddStaffFormProps {
  onSubmit: (staffData: StaffFormData) => Promise<void>;
  onCancel: () => void;
}

export interface StaffFormData {
  fullName: string;
  email: string;
  branchLocation: string;
  role: LmsRole;
  phone: string;
}

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

export function AddStaffForm({
  onSubmit,
  onCancel,
}: AddStaffFormProps) {
  const [formData, setFormData] = useState<StaffFormData>({
    fullName: "",
    email: "",
    branchLocation: "",
    role: "Staff",
    phone: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof StaffFormData, string>> & { submit?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof StaffFormData, boolean>>>({});

  // Debounced values for validation
  const debouncedFullName = useDebounce(formData.fullName, 300);
  const debouncedEmail = useDebounce(formData.email, 300);

  // Optimized input change handler
  const handleInputChange = useCallback((field: keyof StaffFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Clear error immediately for better UX
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  // Handle field blur for validation
  const handleBlur = useCallback((field: keyof StaffFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  // Validate form - memoized
  const validateForm = useCallback((data: StaffFormData = formData): boolean => {
    const newErrors: Partial<Record<keyof StaffFormData, string>> = {};

    if (!data.fullName || !data.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (data.fullName.trim().length < 2) {
      newErrors.fullName = "Full name must be at least 2 characters";
    } else if (data.fullName.trim().length > 50) {
      newErrors.fullName = "Full name must be less than 50 characters";
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Validate on debounced changes
  useEffect(() => {
    if (touched.fullName && debouncedFullName) {
      validateForm();
    }
  }, [debouncedFullName, touched.fullName, validateForm]);

  useEffect(() => {
    if (touched.email && debouncedEmail) {
      validateForm();
    }
  }, [debouncedEmail, touched.email, validateForm]);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setFormData({
      fullName: "",
      email: "",
      branchLocation: "",
      role: "Staff",
      phone: "",
    });
    setErrors({});
    setTouched({});
  }, []);

  // Handle form submission with optimistic updates
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({ fullName: true, email: true, branchLocation: true, role: true, phone: true });

    // Clear any previous submit errors
    setErrors((prev) => ({ ...prev, submit: undefined }));

    // Validate with current form data
    if (!validateForm(formData)) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Optimistic update - clear form immediately for better UX
      const submitData = { ...formData };
      resetForm();
      
      await onSubmit(submitData);
    } catch (error) {
      console.error("[AddStaffForm] Submit error:", error);
      setErrors((prev) => ({
        ...prev,
        submit: "Failed to create staff member. Please try again.",
      }));
      // Restore form data on error
      setFormData(formData);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, onSubmit, resetForm]);

  // Role options for select
  const roleOptions = LMS_ROLES.map((role) => ({
    value: role,
    label: role,
  }));

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/50 backdrop-blur-sm" onClick={(e) => {
      // Close when clicking outside the modal
      if (e.target === e.currentTarget) {
        onCancel();
      }
    }}>
      <div className="min-h-screen px-4 py-4 md:py-8 pb-24 md:pb-8 flex items-center justify-center">
        <div className="max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-300 my-4">
          {/* Neumorphism Card Container */}
          <div className="rounded-[24px] bg-white shadow-sm overflow-visible">
            {/* Header - Neumorphism */}
            <div className="sticky top-0 z-10 p-4 md:p-6 rounded-t-[24px] bg-white shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Icon Container - Neumorphism */}
                  <div className="p-3 rounded-[12px] bg-white shadow-sm">
                    <User className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-[#1a1a2e]">
                      Add New Staff
                    </h2>
                    <p className="text-sm text-[#4a4a5a]">
                      Create a staff member for training tracking
                    </p>
                  </div>
                </div>
                {/* Close Button - Neumorphism */}
                <button
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="p-2 rounded-[10px] bg-white shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-[#4a4a5a]" />
                </button>
              </div>
            </div>

            {/* Form - Neumorphism */}
            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-6">
              {/* Error Summary - Neumorphism */}
              {errors.submit && (
                <div className="p-4 rounded-[16px] bg-white shadow-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 font-medium">{errors.submit}</p>
                </div>
              )}

              {/* Full Name - NeuInput */}
              <NeuInput
                label="Full Name"
                required
                icon={<User className="w-5 h-5" />}
                value={formData.fullName}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, fullName: e.target.value }));
                  if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
                }}
                placeholder="hem chinit"
                error={errors.fullName}
                helperText="Enter the staff member's full name"
              />

              {/* Email - NeuInput */}
              <NeuInput
                label="Email"
                type="email"
                icon={<Mail className="w-5 h-5" />}
                value={formData.email}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, email: e.target.value }));
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="hem.chinit@example.com"
                error={errors.email}
                helperText="Optional: Staff member's email address"
              />

              {/* Branch Location - NeuInput */}
              <NeuInput
                label="Branch Location"
                icon={<MapPin className="w-5 h-5" />}
                value={formData.branchLocation}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, branchLocation: e.target.value }))
                }
                placeholder="Phnom Penh"
                helperText="Optional: Which branch they work at"
              />

              {/* Role - NeuSelect */}
              <NeuSelect
                label="Role"
                required
                options={roleOptions}
                value={formData.role}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, role: e.target.value as LmsRole }))
                }
                helperText="Select the staff member's role"
              />

              {/* Phone - NeuInput */}
              <NeuInput
                label="Phone Number"
                type="tel"
                icon={<Phone className="w-5 h-5" />}
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="+855 12 345 678"
                helperText="Optional: Contact phone number"
              />

              {/* Actions - Neumorphism Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200 relative z-50">
                {/* Cancel Button */}
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="sm:flex-1 px-4 py-3 rounded-[12px] bg-white text-[#4a4a5a] font-semibold shadow-sm hover:bg-slate-50 active:bg-slate-100 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                {/* Create Staff Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="sm:flex-1 px-4 py-3 rounded-[12px] bg-white text-emerald-600 font-semibold shadow-sm hover:bg-slate-50 active:bg-slate-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
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
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Staff
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddStaffForm;
