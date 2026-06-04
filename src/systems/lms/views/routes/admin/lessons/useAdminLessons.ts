"use client";

import { useCallback, useState } from "react";

import type { LessonWithStatus, LmsCategory } from "@/systems/lms/types/lms-types";

import {
  buildOptimisticLesson,
  mergeSavedLesson,
  type LessonFormData,
} from "./lesson-admin-utils";

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  error?: string;
};

async function readApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const payload = (await response.json().catch(() => null)) as
    | ApiResponse<T>
    | null;

  if (!payload) {
    return {
      success: false,
      error: "Invalid server response",
    };
  }

  return payload;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useAdminLessons() {
  const [categories, setCategories] = useState<LmsCategory[]>([]);
  const [lessons, setLessons] = useState<LessonWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | "all">(
    "all"
  );
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(
    new Set()
  );

  const fetchData = useCallback(async () => {
    try {
      const [categoriesResponse, lessonsResponse] = await Promise.all([
        fetch("/api/lms/categories"),
        fetch("/api/lms/lessons?all=true"),
      ]);

      const categoriesData =
        await readApiResponse<LmsCategory[]>(categoriesResponse);
      const lessonsData =
        await readApiResponse<LessonWithStatus[]>(lessonsResponse);

      if (!categoriesResponse.ok || !categoriesData.success) {
        throw new Error(categoriesData.error ?? "Failed to load categories");
      }

      if (!lessonsResponse.ok || !lessonsData.success) {
        throw new Error(lessonsData.error ?? "Failed to load lessons");
      }

      setCategories(Array.isArray(categoriesData.data) ? categoriesData.data : []);
      setLessons(
        Array.isArray(lessonsData.data)
          ? lessonsData.data.filter((lesson) => lesson.is_active !== false)
          : []
      );
      setError("");
    } catch (error) {
      setError(getErrorMessage(error, "Failed to load data"));
    } finally {
      setLoading(false);
    }
  }, []);

  const saveLesson = useCallback(
    async (formData: LessonFormData, editingId: number | null) => {
      const previousLessons = lessons;
      const previousLesson = editingId
        ? lessons.find((lesson) => lesson.id === editingId)
        : undefined;
      const optimisticLesson = buildOptimisticLesson(
        formData,
        categories,
        editingId,
        previousLesson
      );

      setSaving(true);
      setError("");
      setLessons((currentLessons) =>
        editingId
          ? currentLessons.map((lesson) =>
              lesson.id === editingId ? optimisticLesson : lesson
            )
          : [...currentLessons, optimisticLesson]
      );

      try {
        const url = editingId
          ? `/api/lms/lessons?id=${editingId}`
          : "/api/lms/lessons";
        const method = editingId ? "PUT" : "POST";

        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const payload = await readApiResponse<LessonWithStatus | null>(
          response
        );

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.error ?? "Failed to save lesson");
        }

        const savedLesson = mergeSavedLesson(
          payload.data,
          categories,
          previousLesson ?? optimisticLesson
        );

        setLessons((currentLessons) =>
          currentLessons.map((lesson) =>
            lesson.id === optimisticLesson.id ? savedLesson : lesson
          )
        );

        return true;
      } catch (error) {
        setLessons(previousLessons);
        setError(getErrorMessage(error, "Failed to save lesson"));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [categories, lessons]
  );

  const deleteLesson = useCallback(
    async (id: number) => {
      try {
        setError("");
        const response = await fetch(`/api/lms/lessons?id=${id}`, {
          method: "DELETE",
        });
        const payload = await readApiResponse<unknown>(response);

        if (!response.ok || !payload.success) {
          throw new Error(payload.error ?? "Failed to delete lesson");
        }

        await fetchData();
        return true;
      } catch (error) {
        setError(getErrorMessage(error, "Failed to delete lesson"));
        return false;
      }
    },
    [fetchData]
  );

  const toggleCategory = useCallback((categoryId: number) => {
    setExpandedCategories((currentExpandedCategories) => {
      const nextExpandedCategories = new Set(currentExpandedCategories);

      if (nextExpandedCategories.has(categoryId)) {
        nextExpandedCategories.delete(categoryId);
      } else {
        nextExpandedCategories.add(categoryId);
      }

      return nextExpandedCategories;
    });
  }, []);

  return {
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
  };
}
