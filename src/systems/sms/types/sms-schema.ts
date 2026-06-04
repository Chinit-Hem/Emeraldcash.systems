/**
 * SMS schema compatibility layer.
 *
 * The runtime service layer currently uses raw SQL via `dbManager`, so this file
 * only provides lightweight exported symbols/types for compatibility.
 */

export const sms_assets = { table: "sms_assets" } as const;
export const sms_transfers = { table: "sms_transfers" } as const;
export const sms_transfer_images = { table: "sms_transfer_images" } as const;
export const sms_audit_logs = { table: "sms_audit_logs" } as const;

export const smsRelations = {} as const;
export const transferRelations = {} as const;

export interface SmsAsset {
  id: string;
  name: string;
  item_code: string | null;
  type: string;
  category: string | null;
  quantity: number | null;
  location: string | null;
  assigned_to: string | null;
  created_by: string | null;
  image_url: string | null;
  document_url: string | null;
  description: string | null;
  ref_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SmsTransfer {
  id: string;
  asset_id: string;
  sender_id: string;
  receiver_id: string;
  location: string;
  status: string;
  remark: string | null;
  created_at: string;
  accepted_at: string | null;
}

export interface SmsTransferImage {
  id: number;
  transfer_id: string;
  image_url: string;
}

export interface SmsAuditLog {
  id: number;
  user_id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}
