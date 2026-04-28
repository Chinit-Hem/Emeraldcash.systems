/**
 * SMS Asset Service - OOAD Implementation
 * 
 * Extends BaseService for SMS asset operations.
 * Implements singleton pattern matching VehicleService.
 * 
 * Features:
 * - Full CRUD for sms_assets table
 * - SMS-specific filtering (search, status, assigned_to)
 * - Transfer management (create, update status)
 * - Audit logging
 * - Compatible with existing API routes
 */

import { dbManager } from "@/lib/db-singleton";
import { getCache, setCache } from "@/lib/redis";
import type {
  SmsStatus, TransferStatus
} from "@/lib/sms-types";
import { BaseFilters, BaseService, ServiceResult } from "./BaseService";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * SMS Asset database record (snake_case from PostgreSQL)
 */
export interface SmsAssetDB {
  id: string;
  name: string;
  item_code: string | null;
  type: string;
  category: string | null;
  quantity: number | null;
  location: string | null;
  assigned_to: string | null;
  image_url: string | null;
  document_url: string | null;
  description: string | null;
  ref_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * SMS Asset entity (camelCase for frontend)
 */
export interface SmsAssetEntity {
  // BaseEntity properties
  id: string;
  createdAt: string;
  updatedAt: string;
  
  // SMS Asset properties
  name: string;
  itemCode: string | null;
  type: string;
  category: string | null;
  quantity: number | null;
  location: string | null;
  assignedTo: string | null;
  imageUrl: string | null;
  documentUrl: string | null;
  description: string | null;
  refId: string | null;
  status: SmsStatus;
}

/**
 * SMS Transfer entity
 */
export interface SmsTransferEntity {
  id: string;
  assetId: string;
  senderId: string;
  receiverId: string;
  location: string;
  status: TransferStatus;
  remark: string | null;
  createdAt: string;
  acceptedAt: string | null;
}

/**
 * SMS filters extending BaseFilters
 */
export interface SmsFilters extends BaseFilters {
  search?: string;
  status?: SmsStatus;
  assigned_to?: string;
  category?: string;
  assetId?: string;
}

/**
 * Paginated SMS result
 */
export interface PaginatedSmsResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// SMS Asset Service Singleton Class
// ============================================================================

export class SmsAssetService extends BaseService<SmsAssetEntity, SmsAssetDB> {
  private static instance: SmsAssetService | null = null;

  public readonly tableName = "sms_assets";

  private constructor() {
    super("SmsAssetService");
  }

  public static getInstance(): SmsAssetService {
    if (!SmsAssetService.instance) {
      SmsAssetService.instance = new SmsAssetService();
    }
    return SmsAssetService.instance;
  }

  /**
   * Build ILIKE pattern for case-insensitive partial matching
   * Escapes special SQL characters to prevent injection
   */
  public static buildIlikePattern(searchTerm: string): string {
    if (!searchTerm) return "%";
    const escaped = searchTerm
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
    return `%${escaped}%`;
  }

  // ============================================================================
  // Abstract Method Implementations
  // ============================================================================

  protected toEntity(dbAsset: SmsAssetDB): SmsAssetEntity {
    return {
      id: dbAsset.id.toString(),
      createdAt: dbAsset.created_at,
      updatedAt: dbAsset.updated_at || dbAsset.created_at,
      
      name: dbAsset.name,
      itemCode: dbAsset.item_code,
      type: dbAsset.type,
      category: dbAsset.category,
      quantity: dbAsset.quantity,
      location: dbAsset.location,
      assignedTo: dbAsset.assigned_to,
      imageUrl: dbAsset.image_url,
      documentUrl: dbAsset.document_url,
      description: dbAsset.description,
      refId: dbAsset.ref_id,
      status: dbAsset.status as SmsStatus,
    };
  }

  protected buildCacheKey(filters?: SmsFilters): string {
    if (!filters) return "sms-assets:all";
    const sortedFilters = Object.keys(filters)
      .sort()
      .reduce((acc, key) => {
        acc[key] = filters[key as keyof SmsFilters];
        return acc;
      }, {} as Record<string, unknown>);
    return `sms-assets:${JSON.stringify(sortedFilters)}`;
  }

