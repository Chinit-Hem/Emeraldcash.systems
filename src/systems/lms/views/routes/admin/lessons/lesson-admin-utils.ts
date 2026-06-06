import { extractYoutubeVideoId } from "@/systems/lms/types/lms-schema";
import type { LessonWithStatus, LmsCategory } from "@/systems/lms/types/lms-types";

export const LESSON_AUDIENCE_ROLES = ["Staff", "Accounting"] as const;
export type LessonAudienceRole = (typeof LESSON_AUDIENCE_ROLES)[number];

export const DEFAULT_LESSON_AUDIENCE: LessonAudienceRole[] = [
  ...LESSON_AUDIENCE_ROLES,
];

export const DURATION_IDLE_MESSAGE = "Waiting for YouTube URL.";

const CATEGORY_COLOR_CLASSES: Record<string, string> = {
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
};

export interface LessonFormData {
  title: string;
  description: string;
  category_id: number;
  youtube_url: string;
  duration_minutes: number | null;
  order_index: number;
  is_active: boolean;
  allowed_roles: LessonAudienceRole[];
}

export type LessonFormErrors = Partial<Record<keyof LessonFormData, string>>;

export type DurationLookupState = {
  status: "idle" | "loading" | "ready" | "error";
  message: string;
  videoId?: string;
};

export type DurationLookupResponse = {
  success?: boolean;
  data?: {
    durationSeconds?: number;
    durationMinutes?: number;
    durationLabel?: string;
    videoId?: string;
  };
  error?: string;
};

export type LessonCategoryGroup = LmsCategory & {
  lessons: LessonWithStatus[];
};

function isLessonAudienceRole(role: string): role is LessonAudienceRole {
  return (LESSON_AUDIENCE_ROLES as readonly string[]).includes(role);
}

function findCategory(categories: LmsCategory[], categoryId: number) {
  return categories.find((category) => category.id === categoryId);
}

export function getNextLessonOrderIndex(
  lessons: LessonWithStatus[],
  categoryId: number,
  excludeLessonId?: number | null
) {
  const maxOrderIndex = lessons
    .filter((lesson) => lesson.category_id === categoryId)
    .filter((lesson) => !excludeLessonId || lesson.id !== excludeLessonId)
    .reduce((maxIndex, lesson) => Math.max(maxIndex, lesson.order_index || 0), 0);

  return maxOrderIndex + 1;
}

export function normalizeLessonAudience(
  allowedRoles?: string[] | null
): LessonAudienceRole[] {
  const roles = Array.from(
    new Set((allowedRoles ?? []).filter(isLessonAudienceRole))
  );

  return roles.length > 0 ? roles : [...DEFAULT_LESSON_AUDIENCE];
}

export function getAudienceLabel(allowedRoles?: string[] | null) {
  const roles = normalizeLessonAudience(allowedRoles);
  const staffEnabled = roles.includes("Staff");
  const accountingEnabled = roles.includes("Accounting");

  if (staffEnabled && accountingEnabled) return "All staff";
  if (accountingEnabled) return "Accounting only";
  return "Staff only";
}

export function getCategoryColorClass(color?: string | null) {
  return CATEGORY_COLOR_CLASSES[color ?? ""] ?? "bg-emerald-500";
}

export function createEmptyLessonForm(
  categories: LmsCategory[],
  lessons: LessonWithStatus[],
  preferredCategory: number | "all" = "all"
): LessonFormData {
  const categoryId =
    preferredCategory === "all" ? categories[0]?.id ?? 0 : preferredCategory;

  return {
    title: "",
    description: "",
    category_id: categoryId,
    youtube_url: "",
    duration_minutes: null,
    order_index: getNextLessonOrderIndex(lessons, categoryId),
    is_active: true,
    allowed_roles: [...DEFAULT_LESSON_AUDIENCE],
  };
}

export function createLessonFormFromLesson(
  lesson: LessonWithStatus
): LessonFormData {
  return {
    title: lesson.title,
    description: lesson.description || "",
    category_id: lesson.category_id,
    youtube_url: lesson.youtube_url || "",
    duration_minutes: lesson.duration_minutes ?? null,
    order_index: lesson.order_index,
    is_active: lesson.is_active ?? true,
    allowed_roles: normalizeLessonAudience(lesson.allowed_roles),
  };
}

