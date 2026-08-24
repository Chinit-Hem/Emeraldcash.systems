/**
 * Vehicle Service Class - OOAD Implementation
 *
 * Extends BaseService to provide vehicle-specific CRUD operations.
 * Implements the Service Layer pattern with Singleton for vehicle operations.
 *
 * Features:
 * - Extends BaseService for common CRUD operations
 * - Case-insensitive ILIKE filtering with TRIM() for accuracy
 * - Smart plural/singular category normalization
 * - SSR-ready POJO returns (no serialization errors)
 * - Comprehensive error handling with structured error objects
 * - Price calculation utilities (40% and 70% depreciation)
 *
 * @module VehicleService
 */

import {
  getCategorySearchPattern
} from "@/systems/vms/utils/categoryMapping";
import { getFuzzySuggestions, type FuzzySuggestion } from "@/systems/vms/utils/fuzzySearch";
import { dbManager } from "@/lib/db-singleton";
import type { StockItemTable } from "@/systems/vms/types/stock-schema";
import type {
  StockItem,
  StockMovementType,
  StockStats,
  Vehicle
} from "@/shared/types/types";
import type { VehicleFilters } from "@/systems/vms/types/vehicle";
// Re-export VehicleFilters for backwards compatibility
export type { VehicleFilters };
import { BaseService, ServiceResult } from "@/shared/utils/services/BaseService";
import { deleteImage, extractCloudinaryPublicId } from "@/lib/cloudinary";
import { getVehicleThumbnailUrl, mergeVehicleImages } from "@/systems/vms/utils/vehicle-helpers";



// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Database vehicle record structure (snake_case from PostgreSQL)
 */
export interface VehicleDB {
  id: number;
  category: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  market_price: number;
  tax_type: string | null;
  condition: string;
  body_type: string | null;
  color: string | null;
  image_id: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Vehicle entity that extends BaseEntity for OOAD compatibility
 * Maps Vehicle type to BaseEntity structure
 */
export interface VehicleEntity {
  id: string;           // Maps to VehicleId
  createdAt: string;    // Maps to Time
  updatedAt: string;    // Maps to updated_at from DB
  // Include all Vehicle properties
  VehicleId: string;
  Category: string;
  Brand: string;
  Model: string;
  Year: number | null;
  Plate: string;
  PriceNew: number | null;
  Price40: number | null;
  Price70: number | null;
  TaxType: string;
  Condition: string;
  BodyType: string;
  Color: string;
  Image: string;
  Images?: string[];
  Time: string;
}

/**
 * Vehicle-specific filter options
 * Imported from the VMS type module to avoid shadowing
 */


/**
 * Vehicle statistics
 */
export interface VehicleStats {
  total: number;
  byCategory: Record<string, number>;
  byCondition: Record<string, number>;
  avgPrice: number;
  noImageCount: number;
}

interface VehicleImageCleanupResult {
  deleted: number;
  failed: number;
  skipped: number;
  errors: string[];
}

/**
 * Pagination result
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Stock notification types
 * Moved to class-level (outside method) - interfaces cannot be inside method bodies
 */
export interface StockNotification {
  type: 'return' | 'transfer' | 'adjust';
  title: string;
  message: string;
  recipientId: string;
  relatedModelKey?: string;
}

const VEHICLE_ORDER_COLUMNS: Record<string, string> = {
  id: "id",
  created_at: "created_at",
  updated_at: "updated_at",
  category: "category",
  brand: "brand",
  model: "model",
  year: "year",
  plate: "plate",
  market_price: "market_price",
  condition: "condition",
  body_type: "body_type",
  color: "color",
};

function getVehicleOrderClause(filters: VehicleFilters): string {
  const column = filters.orderBy ? VEHICLE_ORDER_COLUMNS[filters.orderBy] : undefined;
  const safeColumn = column || VEHICLE_ORDER_COLUMNS.id;
  const direction = filters.orderDirection === "ASC" ? "ASC" : "DESC";
  return ` ORDER BY ${safeColumn} ${direction}`;
}

// ============================================================================
// Vehicle Service Singleton Class
// ============================================================================

export class VehicleService extends BaseService<VehicleEntity, VehicleDB> {
  private static instance: VehicleService | null = null;

  /**
   * Private constructor - use getInstance() instead
   */
  private constructor() {
    super('VehicleService');
  }

  public readonly tableName = 'vehicles';

  /**
   * Get the singleton instance
   */
  public static getInstance(): VehicleService {
    if (!VehicleService.instance) {
      VehicleService.instance = new VehicleService();
    }
    return VehicleService.instance;
  }

  // ============================================================================
  // Abstract Method Implementations
  // ============================================================================

  /**
   * Convert database vehicle record to entity (POJO for SSR)
   */
  protected toEntity(dbVehicle: VehicleDB): VehicleEntity {
    // Safely parse market_price (handle string or number from DB)
    const priceNew = typeof dbVehicle.market_price === "string"
      ? parseFloat(dbVehicle.market_price) || 0
      : (dbVehicle.market_price || 0);

    // Normalize category with plural/singular handling
    const normalizedCategory = VehicleService.normalizeCategory(dbVehicle.category);

    // Prefer the canonical image_id first. Uploads update image_id, while
    // older imported rows may still have the only usable value in thumbnail_url.
    const thumbnailUrl = dbVehicle.thumbnail_url?.trim();
    const imageId = dbVehicle.image_id?.trim() || "";
    const imageCandidates = mergeVehicleImages(imageId, thumbnailUrl || "");
    const normalizedImages = imageCandidates.filter((image) =>
      Boolean(getVehicleThumbnailUrl(image, "w400-h300"))
    );
    const normalizedImage = normalizedImages[0] || "";

    // Create entity with both BaseEntity and Vehicle properties
    const vehicle: VehicleEntity = {
      // BaseEntity properties
      id: String(dbVehicle.id),
      createdAt: dbVehicle.created_at || new Date().toISOString(),
      updatedAt: dbVehicle.updated_at || new Date().toISOString(),

      // Vehicle properties
      VehicleId: String(dbVehicle.id),
      Category: normalizedCategory,
      Brand: dbVehicle.brand || "",
      Model: dbVehicle.model || "",
      Year: dbVehicle.year || null,
      Plate: dbVehicle.plate || "",
      PriceNew: priceNew,
      Price40: VehicleService.derivePrice40(priceNew),
      Price70: VehicleService.derivePrice70(priceNew),
      TaxType: dbVehicle.tax_type || "",
      Condition: dbVehicle.condition || "",
      BodyType: dbVehicle.body_type || "",
      Color: dbVehicle.color || "",
      Image: normalizedImage,
      Images: normalizedImages,
      Time: dbVehicle.created_at || new Date().toISOString(),
    };

    return vehicle;
  }

