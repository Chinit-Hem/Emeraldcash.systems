import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-helpers';
import { smsService } from '@/services/SmsService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // URL param [id] is the action: "accept" or "reject"
    const { id: action } = await params;
    // Body contains the actual transfer id and optional remark
    const body = await req.json();
    const transferId = body.id;
    const remark = body.remark;
    const session = getSession(req);
    const userId = session?.username || 'unknown';

    if (action !== 'accept' && action !== 'reject') {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    if (!transferId) {
      return NextResponse.json({ success: false, error: 'Transfer ID required' }, { status: 400 });
    }

    const status = action === 'accept' ? 'accepted' : 'rejected';
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
