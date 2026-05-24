export interface VehicleStats {
  total: number;
  byCategory: {
    Cars: number;
    Motorcycles: number;
    TukTuks: number;
  };
  byCondition: {
    New: number;
    Used: number;
  };
  noImageCount: number;
  avgPrice: number;
}