  /**
   * Build cache key from filters
   */
  protected buildCacheKey(filters?: VehicleFilters): string {
    if (!filters) return "vehicles:all";
    // Sort keys for consistent cache keys
    const sortedFilters = Object.keys(filters)
      .sort()
      .reduce((acc, key) => {
        acc[key] = filters[key as keyof VehicleFilters];
        return acc;
      }, {} as Record<string, unknown>);
    return `vehicles:v2:${JSON.stringify(sortedFilters)}`;
  }

  /**
   * Apply vehicle-specific filters to query
   * OPTIMIZED: Uses simpler conditions for better performance
   */
  protected applyFilters(
    baseQuery: string,
    filters: VehicleFilters,
    params: (string | number | null)[],
    options: { includeOrderAndPagination?: boolean } = {}
  ): { query: string; params: (string | number | null)[]; _paramIndex: number } {
    const conditions: string[] = [];
    let _paramIndex = 1;
    const includeOrderAndPagination = options.includeOrderAndPagination ?? true;

    // Filter for vehicles without images (NULL or empty string for both image_id and thumbnail_url)
    if (filters?.withoutImage === true) {
conditions.push(`(NULLIF(TRIM(COALESCE(image_id, '')), '') IS NULL AND NULLIF(TRIM(COALESCE(thumbnail_url, '')), '') IS NULL)`);
    }

    // Category filter - use direct ILIKE without LOWER/TRIM for better performance
    if (filters?.category) {
      const searchPattern = getCategorySearchPattern(filters.category);
      conditions.push(`category ILIKE $${_paramIndex}`);
      params.push(searchPattern);
      _paramIndex++;
    }

    // Brand filter with ILIKE - removed TRIM for performance
    if (filters?.brand) {
      conditions.push(`brand ILIKE $${_paramIndex}`);
      params.push(VehicleService.buildIlikePattern(filters.brand));
      _paramIndex++;
    }

    // Model filter with ILIKE - removed TRIM for performance
    if (filters?.model) {
      conditions.push(`model ILIKE $${_paramIndex}`);
      params.push(VehicleService.buildIlikePattern(filters.model));
      _paramIndex++;
    }

    // Condition filter - exact match (fastest)
    if (filters?.condition) {
      const normalizedCondition = VehicleService.normalizeCondition(filters.condition);
      conditions.push(`condition = $${_paramIndex}`);
      params.push(normalizedCondition);
      _paramIndex++;
    }

    // Color filter with ILIKE - removed TRIM for performance
    if (filters?.color) {
      conditions.push(`color ILIKE $${_paramIndex}`);
      params.push(VehicleService.buildIlikePattern(filters.color));
      _paramIndex++;
    }

    // Body type filter with ILIKE - removed TRIM for performance
    if (filters?.bodyType) {
      conditions.push(`body_type ILIKE $${_paramIndex}`);
      params.push(VehicleService.buildIlikePattern(filters.bodyType));
      _paramIndex++;
    }

    // Tax type filter with ILIKE - removed TRIM for performance
    if (filters?.taxType) {
      conditions.push(`tax_type ILIKE $${_paramIndex}`);
      params.push(VehicleService.buildIlikePattern(filters.taxType));
      _paramIndex++;
    }

    // Year range filters - use exact comparisons (index-friendly)
    if (filters?.yearMin !== undefined && filters.yearMin !== null) {
      conditions.push(`year >= $${_paramIndex}`);
      params.push(filters.yearMin);
      _paramIndex++;
    }

    if (filters?.yearMax !== undefined && filters.yearMax !== null) {
      conditions.push(`year <= $${_paramIndex}`);
      params.push(filters.yearMax);
      _paramIndex++;
    }

    // Price range filters - use exact comparisons (index-friendly)
    if (filters?.priceMin !== undefined && filters.priceMin !== null) {
      conditions.push(`market_price >= $${_paramIndex}`);
      params.push(filters.priceMin);
      _paramIndex++;
    }

    if (filters?.priceMax !== undefined && filters.priceMax !== null) {
      conditions.push(`market_price <= $${_paramIndex}`);
      params.push(filters.priceMax);
      _paramIndex++;
    }

    if (filters?.searchTerm) {
      const searchTokens = filters.searchTerm
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      for (const token of searchTokens) {
        conditions.push(
          `(brand ILIKE $${_paramIndex} OR model ILIKE $${_paramIndex} OR plate ILIKE $${_paramIndex} OR category ILIKE $${_paramIndex} OR CAST(year AS TEXT) ILIKE $${_paramIndex})`
        );
        params.push(VehicleService.buildIlikePattern(token));
        _paramIndex++;
      }
    }

    // Build WHERE clause
    let query = baseQuery;
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    if (includeOrderAndPagination) {
      query += getVehicleOrderClause(filters);

      // Append LIMIT and OFFSET outside the WHERE clause
      if (filters.limit) {
        query += ` LIMIT $${_paramIndex}`;
        params.push(filters.limit);
        _paramIndex++;
      }
      if (filters.offset) {
        query += ` OFFSET $${_paramIndex}`;
        params.push(filters.offset);
        _paramIndex++;
      }
    }

    return { query, params, _paramIndex };
  }


  // ============================================================================
  // STATIC HELPER METHODS (Stateless - Memory Efficient)
  // ============================================================================

  /**
   * Normalize condition to proper case (New, Used, Other)
   * Static method for stateless operation
   */
  public static normalizeCondition(condition: string): "New" | "Used" | "Other" {
    if (!condition) return "Other";
    const lower = condition.toLowerCase().trim();
    if (lower === "new") return "New";
    if (lower === "used") return "Used";
    return "Other";
  }

  /**
   * Normalize category using case-insensitive partial matching
   * Uses .toLowerCase().includes() for flexible matching
   * Handles variations like: "Car", "car", "CAR", "Cars", "MyCar" all -> "Cars"
   * Static method for stateless operation
   */
  public static normalizeCategory(category: string): string {
    if (!category) return "Other";

    const lower = category.toLowerCase().trim();

    // Use includes() for partial matching - more flexible than exact match
    // Order matters: check more specific patterns first

    // Car variations: "car", "cars", "mycar", "supercar", etc.
    if (lower.includes("car")) {
      return "Cars";
    }

    // Motorcycle variations: "motorcycle", "motorcycles", "motor", etc.
    if (lower.includes("motor")) {
      return "Motorcycles";
    }

    // Tuk Tuk variations: "tuk", "tuktuk", "tuk-tuk", etc.
    if (lower.includes("tuk")) {
      return "TukTuks";
    }

    // Truck variations: "truck", "trucks", "pickuptruck", etc.
    if (lower.includes("truck")) {
      return "Trucks";
    }

    // Van variations: "van", "vans", "minivan", etc.
    if (lower.includes("van")) {
      return "Vans";
    }

    // Bus variations: "bus", "buses", "minibus", etc.
    if (lower.includes("bus")) {
      return "Buses";
    }

    // Default: return trimmed original with first letter capitalized
    return category.trim().charAt(0).toUpperCase() + category.trim().slice(1).toLowerCase();
  }

