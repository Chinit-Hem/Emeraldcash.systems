/**
 * Base Repository Class - Repository Pattern Implementation
 *
 * Separates data access logic from business logic in services.
 * Provides a clean abstraction for database operations.
 *
 * Features:
 * - Generic type support for any entity type
 * - SQL injection protection via parameterized queries
 * - Query building utilities
 * - Transaction support hooks
 *
 * @module repositories/BaseRepository
 */

import { dbManager } from "@/lib/db-singleton";
import type { BaseDBRecord } from "@/services/BaseService";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Query result with metadata
 */
export interface QueryResult<T> {
  data: T[];
  rowCount: number;
  durationMs: number;
}

/**
 * Query options
 */
export interface QueryOptions {
  timeoutMs?: number;
  maxRetries?: number;
  operationName?: string;
}

/**
 * Filter operators for repository queries
 */
export type FilterOperator =
  | "eq" | "neq" | "gt" | "gte" | "lt" | "lte"
  | "like" | "ilike" | "in" | "nin" | "isNull" | "isNotNull";

/**
 * Filter condition
 */
export interface FilterCondition {
  column: string;
  operator: FilterOperator;
  value?: unknown;
}

/**
 * Query builder state
 */
export interface QueryBuilderState {
  where: string[];
  params: (string | number | null)[];
  paramIndex: number;
  orderBy: string[];
  limit?: number;
  offset?: number;
}

// ============================================================================
// Base Repository Class
// ============================================================================

export abstract class BaseRepository<TDB extends BaseDBRecord> {
  /** Database table name */
  protected abstract readonly tableName: string;

  /** Default query timeout */
  protected readonly DEFAULT_TIMEOUT_MS = 30000;

  /** Maximum retries for failed queries */
  protected readonly MAX_RETRIES = 2;

  /**
   * Execute raw SQL query with error handling
   */
  protected async executeQuery<T>(
    query: string,
    params: (string | number | null)[] = [],
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const timeoutMs = options.timeoutMs || this.DEFAULT_TIMEOUT_MS;
    const maxRetries = options.maxRetries || this.MAX_RETRIES;
    const operationName = options.operationName || `${this.tableName}.executeQuery`;

    try {
      // Use dbManager's built-in retry and timeout handling
      const result = await dbManager.executeUnsafe<T>(
        query,
        params,
        timeoutMs
      );

      return {
        data: result,
        rowCount: result.length,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Query failed";
      console.error(`[${operationName}] Query failed:`, {
        error: errorMessage,
        queryLength: query.length,
        durationMs: Date.now() - startTime, // This is for dbManager.query, not executeUnsafe.
      });
      throw error;
    }
  }

  /**
   * Find all records with optional filtering
   */
  public async findAll(
    filters?: FilterCondition[],
    orderBy?: { column: string; direction: "ASC" | "DESC" }[],
    limit?: number,
    offset?: number
  ): Promise<TDB[]> {
    let query = `SELECT * FROM ${this.tableName}`;
    const state: QueryBuilderState = {
      where: [],
      params: [],
      paramIndex: 1,
      orderBy: [],
    };

    // Apply filters
    if (filters && filters.length > 0) {
      for (const filter of filters) {
        const condition = this.buildFilterCondition(filter, state.paramIndex);
        if (condition) {
          state.where.push(condition.sql);
          if (condition.param !== undefined) {
            if (Array.isArray(condition.param)) {
              state.params.push(...condition.param);
              state.paramIndex += condition.param.length;
            } else {
              state.params.push(condition.param);
              state.paramIndex++;
            }
          }
        }
      }
    }

    if (state.where.length > 0) {
      query += ` WHERE ${state.where.join(" AND ")}`;
    }

    // Apply order by
    if (orderBy && orderBy.length > 0) {
      const orderClauses = orderBy.map(o => {
        const safeColumn = this.sanitizeColumnName(o.column);
        return safeColumn ? `${safeColumn} ${o.direction}` : "";
      }).filter(Boolean);

      if (orderClauses.length > 0) {
        query += ` ORDER BY ${orderClauses.join(", ")}`;
      }
    }

    // Corrected Pagination Algorithm: LIMIT and OFFSET should be independent
    if (limit !== undefined && limit !== null) {
      query += ` LIMIT $${state.paramIndex}`;
      state.params.push(limit);
      state.paramIndex++;
    }

    if (offset !== undefined && offset !== null) {
      query += ` OFFSET $${state.paramIndex}`;
      state.params.push(offset);
      state.paramIndex++;
    }

    const result = await this.executeQuery<TDB>(query, state.params, {
      operationName: `${this.tableName}.findAll`,
    });

    return result.data;
  }

  /**
   * Find single record by ID
   */
  public async findById(id: number): Promise<TDB | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;

    const result = await this.executeQuery<TDB>(query, [id], {
      operationName: `${this.tableName}.findById`,
    });

    return result.data[0] || null;
  }

  /**
   * Create new record
   */
  public async create(
    data: Omit<TDB, "id" | "created_at" | "updated_at">
  ): Promise<TDB> {
    const now = new Date().toISOString();

    // Build INSERT query
    const columns = Object.keys(data);
    const values = Object.values(data);

    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    const insertQuery = `
      INSERT INTO ${this.tableName} (${columns.join(", ")}${columns.length > 0 ? ', ' : ''}created_at, updated_at)
      VALUES (${placeholders}, NOW(), NOW())
      RETURNING *
    `;

    const result = await this.executeQuery<TDB>(insertQuery, values as (string | number | null)[], { // Pass parameters
      operationName: `${this.tableName}.create`,
    });

    return result.data[0];
  }

