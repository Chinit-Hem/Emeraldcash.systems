/**
 * BaseService Abstract Class - OOAD Implementation
 * 
 * Provides foundation for all service layer classes using:
 * - Template Method Pattern for extensible CRUD operations
 * - Generic types for type safety
 * 
 * @template TEntity - API response entity type (extends BaseEntity)
 * @template TDBRecord - Database record type (extends BaseDBRecord)
 * @template TFilters - Filter type (extends BaseFilters)
 */

import type { ServiceResult, BaseEntity, BaseDBRecord, BaseFilters } from '@/types/core';
import { dbManager } from '@/lib/db-singleton';
import { getCache, setCache } from '@/lib/redis';

// ============================================================================
// Types
// ============================================================================

export type { ServiceResult, BaseFilters, BaseEntity, BaseDBRecord };

// ============================================================================
// BaseService Abstract Class
// ============================================================================

export abstract class BaseService<
  TEntity extends BaseEntity,
  TDBRecord extends BaseDBRecord,
  TFilters extends BaseFilters = BaseFilters
> {
  /** Service name for logging and identification */
  public readonly serviceName: string;
  /** Table name - MUST be implemented by subclasses */
  public abstract readonly tableName: string;

  private stats = {
    totalQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageResponseTimeMs: 0,
  };

  protected constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  // ============================================================================
  // Abstract Methods - MUST be implemented by subclasses
  // ============================================================================

  /**
   * Convert raw DB record to Entity (business logic)
   */
  protected abstract toEntity(dbRecord: TDBRecord): TEntity;

  /**
   * Build cache key from filters (can be overridden)
   */
  protected buildCacheKey(filters?: TFilters): string {
    if (!filters) return `${this.serviceName}:all`;
    const sortedFilters = Object.keys(filters)
      .sort()
      .reduce((acc, key) => {
        acc[key] = filters[key as keyof TFilters];
        return acc;
      }, {} as Record<string, unknown>);
    return `${this.serviceName}:${JSON.stringify(sortedFilters)}`;
  }

  /**
   * Apply service-specific filters to SQL query
   */
  protected applyFilters(
    baseQuery: string,
    filters: TFilters,
    params: (string | number | null)[]
  ): { query: string; params: (string | number | null)[]; _paramIndex: number } {
    const conditions: string[] = [];
    let _paramIndex = params.length + 1;

    // Default limit/offset
    if (filters.limit) {
      conditions.push(`LIMIT $${_paramIndex}`);
      params.push(filters.limit);
      _paramIndex++;
    }
    if (filters.offset) {
      conditions.push(`OFFSET $${_paramIndex}`);
      params.push(filters.offset);
      _paramIndex++;
    }

    // Default searchTerm
    if (filters.searchTerm) {
      conditions.push(`(brand ILIKE $${_paramIndex} OR model ILIKE $${_paramIndex})`);
      params.push(`%${filters.searchTerm}%`);
      _paramIndex++;
    }

    let query = baseQuery;
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    return { query, params, _paramIndex };
  }

  // ============================================================================
  // CRUD Operations (Template Methods)
  // ============================================================================

  /**
   * Get all records with filtering, pagination, caching
   */
  public async getAll(filters?: TFilters): Promise<ServiceResult<TEntity[]>> {
    const startTime = Date.now();
    try {
      const cacheKey = this.buildCacheKey(filters);
      const cached = await this.getFromCache<TEntity[]>(cacheKey);
      if (cached) {
        this.stats.cacheHits++;
        return {
          success: true,
          data: cached,
          meta: { durationMs: 0, queryCount: 0, cacheHit: true },
        };
      }

      this.stats.cacheMisses++;
      let query = `SELECT * FROM ${this.tableName}`;
      let params: (string | number | null)[] = [];

      const filterResult = this.applyFilters(query, filters || {} as TFilters, params);
      query = filterResult.query;
      params = filterResult.params;

      const dbResult = await dbManager.executeUnsafe<TDBRecord>(query, params);
      const entities = dbResult.map(record => this.toEntity(record));

      await this.setCache(cacheKey, entities, 30000); // 30s TTL

      this.stats.totalQueries++;

      return {
        success: true,
        data: entities,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      return this.handleError(error, 'getAll');
    }
  }

  /**
   * Get single record by ID
   */
  public async getById(id: number): Promise<ServiceResult<TEntity>> {
    const startTime = Date.now();
    try {
      const cacheKey = `${this.serviceName}:${id}`;
      const cached = await this.getFromCache<TEntity>(cacheKey);
      if (cached) {
        this.stats.cacheHits++;
        return {
          success: true,
          data: cached,
          meta: { durationMs: 0, queryCount: 0, cacheHit: true },
        };
      }

      const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
      const result = await dbManager.executeUnsafe<TDBRecord>(query, [id]);

      if (result.length === 0) {
        return {
          success: false,
          error: `Record with id ${id} not found`,
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }

      const entity = this.toEntity(result[0]);
      await this.setCache(cacheKey, entity);

      this.stats.totalQueries++;

      return {
        success: true,
        data: entity,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      return this.handleError(error, 'getById');
    }
  }

  /**
   * Create new record
   */
  public async create(data: Omit<TDBRecord, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceResult<TEntity>> {
    const startTime = Date.now();
    try {
      const columns = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map((_, i) => `$${i + 1}`).join(', ');
      const query = `
        INSERT INTO ${this.tableName} (${columns})
        VALUES (${placeholders})
        RETURNING *
      `;
      
      const result = await dbManager.executeUnsafe<TDBRecord>(query, Object.values(data) as any[]);

      if (result.length === 0) {
        return {
          success: false,
          error: 'Failed to create record',
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }

      const entity = this.toEntity(result[0]);
      this.invalidateCache(); // Clear list caches

      this.stats.totalQueries++;

      return {
        success: true,
        data: entity,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      return this.handleError(error, 'create');
    }
  }

  /**
   * Update existing record
   */
  public async update(id: number, data: Partial<TDBRecord>): Promise<ServiceResult<TEntity>> {
    const startTime = Date.now();
    try {
      const updates = Object.keys(data)
        .map((key, i) => `${key} = $${i + 2}`)
        .join(', ');
      
      const query = `
        UPDATE ${this.tableName}
        SET ${updates}, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await dbManager.executeUnsafe<TDBRecord>(query, [id, ...Object.values(data) as any[]]);

      if (result.length === 0) {
        return {
          success: false,
          error: `No record found with id ${id}`,
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }

      const entity = this.toEntity(result[0]);
      this.invalidateCache();

      this.stats.totalQueries++;

      return {
        success: true,
        data: entity,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      return this.handleError(error, 'update');
    }
  }

  /**
   * Delete record
   */
  public async delete(id: number): Promise<ServiceResult<boolean>> {
    const startTime = Date.now();
    try {
      const query = `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`;
      const result = await dbManager.executeUnsafe(query, [id]);

      this.invalidateCache();

      this.stats.totalQueries++;

      return {
        success: true,
        data: result.length > 0,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      return this.handleError(error, 'delete');
    }
  }

  // ============================================================================
  // Cache Operations
  // ============================================================================

  public async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const value = await getCache(key);
      return value as T | null;
    } catch {
      return null;
    }
  }

  public async setCache<T>(key: string, data: T, ttlMs: number = 30000): Promise<void> {
    try {
      await setCache(key, data, Math.floor(ttlMs / 1000));
    } catch (error) {
      console.warn(`[${this.serviceName}] Cache set failed:`, error);
    }
  }

  public invalidateCache(key?: string): void {
    // Implement pattern-based invalidation if needed
    if (key) {
      try {
        // Redis delete pattern or specific key
      } catch {}
    } else {
      // Clear all service caches in production implementation
    }
  }

  // ============================================================================
  // Stats & Utils
  // ============================================================================

  public getStats() {
    return this.stats;
  }

  public resetStats() {
    this.stats = {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTimeMs: 0,
    };
  }

  protected handleError(error: unknown, operation: string): ServiceResult<never> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${this.serviceName}.${operation}] Error:`, errorMessage);
    return {
      success: false,
      error: errorMessage,
      meta: { durationMs: 0, queryCount: this.stats.totalQueries },
    };
  }

  public clearCache(): void {
    this.invalidateCache();
    this.stats.cacheMisses = 0;
    this.stats.cacheHits = 0;
  }
}

