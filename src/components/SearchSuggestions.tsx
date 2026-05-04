/**
 * Search Suggestions Component
 *
 * Displays "Did you mean?" fuzzy search suggestions when a user's query
 * doesn't match any vehicles exactly. Clicking a suggestion applies that
 * search term to the parent component's filter.
 *
 * @module SearchSuggestions
 */

"use client";

import { Car, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/ui";
import type { FuzzySuggestion } from "@/lib/fuzzySearch";

// ============================================================================
// Types
// ============================================================================

interface SearchSuggestionsProps {
  suggestions: FuzzySuggestion[];
  searchTerm: string;
  onSelect: (suggestion: FuzzySuggestion) => void;
  className?: string;
}

// ============================================================================
// Helper: format similarity as percentage badge
// ============================================================================

function scoreBadgeClass(score: number): string {
  if (score >= 0.8) return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  if (score >= 0.6) return "bg-blue-100 text-blue-700 ring-blue-200";
  if (score >= 0.45) return "bg-amber-100 text-amber-700 ring-amber-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function scoreLabel(score: number): string {
  if (score >= 0.8) return "Very Similar";
  if (score >= 0.6) return "Similar";
  if (score >= 0.45) return "Maybe";
  return "Possible match";
}

// ============================================================================
// Component
// ============================================================================

export default function SearchSuggestions({
  suggestions,
  searchTerm,
  onSelect,
  className,
}: SearchSuggestionsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className={cn("w-full", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-emerald-500" />
        <h3 className="text-base font-semibold text-slate-800">
          Did you mean?
        </h3>
        <span className="text-sm text-slate-500">
          {`Showing suggestions for "${searchTerm}"`}
        </span>
      </div>

      {/* Suggestion Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {suggestions.map((suggestion, index) => {
          const v = suggestion.vehicle;
          const scorePct = Math.round(suggestion.score * 100);

          return (
            <button
              key={`${v.VehicleId}-${index}`}
              onClick={() => onSelect(suggestion)}
              className={cn(
                "group relative flex items-center gap-3 p-4 rounded-2xl text-left",
                "bg-white border border-slate-200 shadow-sm",
                "hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5",
                "active:scale-[0.98]",
                "transition-all duration-200"
              )}
            >
              {/* Icon / Image placeholder */}
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                <Car className="w-6 h-6 text-slate-400 group-hover:text-emerald-500 transition-colors" />
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-800 truncate">
                    {v.Brand} {v.Model}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ring-1",
                      scoreBadgeClass(suggestion.score)
                    )}
                  >
                    {scoreLabel(suggestion.score)} {scorePct}%
                  </span>
                  {v.Category && (
                    <span className="text-xs text-slate-500 truncate">
                      {v.Category}
                    </span>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Helper text */}
      <p className="mt-3 text-xs text-slate-400">
        Click a suggestion to search for that vehicle instead.
      </p>
    </div>
  );
}
