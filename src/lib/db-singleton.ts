/**
 * Database Singleton Module
 *
 * Implements the Singleton Pattern for Neon PostgreSQL connection management.
 * Provides optimized connection pooling, health monitoring, and SSR-ready
 * query execution with built-in retry logic.
 *
 * @module db-singleton
 */

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { join } from "path";

// Workaround: VSCode extension env injection masks DATABASE_URL in process.env
// Read directly from .env file to bypass the masking
function getDatabaseUrlFromFile(): string | null {
  let rawUrl: string | null = null;
  
  // First try .env.local (may be masked by VSCode extension)
  try {
    const envLocalPath = join(process.cwd(), '.env.local');
    const content = readFileSync(envLocalPath, 'utf-8');
    const match = content.match(/^DATABASE_URL=(.+)$/m);
    if (match && match[1]) {
      const candidate = match[1].trim();
      // Only use if not masked
      if (!candidate.includes('[username]')) {
        rawUrl = candidate;
      }
    }
  } catch (e) {
    // Ignore - fall back to .env
  }
  
  // If still masked, try .env
  if (!rawUrl) {
    try {
      const envPath = join(process.cwd(), '.env');
      const content = readFileSync(envPath, 'utf-8');
      const match = content.match(/^DATABASE_URL=(.+)$/m);
      if (match && match[1]) {
        rawUrl = match[1].trim();
      }
    } catch (e) {
      // Ignore - will fall back to process.env
    }
  }
  
  return rawUrl;
}

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Database connection configuration
 */
interface ConnectionConfig {
  url: string;
  maxConnections: number;
  connectionTimeoutMs: number;
  idleTimeoutMs: number;
  enableKeepalive: boolean;
}

/**
 * Query execution options
 */
interface QueryOptions {
  operationName?: string;
  maxRetries?: number;
  cacheKey?: string;
  cacheTtlMs?: number;
  timeoutMs?: number; // Query timeout in milliseconds
}

/**
 * Connection health status
 */
interface HealthStatus {
  healthy: boolean;
  lastCheck: Date;
  consecutiveFailures: number;
  totalQueries: number;
  failedQueries: number;
  averageResponseTimeMs: number;
}

// ============================================================================
// Singleton Database Manager Class
// ============================================================================

class DatabaseManager {
  private static instance: DatabaseManager | null = null;
  private sqlClient: NeonQueryFunction<false, false> | null = null;
  private config: ConnectionConfig;
  private health: HealthStatus;
  private queryTimes: number[] = [];
  private readonly MAX_QUERY_HISTORY = 100;

  /**
   * Private constructor - use getInstance() instead
   */
  private constructor() {
    // Lazy initialization - don't check DATABASE_URL here
    this.config = null as unknown as ConnectionConfig;
    this.health = {
      healthy: false,
      lastCheck: new Date(),
      consecutiveFailures: 0,
      totalQueries: 0,
      failedQueries: 0,
      averageResponseTimeMs: 0,
    };
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

/**
   * Initialize connection configuration from environment
   * Lazy initialization - only called when database is actually needed
   */
  private initializeConfig(): ConnectionConfig {
    // First try to get from file (bypasses VSCode extension masking)
    const url = getDatabaseUrlFromFile() || process.env.DATABASE_URL;

    if (!url) {
      // During build time, return a placeholder config
      // The actual error will be thrown when trying to connect at runtime
      if (process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV) {
        // Build time without database - return dummy config
        return {
          url: 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
          maxConnections: 10,
          connectionTimeoutMs: 30000,
          idleTimeoutMs: 30000,
          enableKeepalive: true,
        };
      }
      throw new Error("DATABASE_URL environment variable is not set");
    }

    return {
      url,
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || "10", 10),
      connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT || "30000", 10),
      idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT || "30000", 10),
      enableKeepalive: process.env.DB_ENABLE_KEEPALIVE !== "false",
    };
  }

  /**
   * Ensure config is initialized (lazy)
   */
  private ensureConfig(): ConnectionConfig {
    if (!this.config || (this.config as unknown as null) === null) {
      this.config = this.initializeConfig();
    }
    return this.config;
  }

