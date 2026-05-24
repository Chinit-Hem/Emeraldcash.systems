/**
 * Edit Staff Form Component
 * 
 * Form for editing existing staff members with:
 * - Full name and email
 * - Branch location
 * - Role selection (Appraiser, Manager, Admin, Trainee)
 * - Phone number
 * 
 * @module EditStaffForm
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Edit2,
  User,
  Mail,
  MapPin,
  Phone,
  AlertCircle,
  X,
  Briefcase,
} from "lucide-react";
import { LMS_ROLES, type LmsRole } from "@/systems/lms/types/lms-schema";

// ============================================================================
// Types
// ============================================================================

interface Staff {
  id: number;
  full_name: string;
  email: string | null;
  branch_location: string | null;
  role: string;
  phone: string | null;
  is_active: boolean;
}

interface EditStaffFormProps {
  staff: Staff;
  onSubmit: (staffData: StaffFormData) => Promise<void>;
  onCancel: () => void;
}

export interface StaffFormData {
  id: number;
  fullName: string;
  email: string;
  branchLocation: string;
  role: LmsRole;
  phone: string;
  isActive: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export function EditStaffForm({
  staff,
  onSubmit,
  onCancel,
}: EditStaffFormProps) {
  const [formData, setFormData] = useState<StaffFormData>({
    id: staff.id,
    fullName: staff.full_name || "",
    email: staff.email || "",
    branchLocation: staff.branch_location || "",
    role: (staff.role as LmsRole) || "Staff",
    phone: staff.phone || "",
    isActive: staff.is_active ?? true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof StaffFormData, string>> & { submit?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync form data when staff prop changes
  useEffect(() => {
    setFormData({
      id: staff.id,
      fullName: staff.full_name || "",
      email: staff.email || "",
      branchLocation: staff.branch_location || "",
      role: (staff.role as LmsRole) || "Staff",
      phone: staff.phone || "",
      isActive: staff.is_active ?? true,
    });
  }, [staff]);

  // Clear fullName error when user types
  useEffect(() => {
    if (formData.fullName.trim()) {
      setErrors((prev) => {
        if (prev.fullName) {
          return { ...prev, fullName: undefined };
        }
        return prev;
      });
    }
  }, [formData.fullName]);

  // Validate form
  const validateForm = (data: StaffFormData = formData): boolean => {
    const newErrors: Partial<Record<keyof StaffFormData, string>> = {};

    if (!data.fullName || !data.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear any previous submit errors
    setErrors((prev) => ({ ...prev, submit: undefined }));

    // Validate with current form data
    if (!validateForm(formData)) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error("[EditStaffForm] Submit error:", error);
      setErrors((prev) => ({
        ...prev,
        submit: "Failed to update staff member. Please try again.",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/50 backdrop-blur-sm" onClick={(e) => {
      // Close when clicking outside the modal
      if (e.target === e.currentTarget) {
        onCancel();
      }
    }}>
      <div className="min-h-screen px-4 py-4 md:py-8 pb-24 md:pb-8 flex items-center justify-center">
        <div className="max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-300 my-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-visible">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 p-4 md:p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Edit2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                      Edit Staff Member
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Update staff member information
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

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, fullName: e.target.value }));
                      if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
                    }}
                    placeholder="hem chinit"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.fullName 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  />
                </div>
                {errors.fullName && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.fullName}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Enter the staff member&apos;s full name
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, email: e.target.value }));
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    placeholder="hem.chinit@example.com"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.email 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.email}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Optional: Staff member&apos;s email address
                </p>
              </div>

              {/* Branch Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Branch Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.branchLocation}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, branchLocation: e.target.value }))
                    }
                    placeholder="Phnom Penh"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Optional: Which branch they work at
                </p>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, role: e.target.value as LmsRole }))
                    }
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                  >
                    {LMS_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Select the staff member&apos;s role
                </p>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="+855 12 345 678"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Optional: Contact phone number
                </p>
              </div>

              {/* Active Status */}
              <div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Active Staff Member
                  </span>
                </label>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 ml-8">
                  Uncheck to deactivate this staff member
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 relative z-50">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="sm:flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="sm:flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
                      Saving...
                    </>
                  ) : (
                    <>
                      <Edit2 className="w-4 h-4" />
                      Save Changes
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

export default EditStaffForm;
