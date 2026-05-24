/**
 * Edit Lesson Form Component
 * 
 * Form for editing existing training lessons with:
 * - Pre-filled lesson data
 * - YouTube URL input (supports standard and unlisted URLs)
 * - Title and description fields
 * - Category selection
 * - Step-by-step instructions (markdown)
 * - Duration input
 * 
 * @module EditLessonForm
 */

"use client";

import { GlassButton } from "@/shared/components/ui/glass/GlassButton";
import { GlassCard } from "@/shared/components/ui/glass/GlassCard";
import { extractYoutubeVideoId } from "@/systems/lms/types/lms-schema";
import { useBodyScrollLock } from "@/shared/hooks/useBodyScrollLock";
import {
  AlertCircle,
  CheckCircle2,
  Save,
  X
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

// ============================================================================
// Types
// ============================================================================

interface Category {
  id: number;
  name: string;
}

interface Lesson {
  id: number;
  category_id: number;
  title: string;
  description: string | null;
  youtube_url: string;
  youtube_video_id: string;
  step_by_step_instructions: string | null;
  duration_minutes: number | null;
  order_index: number;
  is_active: boolean;
  allowed_roles?: string[];
}

interface EditLessonFormProps {
  lesson: Lesson;
  categories: Category[];
  onSubmit: (lessonData: LessonFormData) => Promise<void>;
  onCancel: () => void;
}

export interface LessonFormData {
  id: number;
  title: string;
  description: string;
  categoryId: number;
  youtubeUrl: string;
  youtubeVideoId: string;
  stepByStepInstructions: string;
  durationMinutes: number | null;
  orderIndex: number;
  isActive: boolean;
  allowedRoles: string[];
}

// ============================================================================
// Helper Functions
// ============================================================================

const validateYoutubeUrl = (url: string): boolean => {
  if (!url) return false;
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  return patterns.some((pattern) => pattern.test(url));
};

const LESSON_AUDIENCE_ROLES = ["Staff", "Accounting"] as const;

function normalizeLessonAudience(allowedRoles?: string[]) {
  const roles = allowedRoles?.filter((role) => LESSON_AUDIENCE_ROLES.includes(role as typeof LESSON_AUDIENCE_ROLES[number]));
  return roles && roles.length > 0 ? roles : [...LESSON_AUDIENCE_ROLES];
}

// ============================================================================
// Main Component
// ============================================================================

export function EditLessonForm({
  lesson,
  categories,
  onSubmit,
  onCancel,
}: EditLessonFormProps) {
  // Lock body scroll when modal is open
  useBodyScrollLock(true);

  // Form state
  const [formData, setFormData] = useState<LessonFormData>({
    id: lesson.id,
    title: lesson.title,
    description: lesson.description || "",
    categoryId: lesson.category_id,
    youtubeUrl: lesson.youtube_url,
    youtubeVideoId: lesson.youtube_video_id,
    stepByStepInstructions: lesson.step_by_step_instructions || "",
    durationMinutes: lesson.duration_minutes,
    orderIndex: lesson.order_index,
    isActive: lesson.is_active,
    allowedRoles: normalizeLessonAudience(lesson.allowed_roles),
  });

  const [errors, setErrors] = useState<Partial<Record<keyof LessonFormData, string>> & { submit?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [youtubePreview, setYoutubePreview] = useState<string | null>(
    lesson.youtube_video_id
  );

  // Update form when lesson prop changes
  useEffect(() => {
    setFormData({
      id: lesson.id,
      title: lesson.title,
      description: lesson.description || "",
      categoryId: lesson.category_id,
      youtubeUrl: lesson.youtube_url,
      youtubeVideoId: lesson.youtube_video_id,
      stepByStepInstructions: lesson.step_by_step_instructions || "",
      durationMinutes: lesson.duration_minutes,
      orderIndex: lesson.order_index,
      isActive: lesson.is_active,
      allowedRoles: normalizeLessonAudience(lesson.allowed_roles),
    });
    setYoutubePreview(lesson.youtube_video_id);
  }, [lesson]);

  // Handle YouTube URL change with validation and preview
  const handleYoutubeUrlChange = useCallback((url: string) => {
    setFormData((prev) => ({ ...prev, youtubeUrl: url }));

    // Clear error when user types
    if (errors.youtubeUrl) {
      setErrors((prev) => ({ ...prev, youtubeUrl: undefined }));
    }

    // Validate and extract video ID
    if (url) {
      const isValid = validateYoutubeUrl(url);
      const videoId = extractYoutubeVideoId(url);

      if (isValid && videoId) {
        setFormData((prev) => ({ ...prev, youtubeVideoId: videoId }));
        setYoutubePreview(`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`);
        setErrors((prev) => ({ ...prev, youtubeUrl: undefined }));
      } else if (url.length > 10) {
        setErrors((prev) => ({
          ...prev,
          youtubeUrl: "Please enter a valid YouTube URL",
        }));
        setYoutubePreview(null);
      }
    } else {
      setYoutubePreview(null);
      setFormData((prev) => ({ ...prev, youtubeVideoId: "" }));
    }
  }, [errors.youtubeUrl]);

  // Validate entire form
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof LessonFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formData.youtubeUrl) {
      newErrors.youtubeUrl = "YouTube URL is required";
    } else if (!validateYoutubeUrl(formData.youtubeUrl)) {
      newErrors.youtubeUrl = "Please enter a valid YouTube URL";
    }

    if (formData.categoryId === 0) {
      newErrors.categoryId = "Please select a category";
    }

    if (formData.allowedRoles.length === 0) {
      newErrors.allowedRoles = "Select at least one role";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // Scroll to first error
      const firstError = document.querySelector('.text-red-500, .border-red-500');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, submit: undefined }));

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error("[EditLessonForm] Submit error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update lesson. Please try again.";
      setErrors((prev) => ({
        ...prev,
        submit: errorMessage,
      }));
      // Show alert for mobile users
      alert("Error: " + errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/50 backdrop-blur-sm">
      <div className="min-h-screen px-4 py-4 md:py-8 pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-300 my-4">
          <GlassCard className="overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 p-4 md:p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Save className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                      Edit Lesson
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Update training lesson details
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

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Lesson Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, title: e.target.value }));
                    if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                  }}
                  placeholder="e.g., Introduction to Vehicle Valuation"
                  className={`w-full px-4 py-2.5 rounded-lg border ${
                    errors.title 
                      ? 'border-red-500 ring-1 ring-red-500' 
                      : 'border-gray-200 dark:border-gray-700'
                  } bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.title}
                  </p>
                )}
                {!errors.title && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Enter a descriptive title for the lesson
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    console.log("[EditLessonForm] Category selected:", value);
                    setFormData((prev) => ({
                      ...prev,
                      categoryId: value,
                    }));
                    if (errors.categoryId) setErrors((prev) => ({ ...prev, categoryId: undefined }));
                  }}
                  disabled={categories.length === 0}
                  className={`w-full px-4 py-2.5 rounded-lg border ${
                    errors.categoryId 
                      ? 'border-red-500 ring-1 ring-red-500' 
                      : 'border-gray-200 dark:border-gray-700'
                  } bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <option value={0}>
                    {categories.length === 0 ? "No categories available" : "Select a category..."}
                  </option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.categoryId}
                  </p>
                )}
                {!errors.categoryId && categories.length === 0 && (
                  <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                    Please create a category first before adding lessons.
                  </p>
                )}
                {!errors.categoryId && categories.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Select the training category
                  </p>
                )}
              </div>

              {/* YouTube URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  YouTube URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={formData.youtubeUrl}
                  onChange={(e) => handleYoutubeUrlChange(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
                  className={`w-full px-4 py-2.5 rounded-lg border ${
                    errors.youtubeUrl 
                      ? 'border-red-500 ring-1 ring-red-500' 
                      : 'border-gray-200 dark:border-gray-700'
                  } bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                />
                {errors.youtubeUrl && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.youtubeUrl}
                  </p>
                )}
                {!errors.youtubeUrl && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Supports standard, unlisted, and embed URLs
                  </p>
                )}

                {/* YouTube Preview */}
                {youtubePreview && (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <img
                        src={youtubePreview}
                        alt="YouTube thumbnail preview"
                        className="w-32 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-sm font-medium">Valid YouTube URL</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Video ID: {formData.youtubeVideoId}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Lesson Audience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Visible to
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {LESSON_AUDIENCE_ROLES.map((role) => (
                    <label
                      key={role}
                      className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                        formData.allowedRoles.includes(role)
                          ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                          : "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.allowedRoles.includes(role)}
                        onChange={() =>
                          setFormData((prev) => ({
                            ...prev,
                            allowedRoles: prev.allowedRoles.includes(role)
                              ? prev.allowedRoles.filter((item) => item !== role)
                              : [...prev.allowedRoles, role],
                          }))
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium">{role}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Admin can always view every lesson.
                </p>
                {errors.allowedRoles && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.allowedRoles}
                  </p>
                )}
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={formData.durationMinutes || ""}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : null;
                    setFormData((prev) => ({ ...prev, durationMinutes: value }));
                  }}
                  placeholder="e.g., 8"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                {formData.durationMinutes && formData.durationMinutes > 0 && (
                  <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                    Lesson duration: {formData.durationMinutes} minute{formData.durationMinutes !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Brief description of the lesson content..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Step-by-Step Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Step-by-Step Instructions
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Markdown formatting supported. Each line becomes a step.
                </p>
                <textarea
                  value={formData.stepByStepInstructions}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      stepByStepInstructions: e.target.value,
                    }))
                  }
                  placeholder="1. First step&#10;2. Second step&#10;3. Third step..."
                  rows={6}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono text-sm"
                />
              </div>

              {/* Order Index */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Order in Category
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Position within the category (0 = first)
                </p>
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
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <label
                  htmlFor="isActive"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  Lesson is active and visible to staff
                </label>
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
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      Save Changes
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

export default EditLessonForm;
