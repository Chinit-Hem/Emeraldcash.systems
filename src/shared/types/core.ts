/**
 * Core shared types and interfaces
 * Single source of truth for common service types
 */

export interface BaseDBRecord {
  id: number | string;
  created_at: string;
  updated_at: string;
}

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface BaseFilters {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: "ASC" | "DESC";
  searchTerm?: string;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    durationMs: number;
    queryCount: number;
    cacheHit?: boolean;
  };
}

export interface ServiceError {
  code: string;
  message: string;
  details?: string;
  timestamp: string;
  operation?: string;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ServiceStats {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  averageResponseTimeMs: number;
}