export function validateLessonForm(
  formData: LessonFormData,
  durationLookupStatus: DurationLookupState["status"]
) {
  const errors = validateLessonFormFields(formData, durationLookupStatus);
  return Object.values(errors)[0] ?? null;
}

export function validateLessonFormFields(
  formData: LessonFormData,
  durationLookupStatus: DurationLookupState["status"]
): LessonFormErrors {
  const errors: LessonFormErrors = {};

  if (!formData.title.trim()) {
    errors.title = "Lesson title is required";
  }

  if (!formData.category_id) {
    errors.category_id = "Please select a category";
  }

  if (!formData.youtube_url.trim()) {
    errors.youtube_url = "YouTube URL is required";
  } else if (!extractYoutubeVideoId(formData.youtube_url)) {
    errors.youtube_url = "Please enter a valid YouTube URL";
  }

  if (durationLookupStatus === "loading") {
    errors.duration_minutes = "Please wait for the video duration to load";
  } else if (!formData.duration_minutes || formData.duration_minutes < 1) {
    errors.duration_minutes = "Video duration must load automatically before saving";
  }

  if (formData.allowed_roles.length === 0) {
    errors.allowed_roles = "Select at least one role for lesson visibility";
  }

  return errors;
}

export function buildOptimisticLesson(
  formData: LessonFormData,
  categories: LmsCategory[],
  editingId: number | null,
  previousLesson?: LessonWithStatus
): LessonWithStatus {
  const category = findCategory(categories, formData.category_id);

  return {
    id: editingId ?? Date.now(),
    title: formData.title.trim(),
    description: formData.description,
    category_id: formData.category_id,
    youtube_url: formData.youtube_url,
    youtube_video_id: previousLesson?.youtube_video_id ?? "",
    duration_minutes: formData.duration_minutes,
    order_index: formData.order_index,
    is_active: formData.is_active,
    is_completed: previousLesson?.is_completed ?? false,
    is_unlocked: previousLesson?.is_unlocked ?? true,
    completed_at: previousLesson?.completed_at ?? null,
    category_name: category?.name ?? previousLesson?.category_name ?? "",
    category_color:
      category?.color ?? previousLesson?.category_color ?? "emerald",
    allowed_roles: [...formData.allowed_roles],
  };
}

export function mergeSavedLesson(
  savedLesson: LessonWithStatus,
  categories: LmsCategory[],
  fallbackLesson?: LessonWithStatus
): LessonWithStatus {
  const category = findCategory(categories, savedLesson.category_id);

  return {
    ...savedLesson,
    is_completed:
      fallbackLesson?.is_completed ?? savedLesson.is_completed ?? false,
    is_unlocked: fallbackLesson?.is_unlocked ?? savedLesson.is_unlocked ?? true,
    completed_at:
      fallbackLesson?.completed_at ?? savedLesson.completed_at ?? null,
    category_name:
      category?.name ?? savedLesson.category_name ?? fallbackLesson?.category_name ?? "",
    category_color:
      category?.color ??
      savedLesson.category_color ??
      fallbackLesson?.category_color ??
      "emerald",
    allowed_roles: normalizeLessonAudience(
      savedLesson.allowed_roles ?? fallbackLesson?.allowed_roles
    ),
  };
}

export function groupLessonsByCategory(
  categories: LmsCategory[],
  lessons: LessonWithStatus[],
  selectedCategory: number | "all"
): LessonCategoryGroup[] {
  const visibleCategories =
    selectedCategory === "all"
      ? categories
      : categories.filter((category) => category.id === selectedCategory);

  const visibleLessons =
    selectedCategory === "all"
      ? lessons
      : lessons.filter((lesson) => lesson.category_id === selectedCategory);

  return visibleCategories.map((category) => ({
    ...category,
    lessons: visibleLessons
      .filter((lesson) => lesson.category_id === category.id)
      .sort((a, b) => a.order_index - b.order_index),
  }));
}
