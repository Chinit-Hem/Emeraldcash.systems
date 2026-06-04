import type { SmsStatus } from "@/systems/sms/types/sms-types";

export type MovementMode = "send" | "return";

export type MovementFormState = {
  assetSearch: string;
  senderId: string;
  receiverId: string;
  location: string;
  remark: string;
};

export interface SmsAssetOption {
  id: string;
  name: string;
  itemCode?: string | null;
  location?: string | null;
  assignedTo?: string | null;
  status: SmsStatus;
}

export type SmsAssetApiItem = {
  id: string;
  name: string;
  itemCode?: string | null;
  location?: string | null;
  assignedTo?: string | null;
  status?: SmsStatus;
};

export type CreateAssetResult =
  | { success: true; assetId: string }
  | { success: false; error: string };
