"use client";

import { useId } from "react";

import { useLanguage } from "@/shared/hooks/LanguageContext";
import { translatePhrase } from "@/shared/utils/i18n";
import type { LmsCategory } from "@/systems/lms/types/lms-types";

interface LessonCategoryFilterProps {
  categories: LmsCategory[];
  selectedCategory: number | "all";
  onSelectedCategoryChange: (categoryId: number | "all") => void;
}

export function LessonCategoryFilter({
  categories,
  selectedCategory,
  onSelectedCategoryChange,
}: LessonCategoryFilterProps) {
  const filterId = useId();
  const { language } = useLanguage();
  const tr = (text: string) => translatePhrase(text, language);

  return (
    <div className="mb-6 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
      <label htmlFor={filterId} className="text-sm font-medium text-slate-700">
        {tr("Filter by category:")}
      </label>
      <select
        id={filterId}
        title={tr("Filter lessons by category")}
        value={selectedCategory}
        onChange={(event) =>
          onSelectedCategoryChange(
            event.target.value === "all" ? "all" : Number(event.target.value)
          )
        }
        className="min-h-11 w-full rounded-xl border-none bg-white px-4 py-2 text-sm text-slate-700 shadow-[4px_4px_8px_#e2e8f0,-4px_-4px_8px_#ffffff] focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-auto"
      >
        <option value="all">{tr("All Categories")}</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {tr(category.name)}
          </option>
        ))}
      </select>
    </div>
  );
}
