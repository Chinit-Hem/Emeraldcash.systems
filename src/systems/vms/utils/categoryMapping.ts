/**
 * Category Mapping Utility - CLIENT EDITION
 * 
 * Maps UI quick filter names → normalized plural category names for API calls
 * Prevents hardcoded strings in QuickFilterCard onClick
 * 
 * @module categoryMapping
 */

// No imports needed - self-contained module

// ============================================================================
// CLIENT QUICKFILTER MAPPINGS (NEW - BUG FIX)
// ============================================================================

/**
 * Maps QuickFilter values → API category parameters (PLURAL NORMALIZED)
 * Used by VehiclesClientEnhanced.tsx QuickFilterCard onClick
 */
export const CLIENT_QUICKFILTER_MAP: Record<string, string> = {
  // QuickFilter key → API category value (PLURAL)
  'cars': 'Cars',
  'motorcycles': 'Motorcycles',
  'tuktuks': 'TukTuks',
  
  // URL param fallbacks
  'car': 'Cars',
  'motorcycle': 'Motorcycles',
  'tuktuk': 'TukTuks',
  
  // Legacy singular mappings (backward compatibility)
  'Car': 'Cars',
  'Motorcycle': 'Motorcycles', 
  'Tuk Tuk': 'TukTuks',
  'TukTuk': 'TukTuks'
};

/**
 * Reverse mapping: API category → QuickFilter key
 */
export const API_TO_QUICKFILTER: Record<string, string> = {
  'Cars': 'cars',
  'Motorcycles': 'motorcycles',
  'TukTuks': 'tuktuks'
};

// ============================================================================
// Existing exports (unchanged)
// BACKWARD COMPATIBILITY - Re-export existing constants
export const CATEGORY_TO_DB_PATTERN = {
  'Cars': 'car',
  'Motorcycles': 'motor', 
  'TukTuks': 'tuk',
  'Trucks': 'truck',
  'Vans': 'van',
  'Buses': 'bus'
};

export const DB_TO_DISPLAY_NAME = {
  'car': 'Cars',
  'motor': 'Motorcycles',
  'tuk': 'TukTuks'
};

export const VALID_CATEGORIES = ['Cars','Motorcycles','TukTuks','Trucks','Vans','Buses','Other'] as const;
export type ValidCategory = typeof VALID_CATEGORIES[number];

// ============================================================================
// New utility for QuickFilterCard
// ============================================================================

/**
 * Get API-ready category from QuickFilter key
 * @param quickFilterKey - 'cars', 'motorcycles', 'tuktuks'
 * @returns API category: 'Cars', 'Motorcycles', 'TukTuks'
 */
export function getQuickFilterCategory(quickFilterKey: string): string {
  return CLIENT_QUICKFILTER_MAP[quickFilterKey] || quickFilterKey;
}

/**
 * Get QuickFilter key from API category
 */
export function getQuickFilterKey(category: string): string {
  return API_TO_QUICKFILTER[category] || category.toLowerCase();
}

// ============================================================================
// BACKWARD COMPATIBILITY
// All existing functions unchanged
// ============================================================================
// Essential utilities
export function getCategorySearchPattern(category: string): string {
  const patterns = {
    'Cars': '%car%',
    'Motorcycles': '%motor%', 
    'TukTuks': '%tuk%'
  };
  return patterns[category as keyof typeof patterns] || `%${category.toLowerCase()}%`;
}

export function buildIlikePattern(searchTerm: string): string {
  const escaped = searchTerm.replace(/%/g, '\\%').replace(/_/g, '\\_');
  return `%${escaped}%`;
}

export function normalizeCategoryToDisplay(category: string): string {
  const lower = category.toLowerCase().trim();
  if (lower.includes('car')) return 'Cars';
  if (lower.includes('motor')) return 'Motorcycles';
  if (lower.includes('tuk')) return 'TukTuks';
  return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
}

