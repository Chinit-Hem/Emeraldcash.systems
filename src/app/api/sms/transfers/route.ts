import { NextRequest, NextResponse } from 'next/server';
import { smsService } from '@/services/SmsService';

function isTimeoutError(error: string | undefined): boolean {
  if (!error) return false;
  return error.toLowerCase().includes('timeout');
}

function resolveStatus(error: string | undefined): number {
  return isTimeoutError(error) ? 504 : 500;
}

export async function GET() {
  try {
    const result = await smsService.getTransfers();
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to fetch transfers' },
        { status: resolveStatus(result.error) }
      );
    }

    const pending = (result.data || []).filter((transfer) => transfer.status === 'pending');
    return NextResponse.json({ success: true, data: pending, meta: result.meta });
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

