import { NextRequest, NextResponse } from 'next/server';
import { auditEventFromRequest, recordAuditEvent } from '@/lib/audit-log';
import { requirePermission } from '@/lib/auth-helpers';
import { smsService } from '@/systems/sms/services/SmsService';
import type { SmsTransferEntity } from '@/systems/sms/services/SmsService';
import type { TransferStatus } from '@/systems/sms/types/sms-types';
import type { SessionPayload } from '@/lib/auth';

const TRANSFER_STATUSES: readonly TransferStatus[] = ['pending', 'accepted', 'rejected', 'returned'];

function isTimeoutError(error: string | undefined): boolean {
  if (!error) return false;
  return error.toLowerCase().includes('timeout');
}

function resolveStatus(error: string | undefined): number {
  return isTimeoutError(error) ? 504 : 500;
}

function canViewTransfer(transfer: SmsTransferEntity, session: SessionPayload): boolean {
  // Admin can see all transfers. Staff-like roles only see their own transfers.
  if (session.role === 'Admin') {
    return true;
  }
  // Staff and other roles can only see their own transfers
  return (
    transfer.senderId === session.username ||
    transfer.receiverId === session.username
  );
}

function isTransferStatus(value: string | null | undefined): value is TransferStatus {
  return TRANSFER_STATUSES.includes(value as TransferStatus);
}

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'sms:view');
    if (auth.response) return auth.response;

    const { searchParams } = new URL(req.url);
    const assetId = searchParams.get('assetId') || undefined;
    const statusParam = searchParams.get('status');
    const requestedStatus = statusParam === 'all' ? undefined : statusParam || 'pending';
    const status = requestedStatus
      ? isTransferStatus(requestedStatus)
        ? requestedStatus
        : null
      : undefined;

    if (status === null) {
      return NextResponse.json({ success: true, data: [], meta: { queryCount: 0 } });
    }

    const result = await smsService.getTransfers(assetId, status);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to fetch transfers' },
        { status: resolveStatus(result.error) }
      );
    }

    const visibleTransfers = (result.data || [])
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

    const { assetId, senderId, receiverId, location, remark, imageUrl } = await req.json();
    const resolvedSenderId =
      auth.session.role === 'Admin'
        ? String(senderId || auth.session.username)
        : auth.session.username;

    const result = await smsService.createTransfer({
      assetId,
      senderId: resolvedSenderId,
      receiverId: String(receiverId || ''),
      location,
      remark,
      imageUrl: typeof imageUrl === 'string' ? imageUrl : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create transfer' },
        { status: resolveStatus(result.error) }
      );
    }

    await recordAuditEvent(auditEventFromRequest(req, {
      action: 'sms.transfer.create.success',
      actorUsername: auth.session.username,
      actorRole: auth.session.role,
      resourceType: 'sms_transfer',
      resourceId: result.data?.id ?? assetId,
      status: 'success',
      metadata: {
        assetId,
        senderId: resolvedSenderId,
        receiverId: String(receiverId || ''),
      },
    }));

    return NextResponse.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    const message = (error as Error).message;
    return NextResponse.json(
      { success: false, error: message },
      { status: resolveStatus(message) }
    );
  }
}