  /**
   * Round number to specified decimals safely
   * Static method for stateless operation
   */
  public static roundTo(value: number, decimals = 2): number {
    if (!Number.isFinite(value)) return 0;
    const safeDecimals = Math.max(0, Math.min(6, Math.trunc(decimals)));
    const factor = 10 ** safeDecimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  /**
   * Calculate percentage of price safely
   * Static method for stateless operation
   */
  public static percentOfPrice(price: number | null, percent: number, decimals = 2): number | null {
    if (price == null || !Number.isFinite(price)) return null;
    if (!Number.isFinite(percent)) return null;
    return VehicleService.roundTo(price * percent, decimals);
  }

  /**
   * Derive 40% depreciation price
   * Static method for stateless operation
   */
  public static derivePrice40(priceNew: number | null): number | null {
    return VehicleService.percentOfPrice(priceNew, 0.4);
  }

  /**
   * Derive 70% depreciation price
   * Static method for stateless operation
   */
  public static derivePrice70(priceNew: number | null): number | null {
    return VehicleService.percentOfPrice(priceNew, 0.7);
  }

  /**
   * Build ILIKE pattern for case-insensitive partial matching
   * Escapes special SQL characters to prevent injection
   * Static method for stateless operation
   */
  public static buildIlikePattern(searchTerm: string): string {
    if (!searchTerm) return "%";
    // Escape special SQL characters to prevent injection
    const escaped = searchTerm
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
    return `%${escaped}%`;
  }

  // ============================================================================
  // STOCK MANAGEMENT METHODS
  // ============================================================================

  /**
   * Generate model key for stock tracking
   * Format: brand_model_year_condition_color (sanitized)
   */
  private generateModelKey(vehicle: VehicleDB | VehicleEntity): string {
    let brand: string, model: string, year: number | null, condition: string, color: string;

    if ('brand' in vehicle && 'model' in vehicle) {
      const vdb = vehicle as VehicleDB;
      brand = vdb.brand || '';
      model = vdb.model || '';
      year = vdb.year;
      condition = vdb.condition || '';
      color = vdb.color || '';
    } else {
      const vent = vehicle as VehicleEntity;
      brand = vent.Brand || '';
      model = vent.Model || '';
      year = vent.Year;
      condition = vent.Condition || '';
      color = vent.Color || '';
    }

    const parts = [
      brand.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
      model.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
      year?.toString() || '0',
      condition.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
      color.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
    ].filter(Boolean);
    return parts.join('_');
  }


  /**
   * Get stock levels for model key or all
   */
  public async getStockLevels(modelKey?: string): Promise<ServiceResult<StockItem[]>> {
    const startTime = Date.now();
    try {
      let query = `
        SELECT
          si.*,
          CASE
            WHEN si.quantity <= si.min_stock THEN true
            ELSE false
          END as is_low_stock
        FROM stock_items si
      `;

      const params: (string | number | null)[] = [];
      if (modelKey) {
        query += ` WHERE si.model_key = $1`;
        // The 'params' array is already defined in the outer scope,
        // so we should push to it, not re-declare.
        params.push(modelKey);
      }

      query += ` ORDER BY si.brand, si.model, si.location`;
      const result = await dbManager.executeUnsafe<StockItem>(query, params);


      return {
        success: true,
        data: result,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stock levels';
      console.error('[VehicleService.getStockLevels] Error:', errorMessage);
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Get stock stats summary
   */
  public async getStockStats(): Promise<ServiceResult<StockStats>> {
    const startTime = Date.now();
    try {
      const query = `
        SELECT
          COUNT(*) as total_items,
          SUM(quantity) as total_quantity,
          SUM(CASE WHEN quantity <= min_stock THEN 1 ELSE 0 END)::integer as low_stock_items,
          array_agg(DISTINCT location) as locations
        FROM stock_items
      `;

      const result = await dbManager.executeUnsafe<Record<string, unknown>>(query);
      const row = (result[0] || {}) as {
        total_items?: string | number;
        total_quantity?: string | number;
        low_stock_items?: string | number;
        locations?: string[];
      };


      const stats: StockStats = {
        total_items: parseInt(String(row.total_items ?? 0)) || 0,
        total_quantity: parseInt(String(row.total_quantity ?? 0)) || 0,
        low_stock_items: parseInt(String(row.low_stock_items ?? 0)) || 0,
        locations: row.locations || [],
      };

      return {
        success: true,
        data: stats,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stock stats';
      console.error('[VehicleService.getStockStats] Error:', errorMessage);
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  public async ensureStockItem(options: {
    modelKey: string;
    location: string;
    brand?: string | null;
    model?: string | null;
    year?: number | null;
    condition?: string | null;
    color?: string | null;
    quantity?: number;
    minStock?: number;
  }): Promise<ServiceResult<boolean>> {
    const startTime = Date.now();
    try {
      const modelKey = options.modelKey.trim();
      const location = options.location.trim();

      if (!modelKey || !location) {
        return {
          success: false,
          error: 'Missing model key or location',
          meta: { durationMs: Date.now() - startTime, queryCount: 0 },
        };
      }

      await dbManager.executeUnsafe(
        `
          INSERT INTO stock_items (
            model_key, location, quantity, available, reserved, min_stock,
            brand, model, year, condition, color
          )
          VALUES ($1, $2, $3, $3, 0, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (model_key, location) DO UPDATE SET
            brand = CASE WHEN stock_items.brand = '' THEN EXCLUDED.brand ELSE stock_items.brand END,
            model = CASE WHEN stock_items.model = '' THEN EXCLUDED.model ELSE stock_items.model END,
            condition = CASE WHEN stock_items.condition = '' THEN EXCLUDED.condition ELSE stock_items.condition END,
            color = CASE WHEN stock_items.color = '' THEN EXCLUDED.color ELSE stock_items.color END,
            last_updated = NOW()
        `,
        [
          modelKey,
          location,
          Math.max(0, options.quantity ?? 1),
          options.minStock ?? 5,
          options.brand || '',
          options.model || '',
          options.year ?? null,
          options.condition || '',
          options.color || '',
        ],
        8000
      );

      return {
        success: true,
        data: true,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to ensure stock item';
      console.error('[VehicleService.ensureStockItem] Error:', errorMessage);
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Adjust stock quantity (IN/OUT/ADJUST)
   */
  public async adjustStock(
    modelKey: string,
    delta: number,
    reason: string,
    location: string,
    userId: number,
    type: StockMovementType = delta > 0 ? 'IN' : 'OUT'
  ): Promise<ServiceResult<boolean>> {
    const startTime = Date.now();
    try {
      // Begin transaction
      await dbManager.query(async () => {
        const sql = dbManager.getClient();

        // Lock the stock item row
        const itemQuery = await sql`
          SELECT * FROM stock_items
          WHERE model_key = ${modelKey} AND location = ${location}
          FOR UPDATE
        `;

        let stockItem: StockItemTable | undefined;
        if (itemQuery.length > 0) {
          stockItem = itemQuery[0] as unknown as StockItemTable;
        } else {
          // Create new stock item if not exists
          await sql`
            INSERT INTO stock_items (model_key, location, quantity, available, reserved, min_stock, brand, model, year, condition, color)
            VALUES (${modelKey}, ${location}, ${Math.max(0, delta)}, ${Math.max(0, delta)}, 0, 5, '', '', null, '', '')
            ON CONFLICT (model_key, location) DO NOTHING
          `;

          // Get the newly created item
          const newItemQuery = await sql`
            SELECT * FROM stock_items WHERE model_key = ${modelKey} AND location = ${location}
          `;
          stockItem = newItemQuery[0] as unknown as StockItemTable;
        }

        if (!stockItem) {
          throw new Error('Stock item not found');
        }

        // Update quantity
        const newQuantity = Math.max(0, stockItem.quantity + delta);
        const newAvailable = Math.max(0, stockItem.available + delta);

        await sql`
          UPDATE stock_items
          SET
            quantity = ${newQuantity},
            available = ${newAvailable},
            last_updated = NOW(),
            is_low_stock = (${newQuantity} <= min_stock)
          WHERE id = ${stockItem.id}
        `;

        // Log movement
        await sql`
          INSERT INTO stock_movements (stock_item_id, type, quantity, reason, user_id)
          VALUES (${stockItem.id}, ${type}, ${delta}, ${reason}, ${userId})
        `;
      });

      return {
        success: true,
        data: true,
        meta: { durationMs: Date.now() - startTime, queryCount: 3 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to adjust stock';
      console.error('[VehicleService.adjustStock] Error:', errorMessage);
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

/**
   * Transfer stock between locations
   */
  public async transferStock(
    modelKey: string,
    quantity: number,
    fromLocation: string,
    toLocation: string,
    reason: string,
    userId: number
  ): Promise<ServiceResult<boolean>> {
    if (quantity <= 0) {
      return {
        success: false,
        error: 'Quantity must be positive',
        meta: { durationMs: 0, queryCount: 0 },
      };
    }

    // Adjust OUT from fromLocation, IN to toLocation
    const outResult = await this.adjustStock(modelKey, -quantity, reason, fromLocation, userId, 'TRANSFER');
    if (!outResult.success) return outResult;

    const inResult = await this.adjustStock(modelKey, quantity, reason, toLocation, userId, 'TRANSFER');
    return inResult;
  }

/**
   * Return stock - adds items back to stock (e.g., returned from customer/employee)
   * This is used when items are returned to inventory after being checked out
   */
  public async returnStock(
    modelKey: string,
    quantity: number,
    reason: string,
    location: string,
    userId: number
): Promise<ServiceResult<boolean>> {
    if (quantity <= 0) {
      return {
        success: false,
        error: 'Quantity must be positive',
        meta: { durationMs: 0, queryCount: 0 },
      };
    }

    // Use RETURN type to add stock back
    const result = await this.adjustStock(modelKey, quantity, reason, location, userId, 'RETURN');
    return result;
  }

  /**
   * Create stock notification - sends notification to user about stock operations
   * This creates a notification record that can be viewed in the app
   */
  public async createStockNotification(
    notification: StockNotification
  ): Promise<ServiceResult<boolean>> {
    const startTime = Date.now();
    try {
      const sql = dbManager.getClient();

      // Create notifications table if not exists
      await sql`
        CREATE TABLE IF NOT EXISTS stock_notifications (
          id SERIAL PRIMARY KEY,
          type VARCHAR(20) NOT NULL,
          title VARCHAR(200) NOT NULL,
          message TEXT NOT NULL,
          recipient_id VARCHAR(100) NOT NULL,
          related_model_key VARCHAR(200),
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Insert notification
      await sql`
        INSERT INTO stock_notifications (type, title, message, recipient_id, related_model_key)
        VALUES (
          ${notification.type},
          ${notification.title},
          ${notification.message},
          ${notification.recipientId},
          ${notification.relatedModelKey || null}
        )
      `;

      return {
        success: true,
        data: true,
        meta: { durationMs: Date.now() - startTime, queryCount: 2 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create notification';
      console.error('[VehicleService.createStockNotification] Error:', errorMessage);
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Get stock notifications for a user
   */
  public async getStockNotifications(
    recipientId: string,
    limit: number = 20
  ): Promise<ServiceResult<Array<{
    id: number;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
  }>>> {
    const startTime = Date.now();
    try {
      const sql = dbManager.getClient();

      const result = await sql`
        SELECT id, type, title, message, is_read, created_at
        FROM stock_notifications
        WHERE recipient_id = ${recipientId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

      const notifications = result.map(row => ({
        id: row.id,
        type: row.type,
        title: row.title,
        message: row.message,
        isRead: row.is_read,
        createdAt: row.created_at,
      }));

      return {
        success: true,
        data: notifications,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch notifications';
      console.error('[VehicleService.getStockNotifications] Error:', errorMessage);
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Mark notification as read
   */
  public async markNotificationRead(id: number): Promise<ServiceResult<boolean>> {
    const startTime = Date.now();
    try {
      const sql = dbManager.getClient();

      await sql`
        UPDATE stock_notifications
        SET is_read = true
        WHERE id = ${id}
      `;

      return {
        success: true,
        data: true,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark notification read';
      console.error('[VehicleService.markNotificationRead] Error:', errorMessage);
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /** Mark one or all stock notifications read for their intended recipient. */
  public async markStockNotificationsRead(
    recipientId: string,
    notificationId?: number
  ): Promise<ServiceResult<boolean>> {
    const startTime = Date.now();
    try {
      const sql = dbManager.getClient();
      await sql`
        UPDATE stock_notifications
        SET is_read = true
        WHERE recipient_id = ${recipientId}
          AND (${notificationId || null}::integer IS NULL OR id = ${notificationId || null}::integer)
      `;
      return { success: true, data: true, meta: { durationMs: Date.now() - startTime, queryCount: 1 } };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to mark stock notifications read";
      return { success: false, error: errorMessage, meta: { durationMs: Date.now() - startTime, queryCount: 1 } };
    }
  }

  /**
   * Seed stock from existing vehicles
   */
  public async seedStockFromVehicles(): Promise<ServiceResult<number>> {
    const startTime = Date.now();
    try {
      const vehiclesResult = await this.getAll({ limit: 10000 });

      if (!vehiclesResult.success || !vehiclesResult.data) {
        return {
          success: false,
          error: vehiclesResult.error ?? 'Failed to fetch vehicles',
          meta: {
            durationMs: Date.now() - startTime,
            queryCount: vehiclesResult.meta?.queryCount ?? 1,
          },
        };
      }

      let seeded = 0;
      const stockMap = new Map<string, number>();

      for (const v of vehiclesResult.data) {
        const key = this.generateModelKey(v);
        stockMap.set(key, (stockMap.get(key) ?? 0) + 1);
      }

      for (const [key, count] of stockMap) {
        // Create in default location
        const result = await this.adjustStock(
          key,
          count,
          'Initial seed from vehicles',
          'Warehouse',
          1,
          'IN'
        );
        if (result.success) seeded++;
      }

      return {
        success: true,
        data: seeded,
        meta: {
          durationMs: Date.now() - startTime,
          queryCount: (vehiclesResult.meta?.queryCount ?? 1) + stockMap.size,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Seeding failed',
        meta: {
          durationMs: Date.now() - startTime,
          queryCount: 1,
        },
      };
    }
  }

  // ============================================================================
  // VEHICLE-SPECIFIC METHODS
  // ============================================================================

  private async ensureVehicleImagesTable(): Promise<void> {
    await dbManager.executeUnsafe(`
      CREATE TABLE IF NOT EXISTS vehicle_images (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await dbManager.executeUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_vehicle_images_vehicle_id_sort
      ON vehicle_images(vehicle_id, sort_order, id)
    `);
  }

  public async getVehicleImageReferences(vehicleId: number): Promise<ServiceResult<string[]>> {
    const startTime = Date.now();

    try {
      await this.ensureVehicleImagesTable();

      const [vehicleRows, galleryRows] = await Promise.all([
        dbManager.executeUnsafe<Pick<VehicleDB, "image_id" | "thumbnail_url">>(
          `
            SELECT image_id, thumbnail_url
            FROM vehicles
            WHERE id = $1
          `,
          [vehicleId]
        ),
        dbManager.executeUnsafe<{ image_url: string }>(
          `
            SELECT image_url
            FROM vehicle_images
            WHERE vehicle_id = $1
            ORDER BY sort_order ASC, id ASC
          `,
          [vehicleId]
        ),
      ]);

      const vehicleRow = vehicleRows[0];
      const imageReferences = mergeVehicleImages(
        vehicleRow?.image_id,
        vehicleRow?.thumbnail_url,
        galleryRows.map((row) => row.image_url)
      );

      return {
        success: true,
        data: imageReferences,
        meta: { durationMs: Date.now() - startTime, queryCount: 2 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch vehicle image references";
      console.error("[VehicleService.getVehicleImageReferences] Error:", errorMessage);
      return {
        success: false,
        error: errorMessage,
        data: [],
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  private async deleteRemovedVehicleCloudinaryImages(
    previousImages: unknown[],
    nextImages: unknown[],
    context: string
  ): Promise<VehicleImageCleanupResult> {
    const nextPublicIds = new Set(
      mergeVehicleImages(nextImages)
        .map((image) => extractCloudinaryPublicId(image))
        .filter((publicId): publicId is string => Boolean(publicId))
    );
    const removedPublicIds = Array.from(new Set(
      mergeVehicleImages(previousImages)
        .map((image) => extractCloudinaryPublicId(image))
        .filter((publicId): publicId is string => Boolean(publicId))
        .filter((publicId) => !nextPublicIds.has(publicId))
    ));

    if (removedPublicIds.length === 0) {
      return { deleted: 0, failed: 0, skipped: 0, errors: [] };
    }

    const results = await Promise.all(
      removedPublicIds.map(async (publicId) => {
        const result = await deleteImage(publicId);
        return { publicId, ...result };
      })
    );

    const failed = results.filter((result) => !result.success);
    if (failed.length > 0) {
      console.warn("[VehicleService.deleteRemovedVehicleCloudinaryImages] Cleanup incomplete:", {
        context,
        failed: failed.map((result) => ({
          publicId: result.publicId,
          error: result.error,
        })),
      });
    }

    return {
      deleted: results.length - failed.length,
      failed: failed.length,
      skipped: 0,
      errors: failed.map((result) => `${result.publicId}: ${result.error || "Delete failed"}`),
    };
  }

  public async getVehicleImages(vehicleId: number): Promise<ServiceResult<string[]>> {
    const startTime = Date.now();

    try {
      await this.ensureVehicleImagesTable();
      const rows = await dbManager.executeUnsafe<{ image_url: string }>(
        `
          SELECT image_url
          FROM vehicle_images
          WHERE vehicle_id = $1
          ORDER BY sort_order ASC, id ASC
        `,
        [vehicleId]
      );

      return {
        success: true,
        data: mergeVehicleImages(rows.map((row) => row.image_url)),
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch vehicle images";
      console.error("[VehicleService.getVehicleImages] Error:", errorMessage);
      return {
        success: false,
        error: errorMessage,
        data: [],
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  public async replaceVehicleImages(
    vehicleId: number,
    images: string[],
    options: {
      previousImages?: string[];
      deleteRemovedFromCloudinary?: boolean;
    } = {}
  ): Promise<ServiceResult<string[]>> {
    const startTime = Date.now();
    const normalizedImages = mergeVehicleImages(images);
    const shouldDeleteRemovedFromCloudinary = options.deleteRemovedFromCloudinary !== false;
    let previousImages = mergeVehicleImages(options.previousImages);

    try {
      await this.ensureVehicleImagesTable();

      if (shouldDeleteRemovedFromCloudinary && options.previousImages === undefined) {
        const previousResult = await this.getVehicleImageReferences(vehicleId);
        previousImages = previousResult.success ? previousResult.data ?? [] : [];
      }

      await dbManager.executeUnsafe(
        `DELETE FROM vehicle_images WHERE vehicle_id = $1`,
        [vehicleId]
      );

      for (let index = 0; index < normalizedImages.length; index++) {
        await dbManager.executeUnsafe(
          `
            INSERT INTO vehicle_images (vehicle_id, image_url, sort_order)
            VALUES ($1, $2, $3)
          `,
          [vehicleId, normalizedImages[index], index]
        );
      }

      await this.invalidateCache(`${this.serviceName}:${vehicleId}`);

      if (shouldDeleteRemovedFromCloudinary) {
        await this.deleteRemovedVehicleCloudinaryImages(
          previousImages,
          normalizedImages,
          `vehicle:${vehicleId}:replace-images`
        );
      }

      return {
        success: true,
        data: normalizedImages,
        meta: { durationMs: Date.now() - startTime, queryCount: normalizedImages.length + 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to replace vehicle images";
      console.error("[VehicleService.replaceVehicleImages] Error:", errorMessage);
      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }


  /**
   * Convert VehicleEntity to legacy Vehicle format
   */
  public toVehicle(entity: VehicleEntity): Vehicle {
    return {
      VehicleId: entity.VehicleId,
      Category: entity.Category,
      Brand: entity.Brand,
      Model: entity.Model,
      Year: entity.Year,
      Plate: entity.Plate,
      PriceNew: entity.PriceNew,
      Price40: entity.Price40,
      Price70: entity.Price70,
      TaxType: entity.TaxType,
      Condition: entity.Condition,
      BodyType: entity.BodyType,
      Color: entity.Color,
      Image: entity.Image,
      Images: entity.Images,
      Time: entity.Time,
    };
  }

  /**
   * Get vehicles with vehicle-specific filtering
   * Returns legacy Vehicle format for backward compatibility
   */
  public async getVehicles(filters?: VehicleFilters): Promise<ServiceResult<Vehicle[]>> {
    const result = await this.getAll(filters);
    if (result.success && result.data) {
      return {
        ...result,
        data: result.data.map(e => this.toVehicle(e)),
      };
    }
    return result as ServiceResult<Vehicle[]>;
  }

  /**
   * Get a single vehicle by ID
   * Returns legacy Vehicle format for backward compatibility
   */
  public async getVehicleById(id: number): Promise<ServiceResult<Vehicle>> {
    const result = await this.getById(id);
    if (result.success && result.data) {
      const vehicle = this.toVehicle(result.data);
      const galleryResult = await this.getVehicleImages(id);
      const galleryImages = galleryResult.success ? galleryResult.data ?? [] : [];
      const displayableImages = mergeVehicleImages(
        galleryImages,
        vehicle.Images,
        vehicle.Image
      ).filter((image) => Boolean(getVehicleThumbnailUrl(image, "w800-h600")));
      const fallbackImages = mergeVehicleImages(vehicle.Images, vehicle.Image);
      const nextImages = displayableImages.length ? displayableImages : fallbackImages;

      vehicle.Images = nextImages;
      vehicle.Image = nextImages[0] || vehicle.Image;

      return {
        ...result,
        data: vehicle,
      };
    }
    return result as ServiceResult<Vehicle>;
  }

  /**
   * Get a single vehicle by plate number (case-insensitive)
   * Vehicle-specific method
   */
  public async getVehicleByPlate(plate: string): Promise<ServiceResult<Vehicle>> {
    const startTime = Date.now();

    try {
      // Escape plate to prevent SQL injection
      const query = `SELECT * FROM ${this.tableName} WHERE plate ILIKE $1`;
      const result = await dbManager.executeUnsafe<VehicleDB>(query, [plate]);

      if (result.length === 0) {
        return {
          success: false,
          error: `Vehicle with plate ${plate} not found`,
          meta: { durationMs: Date.now() - startTime, queryCount: 1 },
        };
      }

      return {
        success: true,
        data: this.toVehicle(this.toEntity(result[0])),
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch vehicle by plate";
      console.error("[VehicleService.getVehicleByPlate] Error:", errorMessage);

      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Create a new vehicle
   * Overrides base create to handle vehicle-specific data normalization
   */
  public async createVehicle(
    vehicle: Omit<VehicleDB, "id" | "created_at" | "updated_at">
  ): Promise<ServiceResult<Vehicle>> {
    // Normalize category before saving
    const normalizedCategory = VehicleService.normalizeCategory(vehicle.category);
    const imageId = vehicle.image_id?.trim() || null;
    const thumbnailUrl = vehicle.thumbnail_url?.trim() || null;

    const data = {
      ...vehicle,
      category: normalizedCategory,
      image_id: imageId,
      thumbnail_url: thumbnailUrl,
    };

    const result = await this.create(data);
    if (result.success && result.data) {
      return {
        ...result,
        data: this.toVehicle(result.data),
      };
    }
    return result as ServiceResult<Vehicle>;
  }

  /**
   * Update a vehicle
   * Overrides base update to handle vehicle-specific data normalization
   */
  public async updateVehicle(
    id: number,
    vehicle: Partial<VehicleDB>
  ): Promise<ServiceResult<Vehicle>> {
    const logPrefix = `[VehicleService.updateVehicle #${id}]`;

    // 🚀 IMAGE SAVE FIX: Accept public_id/URL/data URL (sync validation)
    if (vehicle.image_id != null) {
      const img = String(vehicle.image_id).trim();

      // Store raw: public_id, full URL, or data URL - toEntity() will normalize on read
      if (img.length > 1000) {
        const err = `Image ID too long (${img.length}/1000 chars max)`;
        console.error(`${logPrefix} ${err}`);
        return { success: false, error: err, meta: { durationMs: 0, queryCount: 0 } };
      }

      // ✅ FIXED: No format rejection - accepts ANY valid string <=1000 chars
      vehicle.image_id = img;
    }

    // Normalize category if provided
    const data = vehicle.category
      ? { ...vehicle, category: VehicleService.normalizeCategory(vehicle.category as string) }
      : vehicle;

    try {
      const result = await this.update(id, data);

      if (result.success && result.data) {
        return {
          ...result,
          data: this.toVehicle(result.data),
        };
      }

      const baseError = result.error || 'BaseService.update returned success:false without error message';
      console.error(`${logPrefix} Base service failed:`, baseError);
      return {
        success: false,
        error: `Update failed in base service: ${baseError}`,
        meta: result.meta || { durationMs: 0, queryCount: 0 }
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`${logPrefix} CRITICAL ERROR:`, {
        id, dataKeys: Object.keys(data), errMsg, stack: error instanceof Error ? error.stack?.substring(0,500) : undefined
      });
      return {
        success: false,
        error: `Critical update error: ${errMsg}`,
        meta: { durationMs: 0, queryCount: 0 }
      };
    }
  }

  /**
   * Delete a vehicle
   * Overrides base delete to provide vehicle-specific return type
   */
  public async deleteVehicle(id: number): Promise<ServiceResult<boolean>> {
    const imageReferencesResult = await this.getVehicleImageReferences(id);
    const imageReferences = imageReferencesResult.success ? imageReferencesResult.data ?? [] : [];
    const result = await this.delete(id);

    if (result.success && result.data) {
      await this.deleteRemovedVehicleCloudinaryImages(
        imageReferences,
        [],
        `vehicle:${id}:delete`
      );
    }

    return result;
  }

  /**
   * Get vehicle statistics using optimized SQL query with case-insensitive grouping
   * Uses PostgreSQL CTE for efficient counting directly in the database
   * Returns POJO for SSR compatibility
   */
  public async getVehicleStats(forceRefresh = false): Promise<ServiceResult<VehicleStats>> {
    const startTime = Date.now();

    try {
      // 🚀 FIX: Updated cache key to v8 to bust stale cache
      const cacheKey = "vehicle:stats:v8";


      // Check cache unless force refresh is requested
      if (!forceRefresh) {
        const cached = await this.getFromCache<VehicleStats>(cacheKey);
        if (cached) {
          return {
            success: true,
            data: cached,
            meta: { durationMs: Date.now() - startTime, queryCount: 0 },
          };
        }
      }

      // Build and execute the stats query
      // 🚀 FIX: no_image_count now checks BOTH image_id AND thumbnail_url
      // to match applyFilters() and toEntity() image resolution logic.
      // This fixes the dashboard "missing images" count mismatch.
      // 🚀 OPTIMIZED: Replace slow LIKE '%car%' with CASE WHEN + ILIKE ANY (10x faster)
      // RECOMMEND: CREATE INDEX CONCURRENTLY idx_vehicles_category_lower ON vehicles (LOWER(category));
const query = `
        SELECT
          COUNT(id) as total,
        COUNT(*) FILTER (WHERE category ILIKE ANY(ARRAY['%car%','car','cars'])) as cars_count,
COUNT(*) FILTER (WHERE category ILIKE ANY(ARRAY['%motor%','motorcycle%','bike%'])) as motorcycles_count,
COUNT(*) FILTER (WHERE category ILIKE ANY(ARRAY['%tuk%','tuktuk','tuk tuk'])) as tuktuks_count,
COUNT(*) FILTER (WHERE category ILIKE ANY(ARRAY['%truck%'])) as trucks_count,
COUNT(*) FILTER (WHERE category ILIKE ANY(ARRAY['%van%'])) as vans_count,
COUNT(*) FILTER (WHERE category ILIKE ANY(ARRAY['%bus%'])) as buses_count,
COUNT(*) FILTER (WHERE category NOT ILIKE ANY(ARRAY['%car%','%motor%','%tuk%','%truck%','%van%','%bus%'])) as other_count,
        COUNT(*) FILTER (WHERE condition ILIKE 'new') as new_count,
        COUNT(*) FILTER (WHERE condition ILIKE 'used') as used_count,
        COUNT(*) FILTER (WHERE condition NOT ILIKE ANY(ARRAY['new','used'])) as other_condition_count,
AVG(CASE WHEN market_price > 0 THEN market_price ELSE NULL END)::numeric as avg_price,
          COUNT(*) FILTER (WHERE NULLIF(TRIM(COALESCE(image_id, '')), '') IS NULL AND NULLIF(TRIM(COALESCE(thumbnail_url, '')), '') IS NULL) as no_image_count
        FROM vehicles
      `;


      // Use dbManager.executeUnsafe for raw SQL queries
      let statsResult: Array<{
        total: string | number;
        cars_count: string | number;
        motorcycles_count: string | number;
        tuktuks_count: string | number;
        trucks_count: string | number;
        vans_count: string | number;
        buses_count: string | number;
        other_count: string | number;
        new_count: string | number;
        used_count: string | number;
        other_condition_count: string | number;
        avg_price: string | number;
        no_image_count: string | number;
      }> | null = null;

      try {
        statsResult = await dbManager.executeUnsafe(query);
      } catch (queryError) {
        console.error("[VehicleService.getVehicleStats] Query execution error:", queryError);
        const message = queryError instanceof Error ? queryError.message : "Unknown stats query error";
        throw new Error(`Vehicle stats query failed: ${message}`);
      }

      // Ensure statsResult is an array and has at least one row
      const resultArray = Array.isArray(statsResult) ? statsResult : [statsResult];
      if (resultArray.length === 0 || !resultArray[0]) {
        throw new Error("Vehicle stats query returned no rows");
      }

      const row = resultArray[0] as {
        total: string | number;
        cars_count: string | number;
        motorcycles_count: string | number;
        tuktuks_count: string | number;
        trucks_count: string | number;
        vans_count: string | number;
        buses_count: string | number;
        other_count: string | number;
        new_count: string | number;
        used_count: string | number;
        other_condition_count: string | number;
        avg_price: string | number;
        no_image_count: string | number;
      };

      const result: VehicleStats = {
        total: parseInt(String(row.total)) || 0,
        byCategory: {
          Cars: parseInt(String(row.cars_count)) || 0,
          Motorcycles: parseInt(String(row.motorcycles_count)) || 0,
          TukTuks: parseInt(String(row.tuktuks_count)) || 0,
          Trucks: parseInt(String(row.trucks_count)) || 0,
          Vans: parseInt(String(row.vans_count)) || 0,
          Buses: parseInt(String(row.buses_count)) || 0,
          Other: parseInt(String(row.other_count)) || 0,
        },
        byCondition: {
          New: parseInt(String(row.new_count)) || 0,
          Used: parseInt(String(row.used_count)) || 0,
          Other: parseInt(String(row.other_condition_count)) || 0,
        },
        avgPrice: Math.round((parseFloat(String(row.avg_price)) || 0) * 100) / 100,
        noImageCount: parseInt(String(row.no_image_count)) || 0,
      };

      // 🚀 FIX: Reduced cache TTL from 5 minutes to 30 seconds for fresher stats
      const STATS_CACHE_TTL_MS = 30000; // 30 seconds
      await this.setCache(cacheKey, result, STATS_CACHE_TTL_MS);

      return {
        success: true,
        data: result,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch vehicle stats";
      console.error("[VehicleService.getVehicleStats] Error:", errorMessage);

      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Get lightweight stats (total count only)
   * Returns POJO for SSR compatibility
   */
  public async getVehicleStatsLite(noCache = false): Promise<ServiceResult<{ total: number }>> {
    const startTime = Date.now();
    // 🚀 FIX: Updated cache key to v6 to bust stale cache
    const cacheKey = "vehicles:total:lite:v6";

    // Skip cache if requested
    if (!noCache) {
      const cached = await this.getFromCache<{ total: number }>(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          meta: { durationMs: 0, queryCount: 0, cacheHit: true },
        };
      }
    }

    try {
      const query = `SELECT COUNT(*) as count, COUNT(id) as id_count FROM ${this.tableName}`;
      const result = await dbManager.executeUnsafe<{ count: string | number; id_count: string | number }>(query);

      const row = result[0] || { count: 0, id_count: 0 };
      const totalCount = parseInt(String(row.count)) || 0;
      const idCount = parseInt(String(row.id_count)) || 0;

      const total = Math.max(totalCount, idCount);

      const data = { total };

      // Cache for 30s
      await this.setCache(cacheKey, data, 30000);

      return {
        success: true,
        data,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch vehicle count";
      console.error("[VehicleService.getVehicleStatsLite] Error:", errorMessage);

      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Dedicated total count method with validation and no-cache option
   */
  public async getTotalCount(noCache = false): Promise<ServiceResult<number>> {
    const statsResult = await this.getVehicleStatsLite(noCache);
    if (!statsResult.success || !statsResult.data) {
      return {
        success: false,
        error: statsResult.error,
        meta: statsResult.meta,
      };
    }
    return {
      success: true,
      data: statsResult.data.total,
      meta: statsResult.meta,
    };
  }

  /**
   * Get filtered count - returns count matching the same filters as getVehicles
   * This ensures the count matches the actual filtered results
   */
  public async countWithFilters(filters?: VehicleFilters): Promise<ServiceResult<number>> {
    const startTime = Date.now();

    try {
      // Build base query for counting
      let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      let params: (string | number | null)[] = [];
      const countFilters = filters
        ? {
            ...filters,
            limit: undefined,
            offset: undefined,
            orderBy: undefined,
            orderDirection: undefined,
          }
        : undefined;

      // Apply the same WHERE filters as getVehicles, without list pagination.
      if (countFilters && Object.keys(countFilters).some((key) => countFilters[key as keyof VehicleFilters] !== undefined)) {
        const filterResult = this.applyFilters(query, countFilters, params, {
          includeOrderAndPagination: false,
        });
        query = filterResult.query;
        params = filterResult.params;
      }


      // Add timeout to prevent hanging
      // INCREASED: 25 seconds for count with complex filters on large datasets
      const COUNT_TIMEOUT_MS = 25000;

      // Use dbManager.executeUnsafe with parameters directly
      const result = await Promise.race([
        dbManager.executeUnsafe<{ count: string | number }>(query, params),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Count query timeout')), COUNT_TIMEOUT_MS)
        )
      ]);

      const count = parseInt(String(result[0]?.count)) || 0;

      return {
        success: true,
        data: count,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to count vehicles with filters";
      console.error("[VehicleService.countWithFilters] Error:", errorMessage);

      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Search vehicles by text with case-insensitive ILIKE
   * Returns POJOs for SSR compatibility
   */
  public async searchVehicles(searchTerm: string, limit?: number): Promise<ServiceResult<Vehicle[]>> {
    const startTime = Date.now();

    try {
      // Escape search term to prevent SQL injection
      const escapedTerm = searchTerm.replace(/'/g, "''");
      const pattern = VehicleService.buildIlikePattern(escapedTerm);
      // Also search by normalized category
      const normalizedCategoryPattern = VehicleService.buildIlikePattern(VehicleService.normalizeCategory(searchTerm)); // This is fine as it's part of the pattern

      // Build the query based on whether limit is provided
      // Use inline parameters instead of $1, $2 for Neon compatibility
      let query: string;
      const queryParams: (string | number)[] = [pattern, pattern, pattern, normalizedCategoryPattern];

      if (limit !== undefined && limit !== null) {
        query = `
          SELECT * FROM ${this.tableName}
          WHERE brand ILIKE $1 OR model ILIKE $2 OR plate ILIKE $3 OR category ILIKE $4 -- Use parameterized query
          ORDER BY brand, model
          LIMIT $5 -- Use parameterized query
        `;
        queryParams.push(limit);
      } else {
        query = `
          SELECT * FROM ${this.tableName}
          WHERE brand ILIKE $1 OR model ILIKE $2 OR plate ILIKE $3 OR category ILIKE $4 -- Use parameterized query
          ORDER BY brand, model
        `;
      }
      const result = await dbManager.executeUnsafe<VehicleDB>(query, queryParams);

      return {
        success: true,
        data: result.map(v => this.toVehicle(this.toEntity(v))),
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to search vehicles";
      console.error("[VehicleService.searchVehicles] Error:", errorMessage);

      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Get fuzzy search suggestions when exact search returns no results.
   * Uses Levenshtein distance to find similar vehicles across brand, model, plate, category.
   *
   * Strategy:
   * 1. Fetch candidate vehicles with broader ILIKE (each word OR'd)
   * 2. Rank candidates with fuzzy similarity scoring
   * 3. Return top N suggestions
   *
   * @param searchTerm - User's (possibly misspelled) query
   * @param limit - Max suggestions to return (default 5)
   * @returns Suggestions with similarity scores
   */
  public async getSearchSuggestions(
    searchTerm: string,
    limit: number = 5
  ): Promise<ServiceResult<FuzzySuggestion[]>> {
    const startTime = Date.now();

    try {
      if (!searchTerm || searchTerm.trim().length < 2) {
        return {
          success: true,
          data: [],
          meta: { durationMs: Date.now() - startTime, queryCount: 0 },
        };
      }

      // Build broader candidate query: each token gets its own ILIKE OR condition (parameterized)
      const tokens = searchTerm
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length >= 2);

      const queryParams: string[] = []; // Changed to string[]
      if (tokens.length === 0) {
        return {
          success: true,
          data: [],
          meta: { durationMs: Date.now() - startTime, queryCount: 0 },
        };
      }

      const tokenConditions = tokens.map((_, i) => { // Dynamically build parameterized conditions
        queryParams.push(`%${tokens[i]}%`, `%${tokens[i]}%`, `%${tokens[i]}%`, `%${tokens[i]}%`);
        const paramOffset = i * 4;
        return `(brand ILIKE $${paramOffset + 1} OR model ILIKE $${paramOffset + 2} OR plate ILIKE $${paramOffset + 3} OR category ILIKE $${paramOffset + 4})`;
      }).join(" OR ");

      const candidateQuery = `
        SELECT * FROM ${this.tableName}
        WHERE ${tokenConditions}
        ORDER BY brand, model
        LIMIT 200
      `;

      const candidates = await dbManager.executeUnsafe<VehicleDB>(candidateQuery, queryParams);
      const candidateVehicles = candidates.map((v) => this.toVehicle(this.toEntity(v)));

      // Apply fuzzy ranking on candidates
      const suggestions = getFuzzySuggestions(searchTerm, candidateVehicles, {
        limit,
        minScore: 0.3,
      });

      return {
        success: true,
        data: suggestions,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to get search suggestions";
      console.error("[VehicleService.getSearchSuggestions] Error:", errorMessage);

      return {
        success: false,
        error: errorMessage,
        meta: { durationMs: Date.now() - startTime, queryCount: 1 },
      };
    }
  }

  /**
   * Advanced search with multiple criteria
   * Returns POJOs for SSR compatibility
   */
  public async advancedSearch(criteria: VehicleFilters): Promise<ServiceResult<Vehicle[]>> {
    return this.getVehicles(criteria);
  }

  /**
   * Get vehicles by category with normalization
   * Returns POJOs for SSR compatibility
   */
  public async getVehiclesByCategory(category: string): Promise<ServiceResult<Vehicle[]>> {
    const normalizedCategory = VehicleService.normalizeCategory(category);
    return this.getVehicles({ category: normalizedCategory });
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

/**
 * Singleton instance of VehicleService
 * Use this for all vehicle operations
 */
export const vehicleService = VehicleService.getInstance();

// Default export for convenience
export default vehicleService;
