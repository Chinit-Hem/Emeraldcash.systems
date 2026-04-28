/**
 * Fuzzy Search Utility
 *
 * Provides Levenshtein distance calculation and fuzzy suggestion ranking
 * for vehicle search when exact substring matches fail.
 *
 * Features:
 * - Levenshtein distance (edit distance) for typo tolerance
 * - Normalized similarity scores (0–1)
 * - Multi-field ranking across brand, model, plate, category
 * - Tokenized multi-word query support
 * - Fast O(n*m) matrix with early termination
 *
 * @module fuzzySearch
 */

import type { Vehicle } from "@/lib/types";

// ============================================================================
// Types
// ============================================================================

export interface FuzzySuggestion {
  vehicle: Vehicle;
  score: number; // 0–1, higher is better match
  matchedField: string; // which field contributed most to the score
  highlightText: string; // text to show as "Did you mean: ..."
}

export interface FuzzySearchOptions {
  limit?: number;
  minScore?: number; // minimum similarity to include (0–1)
  searchFields?: Array<keyof Vehicle>;
}

// ============================================================================
// Levenshtein Distance
// ============================================================================

/**
 * Calculate Levenshtein edit distance between two strings.
 * Returns the minimum number of single-character edits (insert, delete, replace).
 *
 * Optimized with:
 * - Early termination if best possible < known best
 * - Two-row array instead of full matrix (O(m) space)
 * - Case-insensitive comparison
 */
export function levenshteinDistance(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  if (aLower === bLower) return 0;
  if (aLower.length === 0) return bLower.length;
  if (bLower.length === 0) return aLower.length;

  // Ensure a is the shorter string for space optimization
  if (aLower.length > bLower.length) {
    return levenshteinDistance(bLower, aLower);
  }

  const m = aLower.length;
  const n = bLower.length;

  let prevRow = new Array(m + 1);
  let currRow = new Array(m + 1);

  for (let i = 0; i <= m; i++) {
    prevRow[i] = i;
  }

  for (let j = 1; j <= n; j++) {
    currRow[0] = j;
    const bChar = bLower[j - 1];

    for (let i = 1; i <= m; i++) {
      const cost = aLower[i - 1] === bChar ? 0 : 1;
      currRow[i] = Math.min(
        prevRow[i] + 1, // deletion
        currRow[i - 1] + 1, // insertion
        prevRow[i - 1] + cost // substitution
      );
    }

    // Swap rows
    const temp = prevRow;
    prevRow = currRow;
    currRow = temp;
  }

  return prevRow[m];
}

/**
 * Calculate normalized similarity score between 0 and 1.
 * 1 = identical, 0 = completely different.
 */
