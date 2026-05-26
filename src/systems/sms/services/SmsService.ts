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
import { delCache, getCache, setCache } from "@/lib/redis";
import {
  timestampWithoutTimeZoneToCambodiaIso,
  timestampWithoutTimeZoneToUtcIso,
  toIsoInstantString,
} from "@/shared/utils/cambodiaTime";
import type {
  SmsStatus, TransferStatus
} from "@/systems/sms/types/sms-types";
import { BaseFilters, BaseService, ServiceResult } from "@/shared/utils/services/BaseService";
import { vehicleService } from "@/systems/vms/services/VehicleService";

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
  imageUrl?: string | null;
  createdAt: string;
  acceptedAt: string | null;
}

export interface SmsNotificationEntity {
  id: number;
  type: string;
  title: string;
  message: string;
  recipientId: string;
  actorId: string | null;
  assetId: string | null;
  transferId: string | null;
  readAt: string | null;
  createdAt: string;
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

interface SmsHistoryVisibility {
  username: string;
  isAdmin: boolean;
}

interface SmsNotificationDB {
  id: number;
  type: string;
  title: string;
  message: string;
  recipient_id: string;
  actor_id: string | null;
  asset_id: string | null;
  transfer_id: string | null;
  read_at: string | null;
  created_at: string;
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

  private async ensureNotificationsTable(): Promise<void> {
    await dbManager.executeUnsafe(
      `
        CREATE TABLE IF NOT EXISTS sms_notifications (
          id SERIAL PRIMARY KEY,
          type VARCHAR(64) NOT NULL,
          title VARCHAR(200) NOT NULL,
          message TEXT NOT NULL,
          recipient_id VARCHAR(128) NOT NULL,
          actor_id VARCHAR(128),
          asset_id UUID,
          transfer_id UUID,
          read_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `,
      [],
      5000
    );

    await dbManager.executeUnsafe(
      `CREATE INDEX IF NOT EXISTS idx_sms_notifications_recipient_read ON sms_notifications(recipient_id, read_at, created_at DESC)`,
      [],
      5000
    );
  }

  private async getAdminNotificationRecipients(): Promise<string[]> {
    try {
      const rows = await dbManager.executeUnsafe<{ username: string }>(
        `SELECT username FROM users WHERE role = 'Admin' ORDER BY username`,
        [],
        5000
      );
      const recipients = rows
        .map((row) => row.username?.trim())
        .filter((username): username is string => Boolean(username));
      const uniqueRecipients = [...new Set(recipients)];

      return uniqueRecipients.length > 0 ? uniqueRecipients : ["admin"];
    } catch (error) {
      console.error("[SmsAssetService.getAdminNotificationRecipients] Error:", error);
      return ["admin"];
    }
  }

  private async markRequestNotificationsRead(transferId: string): Promise<void> {
    try {
      await this.ensureNotificationsTable();
      await dbManager.executeUnsafe(
        `
          UPDATE sms_notifications
          SET read_at = COALESCE(read_at, NOW())
          WHERE transfer_id = $1::uuid
            AND type IN ('transfer_request', 'return_request')
            AND read_at IS NULL
        `,
        [transferId],
        5000
      );
    } catch (error) {
      console.error("[SmsAssetService.markRequestNotificationsRead] Error:", error);
    }
  }

  private async ensureTransferImagesTable(): Promise<void> {
    await dbManager.executeUnsafe(
      `
        CREATE TABLE IF NOT EXISTS sms_transfer_images (
          id SERIAL PRIMARY KEY,
          transfer_id UUID NOT NULL REFERENCES sms_transfers(id) ON DELETE CASCADE,
          image_url VARCHAR(512) NOT NULL
        )
      `,
      [],
      5000
    );

    await dbManager.executeUnsafe(
      `CREATE INDEX IF NOT EXISTS idx_sms_transfer_images_transfer_id ON sms_transfer_images(transfer_id)`,
      [],
      5000
    );
  }

