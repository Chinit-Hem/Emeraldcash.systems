export type SmsStatus = 'Available' | 'In Use' | 'Borrowed' | 'Out' | 'Not Returned';
export type TransferStatus = 'pending' | 'accepted' | 'rejected' | 'returned';

export interface SmsStats {
  totalAssets: number;
  available: number;
  inUse: number;
  borrowed: number;
  pendingTransfers: number;
  todayChange: number;
}

export type SmsAsset = {
  id: string;
  name: string;
  itemCode?: string | null;
  type: string;
  category?: string | null;
  quantity?: number | null;
  location?: string | null;
  assignedTo?: string | null;
  imageUrl?: string | null;
  documentUrl?: string | null;
  description?: string | null;
  refId?: string | null;
  status: SmsStatus;
  createdAt: string;
  updatedAt?: string;
};

export type SmsTransfer = {
  id: string;
  assetId: string;
  senderId: string;
  receiverId: string;
  location: string;
  status: TransferStatus;
  remark?: string | null;
  createdAt: string;
  acceptedAt?: string | null;
};


