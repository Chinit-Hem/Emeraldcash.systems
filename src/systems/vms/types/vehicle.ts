/**
 * Vehicle-specific shared types
 * Single source of truth for vehicle statistics and filters
 */

import type { BaseFilters } from "@/shared/types/core";

export interface VehicleStats {
  total: number;
  byCategory: {
    Cars: number;
    Motorcycles: number;
    TukTuks: number;
    Trucks: number;
    Vans: number;
    Buses: number;
    Other: number;
  };
  byCondition: {
    New: number;
    Used: number;
    Other: number;
  };
  avgPrice: number;
  noImageCount: number;
}

export interface VehicleFilters extends BaseFilters {
  category?: string;
  brand?: string;
  model?: string;
  condition?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  color?: string;
  bodyType?: string;
  taxType?: string;
  withoutImage?: boolean;
}
