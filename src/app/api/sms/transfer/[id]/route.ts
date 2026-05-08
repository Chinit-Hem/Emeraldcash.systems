import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-helpers';
import { smsService } from '@/services/SmsService';
import type { SmsTransferEntity } from '@/services/SmsService';

function canUpdateTransfer(transfer: SmsTransferEntity, username: string, role: string): boolean {
  return role === 'Admin' || transfer.receiverId === username;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requirePermission(req, 'sms:transfer');
    if (auth.response) return auth.response;

    // URL param [id] is the action: "accept" or "reject"
    const { id: action } = await params;
    // Body contains the actual transfer id and optional remark
    const body = await req.json();
    const transferId = body.id;
    const remark = body.remark;
    const userId = auth.session.username;

    if (action !== 'accept' && action !== 'reject') {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    if (!transferId) {
      return NextResponse.json({ success: false, error: 'Transfer ID required' }, { status: 400 });
    }

    const status = action === 'accept' ? 'accepted' : 'rejected';

    const transfersResult = await smsService.getTransfers();
    if (!transfersResult.success) {
      return NextResponse.json(
        { success: false, error: transfersResult.error || 'Failed to verify transfer permissions' },
        { status: 500 }
      );
    }

    const transfer = (transfersResult.data || []).find((item) => item.id === transferId);
    if (!transfer) {
      return NextResponse.json({ success: false, error: 'Transfer not found' }, { status: 404 });
    }

    if (!canUpdateTransfer(transfer, userId, auth.session.role)) {
      return NextResponse.json(
        { success: false, error: 'Only the receiver or an admin can accept or reject this transfer' },
        { status: 403 }
      );
    }

    const result = await smsService.updateTransferStatus(transferId, status, userId);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update transfer status' },
        { status: 500 }
      );
    }

    // If rejecting with a remark, log it (optional audit extension)
    if (action === 'reject' && remark) {
      await smsService.logAudit(userId, 'reject_transfer_remark', { transferId, remark });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
