/**
 * Services Index
 * 
 * Centralized exports for all service layer classes.
 * Provides clean imports for the OOAD service layer.
 * 
 * @module services
 */

// Base Service
export {
  BaseService,
} from "@/shared/utils/services/BaseService";

export type {
  ServiceResult,
  BaseEntity,
  BaseDBRecord,
} from "@/shared/utils/services/BaseService";

// Vehicle Service
export {
  VehicleService,
  vehicleService,
  default as vehicleServiceDefault,
} from "@/systems/vms/services/VehicleService";

// Types
export type {
  VehicleDB,
  VehicleFilters,
  VehicleStats,
  PaginatedResult,
  VehicleEntity,
} from "@/systems/vms/services/VehicleService";
