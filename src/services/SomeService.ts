import type { BaseFilters } from '@/types/core';
import { BaseService, ServiceResult } from './BaseService';
import type { ICrudService } from './interfaces';

// ============================================================================
// Types for SomeService (generic resource example)
// ============================================================================

export interface SomeDB {
  id: number;
  name: string;
  description: string | null;
  status: 'active' | 'inactive';
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SomeEntity {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'inactive';
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// SomeService - Production-ready example implementing ICrudService
// ============================================================================

export class SomeService extends BaseService<SomeEntity, SomeDB> {
  private static instance: SomeService | null = null;

  private constructor() {
    super('SomeService');
  }

  public readonly tableName = 'some_table';

  public static getInstance(): SomeService {
    if (!SomeService.instance) {
      SomeService.instance = new SomeService();
    }
    return SomeService.instance;
  }

  protected toEntity(dbRecord: SomeDB): SomeEntity {
    return {
      id: String(dbRecord.id),
      name: dbRecord.name,
      description: dbRecord.description,
      status: dbRecord.status,
      metadata: dbRecord.metadata,
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
    };
  }

  protected buildCacheKey(filters?: Record<string, unknown>): string {
    return `some-resource:${JSON.stringify(filters || {})}`;
  }

  protected applyFilters(
    baseQuery: string,
    filters: Record<string, unknown>,
    params: (string | number | null)[]
  ): { query: string; params: (string | number | null)[]; _paramIndex: number } {
    // Minimal implementation - override in subclasses for specific filtering
    const conditions: string[] = [];
    let _paramIndex = 1;

    // Example: filter by status
    if (filters.status) {
      conditions.push(`status = $${_paramIndex}`);
      params.push(filters.status as string);
      _paramIndex++;
    }

    // Example: filter by name
    if (filters.name) {
      conditions.push(`name ILIKE $${_paramIndex}`);
      params.push(`%${(filters.name as string).replace(/%/g, '\\%').replace(/_/g, '\\_')}%`);
      _paramIndex++;
    }

    let query = baseQuery;
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    return { query, params, _paramIndex };
  }

  // In production: BaseService handles actual DB queries
  // This follows exact VehicleService pattern with required abstract implementation
}

export const someService = SomeService.getInstance();