  private toNotificationEntity(row: SmsNotificationDB): SmsNotificationEntity {
    return {
      id: Number(row.id),
      type: row.type,
      title: row.title,
      message: row.message,
      recipientId: row.recipient_id,
      actorId: row.actor_id,
      assetId: row.asset_id,
      transferId: row.transfer_id,
      readAt: row.read_at ? toIsoInstantString(row.read_at) : null,
      createdAt: toIsoInstantString(row.created_at),
    };
  }

  private async getAssetName(assetId: string): Promise<string> {
    const rows = await dbManager.executeUnsafe<{ name: string }>(
      `SELECT name FROM sms_assets WHERE id = $1::uuid LIMIT 1`,
      [assetId],
      5000
    );

    return rows[0]?.name || "SMS asset";
  }

  private getStockModelKey(asset: { id: string; item_code: string | null }): string {
    return asset.item_code?.trim() || `sms_asset_${asset.id}`;
  }

  private async ensureAssetStockRecord(
    assetId: string,
    location: string,
    reason: string
  ): Promise<void> {
    try {
      const rows = await dbManager.executeUnsafe<{
        id: string;
        name: string;
        item_code: string | null;
        type: string | null;
        category: string | null;
        status: string | null;
        location: string | null;
      }>(
        `
          SELECT id, name, item_code, type, category, status, location
          FROM sms_assets
          WHERE id = $1::uuid
          LIMIT 1
        `,
        [assetId],
        5000
      );
      const asset = rows[0];
      if (!asset) return;

      const result = await vehicleService.ensureStockItem({
        modelKey: this.getStockModelKey(asset),
        location: location || asset.location || "Stock",
        brand: asset.type || "SMS",
        model: asset.name,
        condition: asset.status || "Available",
        color: asset.category || "",
        quantity: 1,
      });

      if (!result.success) {
        console.error("[SmsAssetService.ensureAssetStockRecord] Failed:", {
          assetId,
          location,
          reason,
          error: result.error,
        });
      }
    } catch (error) {
      console.error("[SmsAssetService.ensureAssetStockRecord] Error:", error);
    }
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
      createdAt: timestampWithoutTimeZoneToUtcIso(dbAsset.created_at),
      updatedAt: timestampWithoutTimeZoneToUtcIso(dbAsset.updated_at || dbAsset.created_at),

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
    if (!filters) return "sms-assets:v2:all";
    const sortedFilters = Object.keys(filters)
      .sort()
      .reduce((acc, key) => {
        acc[key] = filters[key as keyof SmsFilters];
        return acc;
      }, {} as Record<string, unknown>);
    return `sms-assets:v2:${JSON.stringify(sortedFilters)}`;
  }

