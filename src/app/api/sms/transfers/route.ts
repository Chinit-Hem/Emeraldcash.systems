import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-helpers';
import { smsService } from '@/services/SmsService';
import type { SmsTransferEntity } from '@/services/SmsService';
import type { SessionPayload } from '@/lib/auth';

function isTimeoutError(error: string | undefined): boolean {
  if (!error) return false;
  return error.toLowerCase().includes('timeout');
}

function resolveStatus(error: string | undefined): number {
  return isTimeoutError(error) ? 504 : 500;
}

function canViewTransfer(transfer: SmsTransferEntity, session: SessionPayload): boolean {
  return (
    session.role === 'Admin' ||
    transfer.senderId === session.username ||
    transfer.receiverId === session.username
  );
}

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'sms:view');
    if (auth.response) return auth.response;

    const { searchParams } = new URL(req.url);
    const assetId = searchParams.get('assetId') || undefined;
    const status = searchParams.get('status') || 'pending';

    const result = await smsService.getTransfers(assetId);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to fetch transfers' },
        { status: resolveStatus(result.error) }
      );
    }

    const visibleTransfers = (result.data || [])
      .filter((transfer) => (status ? transfer.status === status : true))
      .filter((transfer) => canViewTransfer(transfer, auth.session));

    return NextResponse.json({ success: true, data: visibleTransfers, meta: result.meta });
  } catch (error) {
    const message = (error as Error).message;
    return NextResponse.json(
      { success: false, error: message },
      { status: resolveStatus(message) }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'sms:transfer');
    if (auth.response) return auth.response;

    const { assetId, senderId, receiverId, location, remark } = await req.json();
    const result = await smsService.createTransfer({
      assetId,
      senderId: String(senderId || ''),
      receiverId: String(receiverId || ''),
      location,
      remark,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create transfer' },
        { status: resolveStatus(result.error) }
      );
    }

    return NextResponse.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    const message = (error as Error).message;
    return NextResponse.json(
      { success: false, error: message },
      { status: resolveStatus(message) }
    );
  }
}
