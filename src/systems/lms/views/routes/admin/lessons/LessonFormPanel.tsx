"use client";

import { useId } from "react";

import { extractYoutubeVideoId } from "@/systems/lms/types/lms-schema";
import type { LmsCategory } from "@/systems/lms/types/lms-types";
import { AlertCircle, CheckCircle2, Clock, Loader2, Save, X } from "lucide-react";

import {
  LESSON_AUDIENCE_ROLES,
  type DurationLookupState,
  type LessonAudienceRole,
  type LessonFormData,
  type LessonFormErrors,
} from "./lesson-admin-utils";

interface LessonFormPanelProps {
  editingId: number | null;
  formData: LessonFormData;
  formErrors: LessonFormErrors;
  durationLookup: DurationLookupState;
  categories: LmsCategory[];
  saving: boolean;
  onCancel: () => void;
  onFieldChange: <Field extends keyof LessonFormData>(
    field: Field,
    value: LessonFormData[Field]
  ) => void;
  onSave: () => void;
  onToggleAudienceRole: (role: LessonAudienceRole) => void;
  onYoutubeUrlChange: (url: string) => void;
}

const inputClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm";
const invalidInputClass = "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500/20";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";
const sectionClass = "space-y-4 border-t border-slate-200 pt-5 first:border-t-0 first:pt-0";

