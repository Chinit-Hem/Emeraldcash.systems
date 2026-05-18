import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-helpers';
import { smsService } from '@/services/SmsService';

function parseAssetId(id: string): string | null {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id) ? id : null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requirePermission(req, 'sms:transfer');
    if (auth.response) return auth.response;

    const { id } = await params;
    const assetId = parseAssetId(id);
    if (!assetId) {
      return NextResponse.json({ success: false, error: 'Invalid asset id' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const result = await smsService.returnAsset(
      assetId,
      auth.session.username,
      typeof body.location === 'string' ? body.location : undefined,
      typeof body.remark === 'string' ? body.remark : undefined,
      typeof body.imageUrl === 'string' ? body.imageUrl : undefined
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to return asset' },
        { status: result.error === 'Asset not found' ? 404 : 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