  protected applyFilters(
    baseQuery: string,
    filters: SmsFilters,
    params: (string | number | null)[]
  ): { query: string; params: (string | number | null)[]; _paramIndex: number } {
    const conditions: string[] = [];

    let _query = baseQuery;
    let paramIndex = 1;

    // Search across the fields visible in the asset inventory table.
    if (filters?.search) {
      const searchPattern = SmsAssetService.buildIlikePattern(filters.search);
      conditions.push(`(
        name ILIKE $${paramIndex}
        OR description ILIKE $${paramIndex}
        OR item_code ILIKE $${paramIndex}
        OR type ILIKE $${paramIndex}
        OR category ILIKE $${paramIndex}
        OR location ILIKE $${paramIndex}
        OR assigned_to ILIKE $${paramIndex}
      )`);
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

    // Append LIMIT and OFFSET outside the WHERE clause for correct pagination
    if (filters.limit) {
      _query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }
    if (filters.offset) {
      _query += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
      paramIndex++;
    }

    return { query: _query, params, _paramIndex: paramIndex };
  }

  /**
   * Get single asset by ID (string UUID)
   */
  public async getAsset(id: string): Promise<ServiceResult<SmsAssetEntity | null>> {
    const startTime = Date.now();
    try {
      const cacheKey = `${this.serviceName}:v2:${id}`;
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
  public async updateAsset(id: string, data: Partial<Omit<SmsAssetDB, 'id' | 'created_at' | 'updated_at'>>): Promise<ServiceResult<SmsAssetEntity>> {
    const startTime = Date.now();
    try {
      const columns = Object.keys(data);
      if (columns.length === 0) {
        return { success: false, error: 'No fields to update', meta: { durationMs: 0, queryCount: 0 } };
      }

      const setClauses = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
      const query = `UPDATE ${this.tableName} SET ${setClauses}, updated_at = NOW() WHERE id = $${columns.length + 1} RETURNING *`;
      const values = [...Object.values(data), id];

      const result = await dbManager.executeUnsafe<SmsAssetDB>(query, values);
      if (result.length === 0) {
        return { success: false, error: `No record found with id ${id}`, meta: { durationMs: Date.now() - startTime, queryCount: 1 } };
      }

      const entity = this.toEntity(result[0]);
      this.invalidateCache();
      await delCache('sms:stats');
      await delCache('sms:stats:v2');
      return { success: true, data: entity, meta: { durationMs: Date.now() - startTime, queryCount: 1 } };
    } catch (error) {
      return this.handleError(error, 'updateAsset');
    }
  }

  /**
   * Delete asset by string UUID
   */
  public async deleteAsset(id: string): Promise<ServiceResult<boolean>> { // Overriding BaseService.delete which expects number
    const startTime = Date.now();
    try {
      await this.ensureNotificationsTable();
      const result = await dbManager.executeUnsafe<{ deletedAssets: number }>(
        `
          WITH related_transfers AS MATERIALIZED (
            SELECT id FROM sms_transfers WHERE asset_id = $1::uuid
          ),
          resolved_notifications AS (
            UPDATE sms_notifications
            SET read_at = COALESCE(read_at, NOW())
            WHERE read_at IS NULL
              AND (
                asset_id = $1::uuid
                OR transfer_id IN (SELECT id FROM related_transfers)
              )
            RETURNING 1
          ),
          deleted_asset AS (
            DELETE FROM sms_assets
            WHERE id = $1::uuid
            RETURNING 1
          )
          SELECT (SELECT COUNT(*) FROM deleted_asset)::integer AS "deletedAssets"
        `,
        [id],
        8000
      );
      await this.invalidateCache();
      await delCache('sms:stats');
      await delCache('sms:stats:v2');
      return {
        success: true,
        data: Number(result[0]?.deletedAssets || 0) > 0,
        meta: { durationMs: Date.now() - startTime, queryCount: 2 },
      };
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
      await delCache('sms:stats');
      await delCache('sms:stats:v2');
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
      await this.ensureTransferImagesTable();
      let query = `
        SELECT
          st.id, st.asset_id as "assetId", st.sender_id as "senderId",
          st.receiver_id as "receiverId", st.location, st.status, st.remark,
          transfer_image.image_url as "imageUrl",
          st.created_at AT TIME ZONE 'Asia/Phnom_Penh' as "createdAt",
          st.accepted_at AT TIME ZONE 'Asia/Phnom_Penh' as "acceptedAt"
        FROM sms_transfers st
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM sms_transfer_images
          WHERE transfer_id = st.id
          ORDER BY id ASC
          LIMIT 1
        ) transfer_image ON true
      `;

      const params: string[] = [];
      let paramIndex = 1;

      if (assetId) {
        query += ` WHERE st.asset_id = $${paramIndex}`;
        params.push(assetId);
        paramIndex++;
      }

      query += ` ORDER BY st.created_at DESC`;

      const result = params.length
        ? await dbManager.executeUnsafe(query, params, 8000) as Array<Record<string, unknown>>
        : await dbManager.executeUnsafe(query, [], 8000) as Array<Record<string, unknown>>;

      const transfers: SmsTransferEntity[] = result.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        assetId: row.assetId as string,
        senderId: String(row.senderId || ''),
        receiverId: String(row.receiverId || ''),
        location: row.location as string,
        status: row.status as TransferStatus,
        remark: row.remark as string | null,
        imageUrl: row.imageUrl as string | null,
        createdAt: toIsoInstantString(row.createdAt),
        acceptedAt: row.acceptedAt ? toIsoInstantString(row.acceptedAt) : null,
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
    imageUrl?: string;
  }): Promise<ServiceResult<SmsTransferEntity>> {
    const startTime = Date.now();
    try {
      if (transferData.imageUrl) {
        await this.ensureTransferImagesTable();
      }

      const result = await dbManager.executeUnsafe(
        `INSERT INTO sms_transfers (id, asset_id, sender_id, receiver_id, location, status, remark, created_at)
         VALUES (
           gen_random_uuid(),
           $1, $2, $3, $4,
           'pending',
           $5,
           (NOW() AT TIME ZONE 'Asia/Phnom_Penh')
         )
         RETURNING *`,
        [transferData.assetId, transferData.senderId, transferData.receiverId, transferData.location, transferData.remark || null],
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
        imageUrl: transferData.imageUrl || null,
        createdAt: timestampWithoutTimeZoneToCambodiaIso(transfer.created_at),
        acceptedAt: null,
      };

      if (transferData.imageUrl) {
        await dbManager.executeUnsafe(
          `INSERT INTO sms_transfer_images (transfer_id, image_url)
           VALUES ($1::uuid, $2)`,
          [transferEntity.id, transferData.imageUrl],
          5000
        );
      }

      await this.ensureAssetStockRecord(
        transferEntity.assetId,
        transferEntity.location,
        "transfer_created"
      );

      await this.logAudit(transferData.senderId, 'create_transfer', {
        transferId: transfer.id as string,
        imageUrl: transferData.imageUrl || null,
      });
      if (transferData.receiverId && transferData.receiverId !== transferData.senderId) {
        const assetName = await this.getAssetName(transferEntity.assetId);
        await this.createNotification({
          type: "transfer_request",
          title: "New transfer request",
          message: `${transferData.senderId} wants to transfer ${assetName} to you.${transferData.remark ? ` Message: ${transferData.remark}` : ""}`,
          recipientId: transferData.receiverId,
          actorId: transferData.senderId,
          assetId: transferEntity.assetId,
          transferId: transferEntity.id,
        });
      }
      await delCache('sms:stats');
      await delCache('sms:stats:v2');

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
        `WITH updated_transfer AS (
           UPDATE sms_transfers
           SET status = $1,
               accepted_at = CASE WHEN $1 = 'accepted' THEN (NOW() AT TIME ZONE 'Asia/Phnom_Penh') ELSE NULL END
           WHERE id = $2
           RETURNING id, asset_id, sender_id, receiver_id, location
         )
         SELECT updated_transfer.*, sms_assets.name AS asset_name
         FROM updated_transfer
         JOIN sms_assets ON sms_assets.id = updated_transfer.asset_id`,
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

if (status === 'accepted') {
        const transfer = result[0];
        const receiverId = String(transfer.receiver_id || '');
        
        // Check if this is a return-to-stock request (receiver is 'stock')
        if (receiverId === 'stock') {
          // For return-to-stock: set asset to Available and clear assigned_to
          await dbManager.executeUnsafe(
            `UPDATE sms_assets
             SET status = 'Available',
                 assigned_to = NULL,
                 location = $1,
                 updated_at = NOW()
             WHERE id = $2::uuid`,
            [
              String(transfer.location || 'Stock'),
              String(transfer.asset_id || ''),
            ],
            8000
          );
          
          // Notify the original sender that the asset is now returned to stock
          const senderId = String(transfer.sender_id || '');
          if (senderId) {
            await this.createNotification({
              type: "return_approved",
              title: "Return to stock approved",
              message: `Admin approved your return to stock request. ${String(transfer.asset_name || "Asset")} is now back in stock.`,
              recipientId: senderId,
              actorId: userId,
              assetId: String(transfer.asset_id || ''),
              transferId,
            });
          }
        } else {
          // For regular transfer: set asset to Borrowed and assign to receiver
          await dbManager.executeUnsafe(
            `UPDATE sms_assets
             SET status = 'Borrowed',
                 assigned_to = $1,
                 location = $2,
                 updated_at = NOW()
             WHERE id = $3::uuid`,
            [
              receiverId,
              String(transfer.location || ''),
              String(transfer.asset_id || ''),
            ],
            8000
          );
        }
        await this.invalidateCache();
      }

      await this.logAudit(userId, 'update_transfer_status', { transferId, status });
      await this.markRequestNotificationsRead(transferId);
      const updatedTransfer = result[0];
      const senderId = String(updatedTransfer.sender_id || "");
      if (senderId && senderId !== userId) {
        const assetName = String(updatedTransfer.asset_name || "SMS asset");
        const isReturnToStock = String(updatedTransfer.receiver_id || "") === "stock";
        if (isReturnToStock && status === "rejected") {
          await this.createNotification({
            type: "return_rejected",
            title: "Return to stock rejected",
            message: `${userId} rejected your return to stock request for ${assetName}.`,
            recipientId: senderId,
            actorId: userId,
            assetId: String(updatedTransfer.asset_id || ""),
            transferId,
          });
        } else if (!isReturnToStock) {
          await this.createNotification({
            type: status === "accepted" ? "transfer_accepted" : "transfer_rejected",
            title: status === "accepted" ? "Transfer accepted" : "Transfer rejected",
            message: `${userId} ${status === "accepted" ? "accepted" : "rejected"} your ${assetName} transfer request.`,
            recipientId: senderId,
            actorId: userId,
            assetId: String(updatedTransfer.asset_id || ""),
            transferId,
          });
        }
      }
      await delCache('sms:stats');
      await delCache('sms:stats:v2');

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

  public async createNotification(notification: {
    type: string;
    title: string;
    message: string;
    recipientId: string;
    actorId?: string | null;
    assetId?: string | null;
    transferId?: string | null;
  }): Promise<ServiceResult<SmsNotificationEntity>> {
    const startTime = Date.now();
    try {
      await this.ensureNotificationsTable();
      const rows = await dbManager.executeUnsafe<SmsNotificationDB>(
        `
          INSERT INTO sms_notifications (
            type, title, message, recipient_id, actor_id, asset_id, transfer_id
          )
          VALUES ($1, $2, $3, $4, $5, NULLIF($6, '')::uuid, NULLIF($7, '')::uuid)
          RETURNING *
        `,
        [
          notification.type,
          notification.title,
          notification.message,
          notification.recipientId,
          notification.actorId || null,
          notification.assetId || "",
          notification.transferId || "",
        ],
        8000
      );

      return {
        success: true,
        data: this.toNotificationEntity(rows[0]),
        meta: { durationMs: Date.now() - startTime, queryCount: 2 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create SMS notification";
      console.error("[SmsAssetService.createNotification] Error:", error);
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  public async getNotifications(
    recipientId: string,
    options: { unreadOnly?: boolean; limit?: number } = {}
  ): Promise<ServiceResult<{ notifications: SmsNotificationEntity[]; unreadCount: number }>> {
    const startTime = Date.now();
    try {
      await this.ensureNotificationsTable();
      const limit = Math.min(Math.max(options.limit || 20, 1), 100);
      const rows = await dbManager.executeUnsafe<SmsNotificationDB>(
        `
          SELECT *
          FROM sms_notifications
          WHERE LOWER(recipient_id) = LOWER($1)
            AND NOT (
              asset_id IS NOT NULL
              AND NOT EXISTS (
                SELECT 1
                FROM sms_assets
                WHERE sms_assets.id = sms_notifications.asset_id
              )
            )
            AND NOT (
              type IN ('transfer_request', 'return_request')
              AND (
                transfer_id IS NULL
                OR NOT EXISTS (
                  SELECT 1
                  FROM sms_transfers
                  WHERE sms_transfers.id = sms_notifications.transfer_id
                    AND sms_transfers.status = 'pending'
                )
              )
            )
            AND ($2::boolean = false OR read_at IS NULL)
          ORDER BY created_at DESC
          LIMIT $3
        `,
        [recipientId, !!options.unreadOnly, limit],
        8000
      );
      const countRows = await dbManager.executeUnsafe<{ count: number }>(
        `
          SELECT COUNT(*)::integer AS count
          FROM sms_notifications
          WHERE LOWER(recipient_id) = LOWER($1)
            AND read_at IS NULL
            AND NOT (
              asset_id IS NOT NULL
              AND NOT EXISTS (
                SELECT 1
                FROM sms_assets
                WHERE sms_assets.id = sms_notifications.asset_id
              )
            )
            AND NOT (
              type IN ('transfer_request', 'return_request')
              AND (
                transfer_id IS NULL
                OR NOT EXISTS (
                  SELECT 1
                  FROM sms_transfers
                  WHERE sms_transfers.id = sms_notifications.transfer_id
                    AND sms_transfers.status = 'pending'
                )
              )
            )
        `,
        [recipientId],
        5000
      );

      return {
        success: true,
        data: {
          notifications: rows.map((row) => this.toNotificationEntity(row)),
          unreadCount: Number(countRows[0]?.count || 0),
        },
        meta: { durationMs: Date.now() - startTime, queryCount: 3 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch SMS notifications";
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  public async markNotificationsRead(
    recipientId: string,
    notificationId?: number
  ): Promise<ServiceResult<boolean>> {
    const startTime = Date.now();
    try {
      await this.ensureNotificationsTable();
      await dbManager.executeUnsafe(
        `
          UPDATE sms_notifications
          SET read_at = COALESCE(read_at, NOW())
          WHERE LOWER(recipient_id) = LOWER($1)
            AND ($2::integer IS NULL OR id = $2::integer)
        `,
        [recipientId, notificationId || null],
        8000
      );

      return {
        success: true,
        data: true,
        meta: { durationMs: Date.now() - startTime, queryCount: 2 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to mark SMS notifications read";
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
   * Clear transfer and audit history for one asset.
   * Keeps one replacement audit entry so admin cleanup remains traceable.
   */
  public async clearAssetHistory(
    assetId: string,
    adminUsername: string
  ): Promise<ServiceResult<{ deletedTransfers: number; deletedAuditLogs: number }>> {
    const startTime = Date.now();

    try {
      await this.ensureNotificationsTable();
      const result = await dbManager.executeUnsafe<{
        deletedTransfers: string | number;
        deletedAuditLogs: string | number;
      }>(
        `
          WITH transfer_ids AS (
            SELECT id FROM sms_transfers WHERE asset_id = $1::uuid
          ),
          resolved_notifications AS (
            UPDATE sms_notifications
            SET read_at = COALESCE(read_at, NOW())
            WHERE read_at IS NULL
              AND type IN ('transfer_request', 'return_request')
              AND (
                asset_id = $1::uuid
                OR transfer_id IN (SELECT id FROM transfer_ids)
              )
            RETURNING 1
          ),
          deleted_audits AS (
            DELETE FROM sms_audit_logs
            WHERE (
              metadata->>'assetId' = $1::text
              OR metadata @> jsonb_build_object('assetId', $1::text)
              OR metadata->>'transferId' IN (
                SELECT id::text FROM transfer_ids
              )
            )
            RETURNING 1
          ),
          deleted_transfers AS (
            DELETE FROM sms_transfers
            WHERE id IN (SELECT id FROM transfer_ids)
            RETURNING 1
          )
          SELECT
            (SELECT COUNT(*) FROM deleted_transfers)::integer AS "deletedTransfers",
            (SELECT COUNT(*) FROM deleted_audits)::integer AS "deletedAuditLogs"
        `,
        [assetId],
      );

      const deletedTransfers = Number(result[0]?.deletedTransfers || 0);
      const deletedAuditLogs = Number(result[0]?.deletedAuditLogs || 0);

      await this.logAudit(adminUsername, "Cleared asset history", {
        assetId,
        deletedTransfers,
        deletedAuditLogs,
      });

      return {
        success: true,
        data: { deletedTransfers, deletedAuditLogs },
        meta: { durationMs: Date.now() - startTime, queryCount: 2 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to clear asset history";
      console.error("[SmsAssetService.clearAssetHistory] Error:", error);
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

/**
   * Return an SMS asset back to stock - creates a pending transfer for admin approval.
   * The asset status stays as-is until admin approves the return request.
   */
  public async returnAsset(
    assetId: string,
    returnedBy: string,
    location?: string,
    remark?: string,
    imageUrl?: string,
    requestedBy = returnedBy
  ): Promise<ServiceResult<SmsTransferEntity>> {
    const startTime = Date.now();
    try {
      // First get the current asset info to preserve sender
      const assetRows = await dbManager.executeUnsafe<{
        id: string;
        name: string;
        assigned_to: string | null;
        location: string | null;
        status: string;
      }>(
        `SELECT id, name, assigned_to, location, status FROM sms_assets WHERE id = $1::uuid`,
        [assetId],
        5000
      );

      if (assetRows.length === 0) {
        return {
          success: false,
          error: 'Asset not found',
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }

      const asset = assetRows[0];
      // Only allow returning if asset is currently borrowed/in use
      if (asset.status === 'Available') {
        return {
          success: false,
          error: 'Asset is already available - cannot return to stock',
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }

      if (imageUrl) {
        await this.ensureTransferImagesTable();
      }

      // Create a pending transfer request for admin approval.
      // sender = the selected returning person.
      // receiver = 'stock' indicates this is a return-to-stock request
      const senderId = returnedBy.trim() || asset.assigned_to || requestedBy;
      const returnLocation = location || asset.location || 'Stock';
      const returnRemark = remark || 'Return to stock pending admin approval';

      const result = await dbManager.executeUnsafe(
        `INSERT INTO sms_transfers (id, asset_id, sender_id, receiver_id, location, status, remark, created_at)
         VALUES (
           gen_random_uuid(),
           $1, $2, 'stock',
           $3,
           'pending',
           $4,
           (NOW() AT TIME ZONE 'Asia/Phnom_Penh')
         )
         RETURNING *`,
        [assetId, senderId, returnLocation, returnRemark],
        8000
      ) as Array<Record<string, unknown>>;

      const transfer = result[0];
      const transferEntity: SmsTransferEntity = {
        id: transfer.id as string,
        assetId: transfer.asset_id as string,
        senderId: String(transfer.sender_id || ''),
        receiverId: 'stock',
        location: String(transfer.location || ''),
        status: 'pending' as TransferStatus,
        remark: transfer.remark as string | null,
        imageUrl: imageUrl || null,
        createdAt: timestampWithoutTimeZoneToCambodiaIso(transfer.created_at),
        acceptedAt: null,
      };

      if (imageUrl) {
        await dbManager.executeUnsafe(
          `INSERT INTO sms_transfer_images (transfer_id, image_url)
           VALUES ($1::uuid, $2)`,
          [transferEntity.id, imageUrl],
          5000
        );
      }

      await this.logAudit(requestedBy, 'request_return', {
        assetId,
        transferId: transferEntity.id,
        returnedBy: senderId,
        imageUrl: imageUrl || null,
      });

      // Notify each real admin account about the return request.
      const adminRecipients = await this.getAdminNotificationRecipients();
      const requestMessage =
        requestedBy && requestedBy !== senderId
          ? `${requestedBy} requests to return ${asset.name} to stock for ${senderId}. Awaiting admin approval.`
          : `${senderId} requests to return ${asset.name} to stock. Awaiting admin approval.`;

      await Promise.all(
        adminRecipients.map((recipientId) =>
          this.createNotification({
            type: "return_request",
            title: "Return to stock requested",
            message: requestMessage,
            recipientId,
            actorId: requestedBy,
            assetId,
            transferId: transferEntity.id,
          })
        )
      );

      await delCache('sms:stats');
      await delCache('sms:stats:v2');

      return {
        success: true,
        data: transferEntity,
        meta: { durationMs: Date.now() - startTime, queryCount: 2 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to return asset';
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Get SMS asset stats (inventory counts) - FIXED: Pure SMS stats, no vehicle pricing
   */
  public async getAssetStats(): Promise<ServiceResult<Record<string, number>>> {
    const cacheKey = 'sms:stats:v2';
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
      const todayResult = await dbManager.execute`
        SELECT COUNT(*)::integer as count
        FROM sms_assets
        WHERE created_at >= (
          (
            date_trunc('day', NOW() AT TIME ZONE 'Asia/Phnom_Penh')
            AT TIME ZONE 'Asia/Phnom_Penh'
          ) AT TIME ZONE 'UTC'
        )
      ` as Array<{count: number}>;
      const todayChange = todayResult[0]?.count || 0;

const stats: Record<string, number> = {
        totalAssets: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
        available: statusCounts.Available || 0,
        inUse: statusCounts['In Use'] || 0,
        borrowed: statusCounts.Borrowed || 0,
        out: statusCounts['Out'] || 0,
        notReturned: statusCounts['Not Returned'] || 0,
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



  public async getAssetHistory(
    assetId: string,
    visibility: SmsHistoryVisibility
  ): Promise<ServiceResult<Record<string, unknown>>> {
    const startTime = Date.now();
    try {
      await this.ensureTransferImagesTable();
      // Get asset info
      const assetResult = await dbManager.execute`
        SELECT name FROM sms_assets WHERE id = ${assetId}
      ` as Array<Record<string, string>>;
      const assetName = assetResult[0]?.name || 'Unknown';

      // Get transfers. Admin sees all transfer events; other users only see
      // events where they are sender or receiver.
      const transferQuery = `
        SELECT
          'transfer' as type,
          id, asset_id as "assetId", sender_id as "senderId",
          receiver_id as "receiverId", location, status,
          COALESCE(NULLIF(remark, ''), 'Transfer ' || status) as description,
          transfer_image.image_url as "imageUrl",
          created_at AT TIME ZONE 'Asia/Phnom_Penh' as timestamp,
          accepted_at AT TIME ZONE 'Asia/Phnom_Penh' as "acceptedAt"
        FROM sms_transfers
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM sms_transfer_images
          WHERE transfer_id = sms_transfers.id
          ORDER BY id ASC
          LIMIT 1
        ) transfer_image ON true
        WHERE asset_id = $1::uuid
        ${visibility.isAdmin ? "" : "AND (sender_id = $2 OR receiver_id = $2)"}
        ORDER BY created_at DESC
      `;
      const transferParams = visibility.isAdmin
        ? [assetId]
        : [assetId, visibility.username];
      const transfersResult = await dbManager.executeUnsafe<Record<string, unknown>>(
        transferQuery,
        transferParams,
      );

      // Get audits directly attached to the asset or to transfers for the asset.
      // Admin sees all audit rows; other users only see their own audit rows.
      const auditQuery = `
        SELECT
          'audit' as type,
          id, user_id, action as description, metadata,
          created_at as timestamp
        FROM sms_audit_logs
        WHERE (
          metadata->>'assetId' = $1::text
          OR metadata @> jsonb_build_object('assetId', $1::text)
          OR metadata->>'transferId' IN (
            SELECT id::text FROM sms_transfers WHERE asset_id = $1::uuid
          )
        )
        ${visibility.isAdmin ? "" : "AND user_id = $2"}
        ORDER BY created_at DESC
      `;
      const auditParams = visibility.isAdmin
        ? [assetId]
        : [assetId, visibility.username];
      const auditsResult = await dbManager.executeUnsafe<Record<string, unknown>>(
        auditQuery,
        auditParams,
      );

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
          timestamp: toIsoInstantString(t.timestamp),
          acceptedAt: t.acceptedAt ? toIsoInstantString(t.acceptedAt) : null,
          metadata: {
            senderId: t.senderId,
            receiverId: t.receiverId,
            imageUrl: t.imageUrl,
          },
        })),
        ...auditsResult.map((a) => ({
          type: a.type as string,
          id: a.id as string,
          assetId,
          userId: String(a.user_id || ''),
          description: a.description as string,
          timestamp: timestampWithoutTimeZoneToUtcIso(a.timestamp),
          metadata: a.metadata,
        }))
      ].sort((a, b) => new Date(b.timestamp as string).getTime() - new Date(a.timestamp as string).getTime());

      return {
        success: true,
        data: {
          assetId,
          assetName,
          totalEvents: events.length,
          scope: visibility.isAdmin ? 'all' : 'own',
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
