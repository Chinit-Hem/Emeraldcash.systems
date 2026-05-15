/**
 * Stock schema compatibility layer.
 *
 * Services currently use raw SQL for stock operations, so this file exports
 * lightweight symbols and TypeScript interfaces without requiring Drizzle.
 */

export const stock_items = { table: "stock_items" } as const;
export const stock_movements = { table: "stock_movements" } as const;

export const stockRelations = {} as const;
export const movementRelations = {} as const;

export interface StockItemTable {
  id: number;
  model_key: string;
  location: string;
  quantity: number;
  min_stock: number;
  available: number;
  reserved: number;
  last_updated: string;
  brand: string;
  model: string;
  year: number | null;
  condition: string;
  color: string;
  is_low_stock: boolean;
}

export interface StockMovementTable {
  id: number;
  stock_item_id: number;
  type: "IN" | "OUT" | "ADJUST" | "TRANSFER" | "RETURN" | string;
  quantity: number;
  reason: string | null;
  user_id: number | null;
  from_location: string | null;
  to_location: string | null;
  created_at: string;
}

export type NewStockItem = Omit<StockItemTable, "id" | "last_updated">;
export type NewStockMovement = Omit<StockMovementTable, "id" | "created_at">;
