/**
 * Service Layer Interfaces - OOAD Implementation
 * 
 * Defines contracts for all service classes using:
 * - Interface Segregation Principle (ISP)
 * - Dependency Inversion Principle (DIP)
 * 
 * @module services/interfaces
 */

import { ServiceResult, BaseEntity, BaseDBRecord, BaseFilters } from "@/shared/utils/services/BaseService";

// ============================================================================
// Core Service Interfaces
// ============================================================================

/**
 * Base interface for all services
 * Defines the contract that every service must implement
 */
export interface IService {
  /** Service identifier for logging and debugging */
  readonly serviceName: string;
  
  /** Clear all cached data */
  clearCache(): void;
  
  /** Get service statistics */
  getStats(): { totalQueries: number; cacheHits: number; cacheMisses: number; averageResponseTimeMs: number };
  
  /** Reset service statistics */
  resetStats(): void;
}

/**
 * Interface for CRUD operations
 * Generic types: TEntity - API response type, TDB - Database record type
 */
export interface ICrudService<TEntity extends BaseEntity, TDB extends BaseDBRecord, TFilters extends BaseFilters> extends IService {
  /** Get all records with optional filtering */
  getAll(filters?: TFilters): Promise<ServiceResult<TEntity[]>>;
  
  /** Get single record by ID */
  getById(id: number): Promise<ServiceResult<TEntity>>;
  
  /** Create new record */
  create(data: Omit<TDB, "id" | "created_at" | "updated_at">): Promise<ServiceResult<TEntity>>;
  
  /** Update existing record */
  update(id: number, data: Partial<TDB>): Promise<ServiceResult<TEntity>>;
  
  /** Delete record */
  delete(id: number): Promise<ServiceResult<boolean>>;
  
  /** Check if record exists */
  exists(id: number): Promise<ServiceResult<boolean>>;
  
  /** Get total count */
  count(): Promise<ServiceResult<number>>;
}

/**
 * Interface for cache-enabled services
 */
export interface ICacheable {
  /** Default cache TTL in milliseconds */
  readonly DEFAULT_CACHE_TTL_MS: number;
  
  /** Get data from cache */
  getFromCache<T>(key: string): T | null;
  
  /** Set data in cache */
  setCache<T>(key: string, data: T, ttlMs?: number): void;
  
  /** Invalidate specific cache entry */
  invalidateCache(key: string): void;
  
  /** Invalidate cache by pattern */
  invalidateCachePattern(pattern: string): void;
}

/**
 * Interface for services that provide statistics
 */
export interface IStatsProvider {
  /** Get detailed statistics */
  getDetailedStats(): Promise<ServiceResult<Record<string, unknown>>>;
}

/**
 * Interface for searchable services
 */
export interface ISearchable<TEntity extends BaseEntity, TFilters extends BaseFilters> {
  /** Search records by text */
  search(searchTerm: string, limit?: number): Promise<ServiceResult<TEntity[]>>;
  
  /** Advanced search with multiple criteria */
  advancedSearch(criteria: TFilters): Promise<ServiceResult<TEntity[]>>;
}

/**
 * Interface for paginated results
 */
export interface IPaginatedService<TEntity extends BaseEntity, TFilters extends BaseFilters> {
  /** Get paginated results */
  getPaginated(filters: TFilters & { page: number; pageSize: number }): Promise<ServiceResult<{
    data: TEntity[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>>;
}

// ============================================================================
// Specialized Service Interfaces
// ============================================================================

/**
 * Interface for LMS-specific operations
 */
export interface ILmsService extends IService {
  /** Get categories with lesson counts */
  getCategories(): Promise<ServiceResult<(unknown & { lesson_count: number })[]>>;
  
  /** Get lessons by category */
  getLessonsByCategory(categoryId: number): Promise<ServiceResult<unknown[]>>;
  
  /** Mark lesson as complete */
  markLessonComplete(input: unknown): Promise<ServiceResult<unknown>>;
  
  /** Get staff progress */
  getStaffProgress(staffId: number): Promise<ServiceResult<unknown>>;
}

/**
 * Interface for unified user management
 */
export interface IUnifiedUserService extends IService {
  /** Create user across all systems */
  createUser(input: unknown): Promise<ServiceResult<unknown>>;
  
  /** Get all users */
  getAllUsers(): Promise<ServiceResult<unknown[]>>;
  
  /** Get user by ID */
  getUserById(id: string): Promise<ServiceResult<unknown>>;
  
  /** Update user */
  updateUser(input: unknown): Promise<ServiceResult<unknown>>;
  
  /** Delete user */
  deleteUser(id: string): Promise<ServiceResult<boolean>>;
  
  /** Enroll user in LMS */
  enrollUserInLMS(userId: string, lmsData: unknown): Promise<ServiceResult<unknown>>;
}

// ============================================================================
// Repository Interfaces
// ============================================================================

/**
 * Base repository interface for data access
 * Separates data access from business logic
 */
export interface IRepository<TDB extends BaseDBRecord> {
  /** Table name */
  readonly tableName: string;
  
  /** Find all records */
  findAll(filters?: unknown): Promise<TDB[]>;
  
  /** Find by ID */
  findById(id: number): Promise<TDB | null>;
  
  /** Create record */
  create(data: Omit<TDB, "id" | "created_at" | "updated_at">): Promise<TDB>;
  
  /** Update record */
  update(id: number, data: Partial<TDB>): Promise<TDB | null>;
  
  /** Delete record */
  delete(id: number): Promise<boolean>;
  
  /** Count records */
  count(filters?: unknown): Promise<number>;
  
  /** Check if exists */
  exists(id: number): Promise<boolean>;
}

/**
 * Repository with query building capabilities
 */
export interface IQueryBuilderRepository<TDB extends BaseDBRecord, TFilters> extends IRepository<TDB> {
  /** Build query with filters */
  buildQuery(baseQuery: string, filters: TFilters): { query: string; params: unknown[] };
  
  /** Execute raw query */
  executeQuery<T>(query: string): Promise<T[]>;
}

// ============================================================================
// Factory Interface
// ============================================================================

/**
 * Service factory interface
 * Creates service instances following Factory pattern
 */
export interface IServiceFactory {
  /** Get or create service instance */
  getService<T extends IService>(serviceName: string): T;
  
  /** Register a service */
  registerService<T extends IService>(serviceName: string, service: T): void;
  
  /** Check if service exists */
  hasService(serviceName: string): boolean;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if service implements ICrudService
 */
export function isCrudService(service: IService): service is ICrudService<BaseEntity, BaseDBRecord, BaseFilters> {
  return (
    "getAll" in service &&
    "getById" in service &&
    "create" in service &&
    "update" in service &&
    "delete" in service
  );
}

/**
 * Type guard to check if service implements ICacheable
 */
export function isCacheable(service: IService): service is ICacheable & IService {
  return (
    "getFromCache" in service &&
    "setCache" in service &&
    "invalidateCache" in service
  );
}

/**
 * Type guard to check if service implements ISearchable
 */
export function isSearchable(service: IService): service is ISearchable<BaseEntity, BaseFilters> & IService {
  return "search" in service && "advancedSearch" in service;
}

// Default export
export default {
  isCrudService,
  isCacheable,
  isSearchable,
};
