"use client";

import type { LessonWithStatus } from "@/systems/lms/types/lms-types";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Edit2,
  PlayCircle,
  Trash2,
  Video,
} from "lucide-react";

import {
  getAudienceLabel,
  getCategoryColorClass,
  type LessonCategoryGroup,
} from "./lesson-admin-utils";

interface LessonCategoryListProps {
  expandedCategories: Set<number>;
  groups: LessonCategoryGroup[];
  onDelete: (id: number) => void;
  onEdit: (lesson: LessonWithStatus) => void;
  onToggleCategory: (categoryId: number) => void;
}

export function LessonCategoryList({
  expandedCategories,
  groups,
  onDelete,
  onEdit,
  onToggleCategory,
}: LessonCategoryListProps) {
  if (groups.length === 0) {
    return (
      <div className="rounded-2xl bg-white px-4 py-12 text-center shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff] sm:rounded-3xl">
        <PlayCircle className="mx-auto mb-4 h-12 w-12 text-slate-300" />
        <h3 className="mb-2 break-words text-lg font-semibold text-slate-800">
          No Lessons Yet
        </h3>
        <p className="break-words text-slate-500">
          Create your first lesson to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((category) => {
        const isExpanded = expandedCategories.has(category.id);

        return (
          <div
            key={category.id}
            className="overflow-hidden rounded-2xl bg-white shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff] sm:rounded-3xl"
          >
            <button
              type="button"
              onClick={() => onToggleCategory(category.id)}
              aria-expanded={isExpanded}
              className="flex min-h-11 w-full items-center justify-between gap-3 p-4 transition-colors hover:bg-slate-50/50 sm:p-6"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getCategoryColorClass(
                    category.color
                  )} text-white shadow-lg`}
                >
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0 text-left">
                  <h3 className="break-words text-lg font-bold text-slate-800">
                    {category.name}
                  </h3>
                  <p className="break-words text-sm text-slate-500">
                    {category.lessons.length} lessons
                  </p>
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 shrink-0 text-slate-400" />
              ) : (
                <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
              )}
            </button>

            {isExpanded && (
              <div className="border-t border-slate-100">
                {category.lessons.length === 0 ? (
                  <div className="break-words p-6 text-center text-slate-500">
                    No lessons in this category yet
                  </div>
                ) : (
                  category.lessons.map((lesson, index) => (
                    <LessonRow
                      key={lesson.id}
                      index={index}
                      lesson={lesson}
                      onDelete={onDelete}
                      onEdit={onEdit}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface LessonRowProps {
  index: number;
  lesson: LessonWithStatus;
  onDelete: (id: number) => void;
  onEdit: (lesson: LessonWithStatus) => void;
}

function LessonRow({ index, lesson, onDelete, onEdit }: LessonRowProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 transition-colors last:border-b-0 hover:bg-slate-50/50 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-medium text-slate-500">
          {index + 1}
        </div>
        <div className="min-w-0">
          <h4 className="break-words font-medium text-slate-800">
            {lesson.title}
          </h4>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
            <Video className="h-4 w-4 shrink-0" />
            <span>Video</span>
            <span aria-hidden="true">&bull;</span>
            <span>{lesson.duration_minutes || 0} min</span>
            <span aria-hidden="true">&bull;</span>
            <span>{getAudienceLabel(lesson.allowed_roles)}</span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
        <button
          type="button"
          onClick={() => onEdit(lesson)}
          aria-label={`Edit ${lesson.title}`}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-all hover:bg-blue-100 active:scale-95"
          title="Edit"
        >
          <Edit2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(lesson.id)}
          aria-label={`Delete ${lesson.title}`}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 transition-all hover:bg-red-100 active:scale-95"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