  /**
   * Update existing record
   */
  public async update(id: number, data: Partial<TDB>): Promise<TDB | null> {
    const now = new Date().toISOString();    const updates: string[] = []; // Array to hold "column = $N" clauses
    const params: (string | number | null)[] = []; // Array to hold parameter values
    let paramIndex = 1; // Start parameter index from 1

    for (const [key, value] of Object.entries(data)) { // Iterate over data to build update clauses
      if (key === "id" || key === "created_at" || key === "updated_at") continue; // Skip system fields

      const sanitizedKey = this.sanitizeColumnName(key); // Sanitize column name
      if (sanitizedKey) { // If column name is safe
        updates.push(`${sanitizedKey} = $${paramIndex}`); // Add update clause
        params.push(value as string | number | null); // Add value to parameters
        paramIndex++; // Increment parameter index
      }
    }

    if (updates.length === 0) { // If no fields to update
      throw new Error("No fields to update"); // Throw error
    }

    updates.push(`updated_at = NOW()`); // Always update updated_at

    const updateQuery = `
      UPDATE ${this.tableName}
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    params.push(id); // Add ID to parameters for WHERE clause
    const result = await this.executeQuery<TDB>(updateQuery, params, { // Pass parameters
      operationName: `${this.tableName}.update`,
    });

    return result.data[0] || null;
  }

  /**
   * Delete record
   */
  public async delete(id: number): Promise<boolean> {
    const deleteQuery = `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING id`;

    const result = await this.executeQuery<{ id: number }>(deleteQuery, [id], { // Pass parameters
      operationName: `${this.tableName}.delete`,
    });

    return result.rowCount > 0;
  }

  /**
   * Soft delete (set is_active = false)
   */
  public async softDelete(id: number): Promise<boolean> {
    const now = new Date().toISOString();
    const query = `
      UPDATE ${this.tableName}
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `;

    const result = await this.executeQuery<{ id: number }>(query, [id], {
      operationName: `${this.tableName}.softDelete`,
    });

    return result.rowCount > 0;
  }

  /**
   * Count records with optional filters
   */
  public async count(filters?: FilterCondition[]): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params: (string | number | null)[] = [];
    let paramIndex = 1;

    if (filters && filters.length > 0) {
      const conditions: string[] = [];

      for (const filter of filters) {
        const condition = this.buildFilterCondition(filter, paramIndex);
        if (condition) {
          conditions.push(condition.sql);
          if (condition.param !== undefined) {
            if (Array.isArray(condition.param)) {
              params.push(...condition.param);
              paramIndex += condition.param.length;
            } else {
              params.push(condition.param);
              paramIndex++;
            }
          }
        }
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
      }
    }

    const result = await this.executeQuery<{ count: string }>(query, params, {
      operationName: `${this.tableName}.count`,
    });

    return parseInt(result.data[0]?.count || "0");
  }

  /**
   * Check if record exists
   */
  public async exists(id: number): Promise<boolean> {
    const query = `SELECT 1 FROM ${this.tableName} WHERE id = $1 LIMIT 1`;

    const result = await this.executeQuery<Record<string, unknown>>(query, [id], {
      operationName: `${this.tableName}.exists`,
    });

    return result.rowCount > 0;
  }

  /**
   * Execute raw SQL within transaction context
   */
  public async executeRaw<T>(query: string): Promise<T[]> {
    const result = await this.executeQuery<T>(query, [], {
      operationName: `${this.tableName}.executeRaw`,
    });
    return result.data;
  }

  // ============================================================================
  // Protected Helper Methods
  // ============================================================================

  /**
   * Build filter condition SQL
   */
  protected buildFilterCondition(
    filter: FilterCondition,
    paramIndex: number
  ): { sql: string; param?: string | number | null | (string | number | null)[] } | null {
    const safeColumn = this.sanitizeColumnName(filter.column);
    if (!safeColumn) return null;

    switch (filter.operator) {
      case "eq":
        return { sql: `${safeColumn} = $${paramIndex}`, param: filter.value as string | number | null };
      case "neq":
        return { sql: `${safeColumn} != $${paramIndex}`, param: filter.value as string | number | null };
      case "gt":
        return { sql: `${safeColumn} > $${paramIndex}`, param: filter.value as number };
      case "gte":
        return { sql: `${safeColumn} >= $${paramIndex}`, param: filter.value as number };
      case "lt":
        return { sql: `${safeColumn} < $${paramIndex}`, param: filter.value as number };
      case "lte":
        return { sql: `${safeColumn} <= $${paramIndex}`, param: filter.value as number };
      case "like":
        return { sql: `${safeColumn} LIKE $${paramIndex}`, param: `%${filter.value}%` };
      case "ilike":
        return { sql: `${safeColumn} ILIKE $${paramIndex}`, param: `%${filter.value}%` };
      case "in":
        if (Array.isArray(filter.value)) {
          const expandedPlaceholders = filter.value.map((_, i) => `$${paramIndex + i}`).join(', ');
          return { sql: `${safeColumn} IN (${expandedPlaceholders})`, param: filter.value as (string | number | null)[] };
        }
        return { sql: `${safeColumn} IN ($${paramIndex})`, param: filter.value as string };
      case "isNull":
        return { sql: `${safeColumn} IS NULL` };
      case "isNotNull":
        return { sql: `${safeColumn} IS NOT NULL` };
      default:
        return null;
    }
  }

  /**
   * Sanitize column name to prevent SQL injection
   */
  protected sanitizeColumnName(columnName: string): string | null {
    // Only allow alphanumeric and underscore
    const sanitized = columnName.replace(/[^a-zA-Z0-9_]/g, "");
    return sanitized || null;
  }

}

// Default export
export default BaseRepository;