function FieldError({ error }: { error?: string }) {
  if (!error) return null;

  return (
    <p className="mt-1 flex items-start gap-1.5 text-xs font-medium text-red-600">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{error}</span>
    </p>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
        {title}
      </h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function LessonFormPanel({
  editingId,
  formData,
  formErrors,
  durationLookup,
  categories,
  saving,
  onCancel,
  onFieldChange,
  onSave,
  onToggleAudienceRole,
  onYoutubeUrlChange,
}: LessonFormPanelProps) {
  const formId = useId();
  const fieldIds = {
    title: `${formId}-title`,
    description: `${formId}-description`,
    category: `${formId}-category`,
    duration: `${formId}-duration`,
    audience: `${formId}-audience`,
    youtubeUrl: `${formId}-youtube-url`,
    order: `${formId}-order`,
    isActive: `${formId}-is-active`,
  };
  const youtubeVideoId = extractYoutubeVideoId(formData.youtube_url);
  const thumbnailUrl = youtubeVideoId
    ? `https://img.youtube.com/vi/${youtubeVideoId}/mqdefault.jpg`
    : "";
  const saveLabel = saving
    ? "Saving..."
    : editingId
      ? "Update Lesson"
      : "Create Lesson";

  return (
    <div className="mb-8 rounded-2xl bg-white p-4 shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff] sm:rounded-3xl sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-lg font-bold text-slate-800">
            {editingId ? "Edit Lesson" : "New Lesson"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Build the lesson, connect the video, then publish it to the right audience.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close lesson form"
          title="Close lesson form"
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-6">
        <section className={sectionClass}>
          <SectionHeader
            title="Lesson Info"
            description="Name the lesson and place it in the correct training category."
          />

          <div>
            <label htmlFor={fieldIds.title} className={labelClass}>
              Lesson Title <span className="text-red-500">*</span>
            </label>
            <input
              id={fieldIds.title}
              type="text"
              title="Lesson title"
              value={formData.title}
              onChange={(event) => onFieldChange("title", event.target.value)}
              placeholder="e.g. Introduction to Vehicle Valuation"
              className={`${inputClass} ${formErrors.title ? invalidInputClass : ""}`}
              aria-invalid={Boolean(formErrors.title)}
            />
            <FieldError error={formErrors.title} />
          </div>

          <div>
            <label htmlFor={fieldIds.description} className={labelClass}>
              Description
            </label>
            <textarea
              id={fieldIds.description}
              title="Lesson description"
              value={formData.description}
              onChange={(event) =>
                onFieldChange("description", event.target.value)
              }
              placeholder="Brief description of this lesson..."
              rows={3}
              className={`${inputClass} min-h-[104px] resize-y`}
            />
          </div>

          <div>
            <label htmlFor={fieldIds.category} className={labelClass}>
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id={fieldIds.category}
              title="Lesson category"
              value={formData.category_id}
              onChange={(event) =>
                onFieldChange("category_id", Number(event.target.value))
              }
              className={`${inputClass} ${formErrors.category_id ? invalidInputClass : ""}`}
              aria-invalid={Boolean(formErrors.category_id)}
            >
              {categories.length === 0 && (
                <option value={0}>Create a category first</option>
              )}
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <FieldError error={formErrors.category_id} />
          </div>
        </section>

        <section className={sectionClass}>
          <SectionHeader
            title="Video"
            description="Paste a YouTube link. Duration is detected automatically before saving."
          />

          <div>
            <label htmlFor={fieldIds.youtubeUrl} className={labelClass}>
              YouTube URL <span className="text-red-500">*</span>
            </label>
            <input
              id={fieldIds.youtubeUrl}
              type="url"
              title="YouTube URL"
              value={formData.youtube_url}
              onChange={(event) => onYoutubeUrlChange(event.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className={`${inputClass} ${formErrors.youtube_url ? invalidInputClass : ""}`}
              aria-invalid={Boolean(formErrors.youtube_url)}
            />
            <FieldError error={formErrors.youtube_url} />
          </div>

          {thumbnailUrl && !formErrors.youtube_url && (
            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[160px_1fr] sm:items-center">
              <div className="aspect-video overflow-hidden rounded-lg bg-slate-200">
                <img
                  src={thumbnailUrl}
                  alt="YouTube thumbnail preview"
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.src = "/placeholder-car.svg";
                  }}
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">
                  Video preview
                </p>
                <p className="mt-1 break-all text-xs text-slate-500">
                  {youtubeVideoId}
                </p>
              </div>
            </div>
          )}

          <div>
            <p id={fieldIds.duration} className={labelClass}>
              Duration
            </p>
            <div
              role="status"
              aria-live="polite"
              aria-labelledby={fieldIds.duration}
              className={`flex min-h-11 w-full items-center gap-3 rounded-xl border px-4 py-3 text-base sm:text-sm ${
                formErrors.duration_minutes || durationLookup.status === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : durationLookup.status === "ready"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              {durationLookup.status === "loading" ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : formErrors.duration_minutes || durationLookup.status === "error" ? (
                <AlertCircle className="h-4 w-4 shrink-0" />
              ) : durationLookup.status === "ready" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <Clock className="h-4 w-4 shrink-0" />
              )}
              <span className="min-w-0 break-words font-medium">
                {formData.duration_minutes && formData.duration_minutes > 0
                  ? `${formData.duration_minutes} min`
                  : "Auto from video"}
              </span>
            </div>
            {formErrors.duration_minutes ? (
              <FieldError error={formErrors.duration_minutes} />
            ) : (
              <p className="mt-1 break-words text-xs text-slate-500">
                {durationLookup.message}
              </p>
            )}
          </div>
        </section>

        <section className={sectionClass}>
          <SectionHeader
            title="Access & Publishing"
            description="Choose who can see this lesson and where it appears in the category."
          />

          <div>
            <p id={fieldIds.audience} className="mb-2 block text-sm font-medium text-slate-700">
              Visible To <span className="text-red-500">*</span>
            </p>
            <div
              className="grid gap-3 sm:grid-cols-2"
              role="group"
              aria-labelledby={fieldIds.audience}
            >
              {LESSON_AUDIENCE_ROLES.map((role) => (
                <label
                  key={role}
                  className={`flex min-h-11 items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                    formData.allowed_roles.includes(role)
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.allowed_roles.includes(role)}
                    onChange={() => onToggleAudienceRole(role)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="min-w-0 break-words text-sm font-medium">
                    {role}
                  </span>
                </label>
              ))}
            </div>
            <FieldError error={formErrors.allowed_roles} />
            <p className="mt-2 break-words text-sm text-slate-500">
              Admin can always view every lesson. Accounting can also view normal Staff lessons.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={fieldIds.order} className={labelClass}>
                Position in Category
              </label>
              <input
                id={fieldIds.order}
                type="number"
                title="Position in category"
                value={formData.order_index}
                onChange={(event) =>
                  onFieldChange("order_index", Number(event.target.value) || 0)
                }
                min={0}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-500">
                Lower numbers appear first.
              </p>
            </div>

            <label
              htmlFor={fieldIds.isActive}
              className="flex min-h-11 items-start gap-3 sm:pt-8"
            >
              <input
                type="checkbox"
                id={fieldIds.isActive}
                checked={formData.is_active}
                onChange={(event) =>
                  onFieldChange("is_active", event.target.checked)
                }
                className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="min-w-0 break-words text-sm text-slate-700">
                Published
                <span className="mt-1 block text-xs text-slate-500">
                  Staff can see this lesson when their role matches visibility.
                </span>
              </span>
            </label>
          </div>
        </section>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 font-medium text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl active:scale-95 disabled:opacity-50 sm:w-auto"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saveLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 w-full rounded-xl bg-slate-100 px-6 py-3 font-medium text-slate-700 transition-all hover:bg-slate-200 active:scale-95 sm:w-auto"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