  protected applyFilters(
    baseQuery: string,
    filters: SmsFilters,
    params: (string | number | null)[]
  ): { query: string; params: (string | number | null)[]; _paramIndex: number } {
    const conditions: string[] = [];

    let _query = baseQuery;
    let paramIndex = 1;

    // Search in name and description
    if (filters?.search) {
      const searchPattern = SmsAssetService.buildIlikePattern(filters.search);
      conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(searchPattern);
      paramIndex++;
    }

    // Status filter
    if (filters?.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    // Assigned to filter
    if (filters?.assigned_to) {
      conditions.push(`assigned_to ILIKE $${paramIndex}`);
      params.push(SmsAssetService.buildIlikePattern(filters.assigned_to));
      paramIndex++;
    }

    // Category filter
    if (filters?.category) {
      conditions.push(`category ILIKE $${paramIndex}`);
      params.push(SmsAssetService.buildIlikePattern(filters.category));
      paramIndex++;
    }

    // Asset ID filter (for transfers)
    if (filters?.assetId) {
      conditions.push(`sms_assets.id = $${paramIndex}`);
      params.push(filters.assetId);
      paramIndex++;
    }

    if (conditions.length > 0) {
      _query += ` WHERE ${conditions.join(" AND ")}`;
    }

    return { query: _query, params, _paramIndex: paramIndex };
  }

  /**
   * Get single asset by ID (string UUID)
   */
  public async getAsset(id: string): Promise<ServiceResult<SmsAssetEntity | null>> {
    const startTime = Date.now();
    try {
      const cacheKey = `${this.serviceName}:${id}`;
      const cached = await this.getFromCache<SmsAssetEntity>(cacheKey);
      if (cached) {
        return { success: true, data: cached, meta: { durationMs: 0, queryCount: 0, cacheHit: true } };
      }

      const result = await dbManager.executeUnsafe<SmsAssetDB>(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);
      if (result.length === 0) {
        return { success: false, error: `Record with id ${id} not found`, meta: { durationMs: Date.now() - startTime, queryCount: 1 } };
      }

      const entity = this.toEntity(result[0]);
      await this.setCache(cacheKey, entity);
      return { success: true, data: entity, meta: { durationMs: Date.now() - startTime, queryCount: 1 } };
    } catch (error) {
      return this.handleError(error, 'getAsset');
    }
  }

  /**
   * Update asset by string UUID
   */
  public async updateAsset(id: string, data: Partial<SmsAssetDB>): Promise<ServiceResult<SmsAssetEntity>> {
    const startTime = Date.now();
    try {
      const columns = Object.keys(data);
      if (columns.length === 0) {
        return { success: false, error: 'No fields to update', meta: { durationMs: 0, queryCount: 0 } };
      }

      const setClauses = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');
      const query = `UPDATE ${this.tableName} SET ${setClauses}, updated_at = NOW() WHERE id = $1 RETURNING *`;
      const values = [id, ...Object.values(data)];

      const result = await dbManager.executeUnsafe<SmsAssetDB>(query, values);
      if (result.length === 0) {
        return { success: false, error: `No record found with id ${id}`, meta: { durationMs: Date.now() - startTime, queryCount: 1 } };
      }

      const entity = this.toEntity(result[0]);
      this.invalidateCache();
      return { success: true, data: entity, meta: { durationMs: Date.now() - startTime, queryCount: 1 } };
    } catch (error) {
      return this.handleError(error, 'updateAsset');
    }
  }

  /**
   * Delete asset by string UUID
   */
  public async deleteAsset(id: string): Promise<ServiceResult<boolean>> {
    const startTime = Date.now();
    try {
      const query = `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`;
      const result = await dbManager.executeUnsafe(query, [id]);
      this.invalidateCache();
      return { success: true, data: result.length > 0, meta: { durationMs: Date.now() - startTime, queryCount: 1 } };
    } catch (error) {
      return this.handleError(error, 'deleteAsset');
    }
  }

  /**
   * Get assets with SMS-specific filters (used by API)
   */
  public async getAssets(filters?: SmsFilters): Promise<ServiceResult<SmsAssetEntity[]>> {
    return this.getAll(filters);
  }

  /**
   * Create new SMS asset (used by API)
   */
  public async createAsset(assetData: Omit<SmsAssetDB, "id" | "created_at" | "updated_at">): Promise<ServiceResult<SmsAssetEntity>> {
    const data: Omit<SmsAssetDB, "id" | "created_at" | "updated_at"> = { ...assetData, status: assetData.status || 'Available' };
    const result = await this.create(data);
    if (result.success) {
      await this.logAudit('system', 'create_asset', { assetId: result.data!.id, data: assetData.name || 'unknown' });
    }
    return result;
  }

  /**
   * Get SMS transfers with optional asset filter
   */
  public async getTransfers(assetId?: string): Promise<ServiceResult<SmsTransferEntity[]>> {
    const startTime = Date.now();
    try {
      let query = `
        SELECT 
          st.id, st.asset_id as "assetId", st.sender_id as "senderId", 
          st.receiver_id as "receiverId", st.location, st.status, st.remark,
          st.created_at as "createdAt", st.accepted_at as "acceptedAt"
        FROM sms_transfers st
      `;

      const params: string[] = [];
      let paramIndex = 1;

      if (assetId) {
        query += ` WHERE st.asset_id = $${paramIndex}`;
        params.push(assetId);
        paramIndex++;
      }

      query += ` ORDER BY st.created_at DESC`;

      // FIX: Don't append RETURNING * to a SELECT query
      const result = params.length
        ? await dbManager.executeUnsafe(query, params, 8000) as Array<Record<string, unknown>>
        : await dbManager.executeUnsafe(query, undefined, 8000) as Array<Record<string, unknown>>;
      
      const transfers: SmsTransferEntity[] = result.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        assetId: row.assetId as string,
        senderId: String(row.senderId || ''),
        receiverId: String(row.receiverId || ''),
        location: row.location as string,
        status: row.status as TransferStatus,
        remark: row.remark as string | null,
        createdAt: row.createdAt as string,
        acceptedAt: row.acceptedAt as string | null,
      }));