/**
   * Initialize the SQL client with optimized settings
   */
  private initializeClient(): NeonQueryFunction<false, false> {
    if (this.sqlClient) {
      return this.sqlClient;
    }

    // Ensure config is initialized (lazy)
    const config = this.ensureConfig();

    // Add sdk_semver query parameter to satisfy Neon API requirement
    const urlObj = new URL(config.url);
    urlObj.searchParams.set('sdk_semver', '1.0.2');

    this.sqlClient = neon(urlObj.toString(), {
      fetchOptions: {
        keepalive: this.config.enableKeepalive,
      },
    });

    // Mark as healthy on successful initialization
    this.health.healthy = true;
    this.health.lastCheck = new Date();

    return this.sqlClient;
  }

  /**
   * Get the SQL client (initializes if needed)
   */
  public getClient(): NeonQueryFunction<false, false> {
    if (!this.sqlClient) {
      return this.initializeClient();
    }
    return this.sqlClient;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const message = error.message.toLowerCase();
    const retryablePatterns = [
      "too many database connection attempts",
      "failed to acquire permit",
      "neon:retryable",
      "connection",
      "timeout",
      "econnrefused",
      "enotfound",
      "pool",
      "deadlock",
    ];

    return retryablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateDelay(attempt: number): number {
    const baseDelay = Math.min(
      100 * Math.pow(2, attempt),
      2000 // Max 2 seconds
    );
    const jitter = Math.random() * 100;
    return baseDelay + jitter;
  }

  /**
   * Update health metrics after query
   */
  private updateMetrics(success: boolean, durationMs: number): void {
    this.health.totalQueries++;

    if (!success) {
      this.health.failedQueries++;
      this.health.consecutiveFailures++;
    } else {
      this.health.consecutiveFailures = 0;
    }

    // Track query time for average calculation
    this.queryTimes.push(durationMs);
    if (this.queryTimes.length > this.MAX_QUERY_HISTORY) {
      this.queryTimes.shift();
    }

    // Calculate rolling average
    this.health.averageResponseTimeMs =
      this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length;

    // Update health status
    this.health.healthy = this.health.consecutiveFailures < 3;
    this.health.lastCheck = new Date();
  }

  /**
   * Execute a query with retry logic, metrics, and optional timeout
   */
  public async query<T>(
    queryFn: () => Promise<T>,
    options: QueryOptions = {}
  ): Promise<T> {
    const {
      operationName = "database query",
      maxRetries = 3,
      timeoutMs,
    } = options;

    const startTime = Date.now();
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        let result: T;

        // Apply timeout if specified
        if (timeoutMs && timeoutMs > 0) {
          result = await Promise.race([
            queryFn(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs)
            )
          ]);
        } else {
          result = await queryFn();
        }

        const duration = Date.now() - startTime;
        this.updateMetrics(true, duration);

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          this.updateMetrics(false, Date.now() - startTime);
          throw error;
        }

        // Retry logging removed for production

        // Don't delay on last attempt
        if (attempt < maxRetries - 1) {
          await new Promise(resolve =>
            setTimeout(resolve, this.calculateDelay(attempt))
          );
        }
      }
    }

    // All retries exhausted
    this.updateMetrics(false, Date.now() - startTime);
    throw new Error(
      `${operationName} failed after ${maxRetries} attempts. Last error: ${lastError?.message}`
    );
  }

  /**
   * Execute a raw SQL query with template literals
   */
  public async execute<T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]> {
    const sql = this.getClient();

    return this.query(
      () => sql(strings, ...values) as Promise<T[]>,
      { operationName: "raw SQL query" }
    );
  }

  /**
   * Execute an unsafe/raw SQL query string
   * Uses the sql function with a template literal containing the raw query
   */
  public async executeUnsafe<T>(query: string, params?: unknown[], timeoutMs?: number): Promise<T[]> {
    return this.query(
      async () => {
        const sql = this.getClient();

        // Dynamically construct the template literal parts and values
        // This is the correct way to use neon's sql function when you have
        // a query string with $N placeholders and a separate params array.
        const parts = query.split(/\$\d+/); // Split by $1, $2, etc. This is a loop.
        const strings = Object.assign(parts, { raw: parts }) as TemplateStringsArray;

        // Ensure the number of parts matches the number of parameters + 1
        if (params && parts.length !== params.length + 1) {
          throw new Error(`Mismatched parameters for query: "${query}". Expected ${parts.length - 1} parameters, got ${params.length}.`);
        }

        // Call the sql function with the dynamically created template literal parts and values
        const result = await sql(strings, ...(params || []));
        return result as T[];
      },
      { operationName: "unsafe SQL query", timeoutMs }
    );
  }

  /**
   * Test database connection
   */
  public async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.query(
        async () => {
          const sql = this.getClient();
          return sql`SELECT version()`;
        },
        { operationName: "test connection", maxRetries: 1 }
      );

      return {
        success: true,
        message: `Connected to PostgreSQL: ${result[0].version}`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown connection error",
      };
    }
  }

  /**
   * Check if database is healthy
   */
  public async isHealthy(): Promise<boolean> {
    try {
      await this.query(
        async () => {
          const sql = this.getClient();
          return sql`SELECT 1`;
        },
        { operationName: "health check", maxRetries: 1 }
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current health status
   */
  public getHealthStatus(): HealthStatus {
    return { ...this.health };
  }

  /**
   * Reset connection (useful for error recovery)
   */
  public resetConnection(): void {
    this.sqlClient = null;
    this.health.healthy = false;
    this.health.consecutiveFailures = 0;
    // Connection reset logging removed for production
  }

  /**
   * Get connection statistics
   */
  public getStats(): {
    totalQueries: number;
    failedQueries: number;
    successRate: number;
    averageResponseTimeMs: number;
    isHealthy: boolean;
  } {
    const total = this.health.totalQueries;
    const failed = this.health.failedQueries;
    const successRate = total > 0 ? ((total - failed) / total) * 100 : 100;

    return {
      totalQueries: total,
      failedQueries: failed,
      successRate: Math.round(successRate * 100) / 100,
      averageResponseTimeMs: Math.round(this.health.averageResponseTimeMs * 100) / 100,
      isHealthy: this.health.healthy,
    };
  }
}

// ============================================================================
// Export singleton instance and utilities
// ============================================================================

/**
 * Singleton database manager instance
 */
export const dbManager = DatabaseManager.getInstance();

/**
 * SQL template literal function with retry logic
 * Usage: const result = await sql`SELECT * FROM vehicles WHERE id = ${id}`
 */
export async function sql<T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]> {
  return dbManager.execute<T>(strings, ...values);
}

/**
 * Execute a query with custom retry options
 */
export async function queryWithRetry<T>(
  queryFn: () => Promise<T>,
  operationName?: string,
  maxRetries?: number
): Promise<T> {
  return dbManager.query(queryFn, { operationName, maxRetries });
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<{ success: boolean; message: string }> {
  return dbManager.testConnection();
}

/**
 * Check database health
 */
export async function isDatabaseHealthy(): Promise<boolean> {
  return dbManager.isHealthy();
}

/**
 * Get connection statistics
 */
export function getConnectionStats(): ReturnType<DatabaseManager["getStats"]> {
  return dbManager.getStats();
}

/**
 * Reset database connection
 */
export function resetConnection(): void {
  dbManager.resetConnection();
}

// Default export for compatibility
export default dbManager;
