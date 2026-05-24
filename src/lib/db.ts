/**
 * Database Module - Singleton Pattern Implementation
 * 
 * Refactored to use the DatabaseManager singleton from db-singleton.ts
 * for optimal connection pooling, retry logic, and performance.
 * 
 * This module provides SSR-ready database access with:
 * - Singleton connection management (prevents "too many clients" errors)
 * - Automatic retry logic with exponential backoff
 * - Connection health monitoring
 * - Type-safe query execution
 * 
 * @module db
 */

// Re-export everything from db-singleton to avoid duplication
export {
  dbManager,
  sql,
  queryWithRetry,
  testConnection,
  isDatabaseHealthy,
  getConnectionStats,
  resetConnection,
} from "@/lib/db-singleton";

// Re-export types from services
export type { 
  VehicleFilters, 
  VehicleStats, 
  PaginatedResult 
} from "@/systems/vms/services/VehicleService";

export type {
  ServiceResult
} from "@/shared/utils/services/BaseService";

// ============================================================================
// Legacy Compatibility Exports
// ============================================================================

import { dbManager } from "@/lib/db-singleton";

/**
 * Legacy connection stats (for backward compatibility)
 * @deprecated Use getConnectionStats() instead for more detailed metrics
 */
export function getLegacyConnectionStats() {
  const stats = dbManager.getStats();
  return {
    totalQueries: stats.totalQueries,
    failedQueries: stats.failedQueries,
    retriedQueries: 0, // Not tracked separately in new implementation
  };
}

/**
 * Reset legacy connection stats (no-op in new implementation)
 * @deprecated Connection stats are now managed by DatabaseManager
 */
export function resetConnectionStats(): void {
  // No-op: stats are managed internally by DatabaseManager
  // Deprecated function logging removed for production
}

// ============================================================================
// Default Export
// ============================================================================

export { sql as default } from "@/lib/db-singleton";
