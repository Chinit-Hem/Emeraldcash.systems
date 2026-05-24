import { z } from 'zod';
import type { SmsStatus } from '@/systems/sms/types/sms-types';

export const smsAssetSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255, 'Name too long'),
  itemCode: z.string().max(64, 'Item code too long').optional(),
  type: z.string().min(2, 'Type required').max(64, 'Type too long'),
  category: z.string().max(64, 'Category too long').optional(),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1').max(999, 'Quantity too high'),
  location: z.string().max(128, 'Location too long').optional(),
  assignedTo: z.string().max(128, 'Assigned to too long').optional(),
  imageUrl: z.string().max(512, 'Image URL too long').optional(),
  documentUrl: z.string().max(512, 'Document URL too long').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  refId: z.string().max(128, 'Reference ID too long').optional(),
  status: z.enum(['Available', 'In Use', 'Borrowed', 'Out', 'Not Returned'] as [SmsStatus, ...SmsStatus[]]),
});

export const smsTransferSchema = z.object({
  assetId: z.string().uuid('Asset ID must be a valid UUID'),
  senderId: z.string().min(1, 'Sender is required'),
  receiverId: z.string().min(1, 'Receiver is required'),
  location: z.string().min(1, 'Location is required').max(128, 'Location too long'),
  remark: z.string().max(500, 'Remark too long').optional(),
});

export type SmsAssetFormData = z.infer<typeof smsAssetSchema>;
export type SmsTransferFormData = z.infer<typeof smsTransferSchema>;

export function validateAssetForm(data: unknown): { errors: Record<string, string>, isValid: boolean } {
  const result = smsAssetSchema.safeParse(data);
  if (result.success) return { errors: {}, isValid: true };
  
  const errors: Record<string, string> = {};
  result.error.issues.forEach((issue) => {
    const path = issue.path[0] as string;
    if (!errors[path]) errors[path] = issue.message;
  });
  return { errors, isValid: false };
}

export function validateTransferForm(data: unknown): { errors: Record<string, string>, isValid: boolean } {
  const result = smsTransferSchema.safeParse(data);
  if (result.success) return { errors: {}, isValid: true };
  
  const errors: Record<string, string> = {};
  result.error.issues.forEach((issue) => {
    const path = issue.path[0] as string;
    if (!errors[path]) errors[path] = issue.message;
  });
  return { errors, isValid: false };
}