      return {
        success: true,
        data: transfers,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch transfers';
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Create transfer request
   */
  public async createTransfer(transferData: {
    assetId: string;
    senderId: string;
    receiverId: string;
    location: string;
    remark?: string;
  }): Promise<ServiceResult<SmsTransferEntity>> {
    const startTime = Date.now();
    try {
      const now = new Date().toISOString();

      const result = await dbManager.executeUnsafe(
        `INSERT INTO sms_transfers (id, asset_id, sender_id, receiver_id, location, status, remark, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'pending', $5, $6)
         RETURNING *`,
        [transferData.assetId, transferData.senderId, transferData.receiverId, transferData.location, transferData.remark || null, now],
        8000 // 8s timeout — safely under Vercel's 10s limit
      ) as Array<Record<string, unknown>>;

      const transfer = result[0] as Record<string, unknown>;
      const transferEntity: SmsTransferEntity = {
        id: transfer.id as string,
        assetId: transfer.asset_id as string,
        senderId: transfer.sender_id as string,
        receiverId: transfer.receiver_id as string,
        location: transfer.location as string,
        status: 'pending' as TransferStatus,
        remark: transfer.remark as string | null,
        createdAt: transfer.created_at as string,
        acceptedAt: null,
      };

      await this.logAudit(transferData.senderId, 'create_transfer', { transferId: transfer.id as string });

      return {
        success: true,
        data: transferEntity,
        meta: { durationMs: Date.now() - startTime, queryCount: 2 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create transfer';
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Update transfer status (accept/reject)
   */
  public async updateTransferStatus(
    transferId: string, 
    status: TransferStatus,
    userId: string
  ): Promise<ServiceResult<boolean>> {
    const startTime = Date.now();
    try {
      const result = await dbManager.executeUnsafe(
        `UPDATE sms_transfers
         SET status = $1,
             accepted_at = CASE WHEN $1 = 'accepted' THEN NOW() ELSE NULL END
         WHERE id = $2
         RETURNING id`,
        [status, transferId],
        8000
      ) as Array<Record<string, unknown>>;
      
      if (result.length === 0) {
        return {
          success: false,
          error: 'Transfer not found',
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }

      await this.logAudit(userId, 'update_transfer_status', { transferId, status });
      
      return {
        success: true,
        data: true,
        meta: { durationMs: Date.now() - startTime, queryCount: 2 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update transfer';
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Log audit trail
   */
  public async logAudit(
    userId: string,
    action: string,
    metadata: Record<string, string | number | null>
  ): Promise<void> {
    try {
      await dbManager.executeUnsafe(
        `INSERT INTO sms_audit_logs (user_id, action, metadata)
         VALUES ($1, $2, $3::jsonb)`,
        [userId, action, JSON.stringify(metadata)],
        5000 // 5s timeout — non-critical, fail fast
      );
    } catch (error) {
      console.error('[SmsAssetService.logAudit] Failed to log audit:', error);
    }
  }

  /**
   * Get SMS asset stats (inventory counts) - FIXED: Pure SMS stats, no vehicle pricing
   */
  public async getAssetStats(): Promise<ServiceResult<Record<string, number>>> {
    const cacheKey = 'sms:stats';
    const startTime = Date.now();

    try {
      // Try Redis cache first (5min TTL)
      const cached = await getCache(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached as Record<string, number>,
          meta: { durationMs: 1, queryCount: 0, cacheHit: true }
        };
      }

      // Parameterized queries via template literals - type assertion fixed
      const assetsResult = await dbManager.execute`SELECT status, COUNT(*)::integer as count FROM sms_assets GROUP BY status`;
      const pendingResult = await dbManager.execute`SELECT COALESCE(COUNT(*), 0)::integer as count FROM sms_transfers WHERE status = 'pending'`;
      const assetsStats = assetsResult as Array<{status: string; count: number}>;
      const pendingStats = pendingResult as Array<{count: number}>;

      // Defensive parsing
      const statusCounts: Record<string, number> = {};
      for (const row of assetsStats) {
        const status = row.status;
        const count = row.count || 0;
        statusCounts[status] = count;
      }

      const pendingCount = pendingStats[0]?.count || 0;

      // Count assets created today for "todayChange" stat
      const todayResult = await dbManager.execute`SELECT COUNT(*)::integer as count FROM sms_assets WHERE created_at >= CURRENT_DATE` as Array<{count: number}>;
      const todayChange = todayResult[0]?.count || 0;

      const stats: Record<string, number> = {
        totalAssets: (statusCounts.Available || 0) + (statusCounts['In Use'] || 0) + (statusCounts.Borrowed || 0),
        available: statusCounts.Available || 0,
        inUse: statusCounts['In Use'] || 0,
        borrowed: statusCounts.Borrowed || 0,
        pendingTransfers: pendingCount,
        todayChange,
      };

      // Cache in Redis (5min)
      await setCache(cacheKey, stats, 300);

      return {
        success: true,
        data: stats,
        meta: { durationMs: Date.now() - startTime, queryCount: 3, cacheHit: false }
      };

    } catch (error) {
      console.error('[SMS Stats] DB Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch SMS stats',
        meta: { durationMs: Date.now() - startTime, queryCount: 0 }
      };
    }
  }



  public async getAssetHistory(assetId: string): Promise<ServiceResult<Record<string, unknown>>> {
    const startTime = Date.now();
    try {
      // Get asset info
      const assetResult = await dbManager.execute`
        SELECT name FROM sms_assets WHERE id = ${assetId}
      ` as Array<Record<string, string>>;
      const assetName = assetResult[0]?.name || 'Unknown';

      // Get transfers
      const transfersResult = await dbManager.execute`
        SELECT 
          'transfer' as type,
          id, asset_id as assetId, sender_id as senderId, 
          receiver_id as receiverId, location, status, remark as description,
          created_at as timestamp, accepted_at
        FROM sms_transfers 
        WHERE asset_id = ${assetId}
        ORDER BY created_at DESC
      ` as Array<Record<string, unknown>>;

      // Get audits
      const auditsResult = await dbManager.execute`
        SELECT 
          'audit' as type,
          id, user_id, action as description, metadata,
          created_at as timestamp
        FROM sms_audit_logs 
        WHERE (metadata->>'assetId') = ${assetId}
          OR metadata @> ${`{ "assetId": "${assetId}" }`}::jsonb
        ORDER BY created_at DESC
      ` as Array<Record<string, unknown>>;

      // Combine and sort by timestamp DESC
      const events = [
        ...transfersResult.map((t) => ({
          type: t.type as string,
          id: t.id as string,
          assetId: t.assetId as string,
        userId: String(t.senderId || t.receiverId || ''),
          description: t.description as string,
          location: t.location as string,
          status: t.status as string,
          timestamp: t.timestamp as string,
          acceptedAt: t.acceptedAt as string | null,
          metadata: t.metadata,
        })),
        ...auditsResult.map((a) => ({
          type: a.type as string,
          id: a.id as string,
          assetId,
          userId: String(a.user_id || ''),
          description: a.description as string,
          timestamp: a.timestamp as string,
          metadata: a.metadata,
        }))
      ].sort((a, b) => new Date(b.timestamp as string).getTime() - new Date(a.timestamp as string).getTime());

      return {
        success: true,
        data: {
          assetId,
          assetName,
          totalEvents: events.length,
          events
        },
        meta: { durationMs: Date.now() - startTime, queryCount: 3 }
      };
    } catch (error) {
      console.error('[getAssetHistory] Error:', error);
      return {
        success: false,
        error: 'Failed to fetch asset history',
        meta: { durationMs: Date.now() - startTime, queryCount: 3 }
      };
    }
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

/**
 * Singleton SMS service instance
 * Import this for all SMS operations
 */
export const smsService = SmsAssetService.getInstance();
