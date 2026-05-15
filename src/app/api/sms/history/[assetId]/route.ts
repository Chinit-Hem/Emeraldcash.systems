import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-helpers';
import { smsService } from '@/services/SmsService';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const auth = requirePermission(req, 'sms:view');
    if (auth.response) return auth.response;

    const { assetId } = await params;
    const result = await smsService.getAssetHistory(assetId, {
      username: auth.session.username,
      isAdmin: auth.session.role === 'Admin',
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to fetch asset history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const auth = requirePermission(req, 'sms:delete');
    if (auth.response) return auth.response;

    if (auth.session.role !== 'Admin') {
      return NextResponse.json(
        { success: false, error: 'Only Admin can clear asset history' },
        { status: 403 }
      );
    }

    const { assetId } = await params;
    const result = await smsService.clearAssetHistory(assetId, auth.session.username);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to clear asset history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