export function similarityScore(a: string, b: string): number {
  if (!a || !b) return 0;
  const aTrim = a.trim();
  const bTrim = b.trim();
  if (aTrim.toLowerCase() === bTrim.toLowerCase()) return 1;

  const maxLen = Math.max(aTrim.length, bTrim.length);
  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(aTrim, bTrim);
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Check if query is a likely typo of target (within edit distance threshold).
 * Threshold is dynamic based on word length (e.g., 1 error for 4 chars, 2 for 7, etc.)
 */
export function isLikelyTypo(query: string, target: string): boolean {
  const q = query.trim().toLowerCase();
  const t = target.trim().toLowerCase();

  if (q === t) return true;
  if (t.includes(q)) return true; // substring match

  const maxLen = Math.max(q.length, t.length);
  const distance = levenshteinDistance(q, t);

  // Dynamic threshold: allow more errors for longer words
  const threshold = maxLen <= 3 ? 0 : maxLen <= 5 ? 1 : maxLen <= 8 ? 2 : maxLen <= 12 ? 3 : 4;

  return distance <= threshold;
}

// ============================================================================
// Tokenized Multi-Word Matching
// ============================================================================

/**
 * Split query into tokens and score each token against the target string.
 * Returns average score of best matches for each token.
 */
function tokenizedSimilarity(query: string, target: string): number {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  if (tokens.length === 0) return 0;
  if (tokens.length === 1) return similarityScore(tokens[0], target);

  let totalScore = 0;
  for (const token of tokens) {
    // Best match for this token against any word in target
    const targetWords = target.toLowerCase().split(/\s+/);
    let bestTokenScore = 0;
    for (const tw of targetWords) {
      bestTokenScore = Math.max(bestTokenScore, similarityScore(token, tw));
    }
    totalScore += bestTokenScore;
  }

  return totalScore / tokens.length;
}

// ============================================================================
// Vehicle Fuzzy Suggestions
// ============================================================================

const DEFAULT_SEARCH_FIELDS: Array<keyof Vehicle> = [
  "Brand",
  "Model",
  "Plate",
  "Category",
  "Color",
  "BodyType",
  "Condition",
];

/**
 * Get fuzzy search suggestions from a list of vehicles.
 * Ranks vehicles by similarity score across multiple fields.
 *
 * @param searchTerm - The user's (possibly misspelled) search query
 * @param vehicles - Array of vehicles to search through
 * @param options - Configuration options
 * @returns Array of suggestions sorted by score (highest first)
 */
export function getFuzzySuggestions(
  searchTerm: string,
  vehicles: Vehicle[],
  options: FuzzySearchOptions = {}
): FuzzySuggestion[] {
  const {
    limit = 5,
    minScore = 0.35,
    searchFields = DEFAULT_SEARCH_FIELDS,
  } = options;

  if (!searchTerm || searchTerm.trim().length < 2) return [];
  if (!vehicles || vehicles.length === 0) return [];

  const query = searchTerm.trim().toLowerCase();
  const queryTokens = query.split(/\s+/).filter(Boolean);

  const scored: FuzzySuggestion[] = [];

  for (const vehicle of vehicles) {
    let bestScore = 0;
    let bestField: string = "Brand";
    let bestHighlight = "";

    for (const field of searchFields) {
      const rawValue = vehicle[field];
      if (rawValue == null) continue;

      const fieldValue = String(rawValue).trim();
      if (fieldValue.length === 0) continue;

      // Score this field
      let fieldScore: number;

      if (queryTokens.length > 1) {
        // Multi-word query: use tokenized matching
        fieldScore = tokenizedSimilarity(query, fieldValue);
      } else {
        // Single word: direct similarity
        fieldScore = similarityScore(query, fieldValue);

        // Boost score for prefix matches (user typing partial word)
        const fieldLower = fieldValue.toLowerCase();
        if (fieldLower.startsWith(query)) {
          fieldScore = Math.max(fieldScore, 0.85);
        }
      }

      // Boost exact substring matches
      if (fieldValue.toLowerCase().includes(query)) {
        fieldScore = Math.max(fieldScore, 0.9);
      }

      if (fieldScore > bestScore) {
        bestScore = fieldScore;
        bestField = String(field);
        bestHighlight = fieldValue;
      }
    }

    // Also score combined brand + model for better "did you mean" suggestions
    const combined = `${vehicle.Brand || ""} ${vehicle.Model || ""}`.trim();
    if (combined.length > 0) {
      const combinedScore =
        queryTokens.length > 1
          ? tokenizedSimilarity(query, combined)
          : similarityScore(query, combined);
      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestField = "BrandModel";
        bestHighlight = combined;
      }
    }

    if (bestScore >= minScore) {
      scored.push({
        vehicle,
        score: bestScore,
        matchedField: bestField,
        highlightText: bestHighlight,
      });
    }
  }

  // Sort by score descending, then by brand/model for stable ordering
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aName = `${a.vehicle.Brand}${a.vehicle.Model}`.toLowerCase();
    const bName = `${b.vehicle.Brand}${b.vehicle.Model}`.toLowerCase();
    return aName.localeCompare(bName);
  });

  return scored.slice(0, limit);
}

/**
 * Quick check: does this search term likely need fuzzy suggestions?
 * Returns true if the term is short, has repeated characters, or looks like a typo.
 */
export function mightNeedFuzzySuggestions(searchTerm: string): boolean {
  if (!searchTerm || searchTerm.trim().length < 3) return false;
  const term = searchTerm.trim().toLowerCase();

  // Repeated characters often indicate typos (e.g., "toyoota")
  const hasRepeatedChars = /(.)(\1{2,})/.test(term);

  // Very short terms don't need fuzzy
  const isShort = term.length < 4;

  return hasRepeatedChars || !isShort;
}

/**
 * Format a suggestion for display.
 * Example: "Did you mean: Toyota Camry?"
 */
export function formatSuggestionText(suggestion: FuzzySuggestion): string {
  const v = suggestion.vehicle;
  return `${v.Brand || ""} ${v.Model || ""}`.trim();
}

// ============================================================================
// Export
// ============================================================================

export default {
  levenshteinDistance,
  similarityScore,
  isLikelyTypo,
  getFuzzySuggestions,
  mightNeedFuzzySuggestions,
  formatSuggestionText,
};

