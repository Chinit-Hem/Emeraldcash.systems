"use client";

import { useAuthUser } from "@/shared/hooks/AuthContext";
import { hasAppPermission } from "@/shared/utils/permissions";
import { useLanguage } from "@/shared/hooks/LanguageContext";
import { translatePhrase } from "@/shared/utils/i18n";
import type { LessonWithStatus } from "@/systems/lms/types/lms-types";
import { ArrowLeft, Loader2, PlayCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { LessonCategoryFilter } from "./LessonCategoryFilter";
import { LessonCategoryList } from "./LessonCategoryList";
import { LessonFormPanel } from "./LessonFormPanel";
import {
  createEmptyLessonForm,
  createLessonFormFromLesson,
  getNextLessonOrderIndex,
  groupLessonsByCategory,
  validateLessonFormFields,
  type LessonAudienceRole,
  type LessonFormErrors,
  type LessonFormData,
} from "./lesson-admin-utils";
import { useAdminLessons } from "./useAdminLessons";
import { useYoutubeDurationLookup } from "./useYoutubeDurationLookup";
import { LmsContentManagerTabs } from "../LmsContentManagerTabs";

export default function LessonsAdminPage() {
  const router = useRouter();
  const user = useAuthUser();
  const { language } = useLanguage();
  const tr = useCallback((text: string) => translatePhrase(text, language), [language]);
  const canManageLms = hasAppPermission(user?.role, "lms:manage");
  const {
    categories,
    lessons,
    loading,
    saving,
    error,
    selectedCategory,
    expandedCategories,
    setError,
    setSelectedCategory,
    fetchData,
    saveLesson,
    deleteLesson,
    toggleCategory,
  } = useAdminLessons();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formErrors, setFormErrors] = useState<LessonFormErrors>({});
  const [formData, setFormData] = useState<LessonFormData>(() =>
    createEmptyLessonForm([], [])
  );

  useEffect(() => {
    if (!canManageLms) {
      router.push("/lms", { scroll: false });
      return;
    }

    fetchData();
  }, [fetchData, canManageLms, router]);

  useEffect(() => {
    if (categories.length === 0) {
      return;
    }

    setFormData((currentFormData) =>
      currentFormData.category_id === 0
        ? { ...currentFormData, category_id: categories[0].id }
        : currentFormData
    );
  }, [categories]);

  const clearDuration = useCallback(() => {
    setFormData((currentFormData) =>
      currentFormData.duration_minutes === null
        ? currentFormData
        : { ...currentFormData, duration_minutes: null }
    );
  }, []);

  const setDetectedDuration = useCallback(
    (durationMinutes: number, youtubeUrl: string) => {
      setFormData((currentFormData) =>
        currentFormData.youtube_url.trim() === youtubeUrl
          ? { ...currentFormData, duration_minutes: durationMinutes }
          : currentFormData
      );
    },
    []
  );

  const durationLookup = useYoutubeDurationLookup({
    enabled: showAddForm,
    youtubeUrl: formData.youtube_url,
    onDurationCleared: clearDuration,
    onDurationDetected: setDetectedDuration,
  });

  const lessonGroups = useMemo(
    () => groupLessonsByCategory(categories, lessons, selectedCategory),
    [categories, lessons, selectedCategory]
  );

  const resetForm = useCallback(() => {
    setEditingId(null);
    setFormData(createEmptyLessonForm(categories, lessons, selectedCategory));
    setFormErrors({});
    setShowAddForm(false);
    setError("");
  }, [categories, lessons, selectedCategory, setError]);

  const openAddForm = useCallback(() => {
    setEditingId(null);
    setFormData(createEmptyLessonForm(categories, lessons, selectedCategory));
    setFormErrors({});
    setShowAddForm(true);
    setError("");
  }, [categories, lessons, selectedCategory, setError]);

  const startEdit = useCallback(
    (lesson: LessonWithStatus) => {
      const nextFormData = createLessonFormFromLesson(lesson);
      setEditingId(lesson.id);
      setFormData({
        ...nextFormData,
        title: tr(nextFormData.title),
        description: tr(nextFormData.description),
      });
      setFormErrors({});
      setShowAddForm(true);
      setError("");
    },
    [setError, tr]
  );

  const handleFieldChange = useCallback(
    <Field extends keyof LessonFormData,>(
      field: Field,
      value: LessonFormData[Field]
    ) => {
      setFormData((currentFormData) => ({
        ...currentFormData,
        [field]: value,
        ...(field === "category_id"
          ? {
              order_index: getNextLessonOrderIndex(
                lessons,
                Number(value),
                editingId
              ),
            }
          : {}),
      }));
      setFormErrors((currentErrors) => {
        if (!currentErrors[field]) return currentErrors;
        const nextErrors = { ...currentErrors };
        delete nextErrors[field];
        return nextErrors;
      });
    },
    [editingId, lessons]
  );

  const handleYoutubeUrlChange = useCallback((url: string) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      youtube_url: url,
      duration_minutes:
        currentFormData.youtube_url === url
          ? currentFormData.duration_minutes
          : null,
    }));
    setFormErrors((currentErrors) => {
      if (!currentErrors.youtube_url && !currentErrors.duration_minutes) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors.youtube_url;
      delete nextErrors.duration_minutes;
      return nextErrors;
    });
  }, []);

  const toggleAudienceRole = useCallback((role: LessonAudienceRole) => {
    setFormData((currentFormData) => {
      const nextRoles = currentFormData.allowed_roles.includes(role)
        ? currentFormData.allowed_roles.filter((item) => item !== role)
        : [...currentFormData.allowed_roles, role];

      return {
        ...currentFormData,
        allowed_roles: nextRoles,
      };
    });
    setFormErrors((currentErrors) => {
      if (!currentErrors.allowed_roles) return currentErrors;
      const nextErrors = { ...currentErrors };
      delete nextErrors.allowed_roles;
      return nextErrors;
    });
  }, []);

  const handleSave = useCallback(async () => {
    const validationErrors = validateLessonFormFields(
      formData,
      durationLookup.status
    );
    const validationError = Object.values(validationErrors)[0];

    if (validationError) {
      setFormErrors(validationErrors);
      setError(validationError);
      return;
    }

    setFormErrors({});
    const saved = await saveLesson(formData, editingId);

    if (saved) {
      resetForm();
    }
  }, [
    durationLookup.status,
    editingId,
    formData,
    resetForm,
    saveLesson,
    setError,
  ]);

  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm(tr("Are you sure you want to delete this lesson?"))) {
        return;
      }

      await deleteLesson(id);
    },
    [deleteLesson, tr]
  );

  if (!canManageLms) return null;

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      <div className="mx-auto max-w-[1200px] px-3 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6 flex items-start gap-3 sm:mb-8 sm:items-center sm:gap-4">
          <button
            type="button"
            onClick={() => router.push("/lms", { scroll: false })}
            aria-label={tr("Back to LMS")}
            title={tr("Back to LMS")}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-[4px_4px_8px_#e2e8f0,-4px_-4px_8px_#ffffff] transition-all hover:shadow-[6px_6px_12px_#e2e8f0,-6px_-6px_12px_#ffffff] active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30 sm:h-12 sm:w-12">
              <PlayCircle className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="break-words text-xl font-bold text-slate-800 sm:text-2xl">
                {tr("Manage Lessons")}
              </h1>
              <p className="break-words text-sm text-slate-500">
                {tr("Create YouTube lessons, set visibility, and organize training by category.")}
              </p>
            </div>
          </div>
        </div>

        <LmsContentManagerTabs activeTab="lessons" />

        {error && (
          <div className="mb-6 break-words rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <LessonCategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectedCategoryChange={setSelectedCategory}
        />

        {showAddForm ? (
          <LessonFormPanel
            editingId={editingId}
            formData={formData}
            formErrors={formErrors}
            durationLookup={durationLookup}
            categories={categories}
            saving={saving}
            onCancel={resetForm}
            onFieldChange={handleFieldChange}
            onSave={handleSave}
            onToggleAudienceRole={toggleAudienceRole}
            onYoutubeUrlChange={handleYoutubeUrlChange}
          />
        ) : (
          <button
            type="button"
            onClick={openAddForm}
            className="mb-8 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 font-medium text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl active:scale-95 sm:w-auto"
          >
            <Plus className="h-5 w-5" />
            {tr("New Lesson")}
          </button>
        )}

        <LessonCategoryList
          groups={lessonGroups}
          expandedCategories={expandedCategories}
          onToggleCategory={toggleCategory}
          onEdit={startEdit}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
