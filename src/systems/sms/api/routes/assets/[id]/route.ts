import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-helpers';
import { smsService } from '@/systems/sms/services/SmsService';

function parseAssetId(id: string): string | null {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id) ? id : null;
}

/**
 * Map camelCase form fields to snake_case DB columns.
 * Accepts both naming conventions for robustness.
 */
function mapToDbPayload(data: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = String(data.name);
  if (data.item_code !== undefined || data.itemCode !== undefined) {
    payload.item_code = (data.item_code ?? data.itemCode ?? null) as string | null;
  }
  if (data.type !== undefined) payload.type = String(data.type);
  if (data.category !== undefined) payload.category = (data.category ?? null) as string | null;
  if (data.quantity !== undefined) payload.quantity = data.quantity !== null ? Number(data.quantity) : null;
  if (data.location !== undefined) payload.location = (data.location ?? null) as string | null;
  if (data.assigned_to !== undefined || data.assignedTo !== undefined) {
    payload.assigned_to = (data.assigned_to ?? data.assignedTo ?? null) as string | null;
  }
  if (data.image_url !== undefined || data.imageUrl !== undefined) {
    payload.image_url = (data.image_url ?? data.imageUrl ?? null) as string | null;
  }
  if (data.document_url !== undefined || data.documentUrl !== undefined) {
    payload.document_url = (data.document_url ?? data.documentUrl ?? null) as string | null;
  }
  if (data.description !== undefined) payload.description = (data.description ?? null) as string | null;
  if (data.ref_id !== undefined || data.refId !== undefined) {
    payload.ref_id = (data.ref_id ?? data.refId ?? null) as string | null;
  }
  if (data.status !== undefined) payload.status = String(data.status);
  return payload;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requirePermission(req, 'sms:view');
    if (auth.response) return auth.response;

    const { id } = await params;
    const assetId = parseAssetId(id);
    if (assetId === null) {
      return NextResponse.json({ success: false, error: 'Invalid asset id' }, { status: 400 });
    }

    const result = await smsService.getAsset(assetId);
    if (!result.success || !result.data) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requirePermission(req, 'sms:edit');
    if (auth.response) return auth.response;

    const { id } = await params;
    const assetId = parseAssetId(id);
    if (assetId === null) {
      return NextResponse.json({ success: false, error: 'Invalid asset id' }, { status: 400 });
    }

    const data = await req.json();
    const dbPayload = mapToDbPayload(data);
      const result = await smsService.updateAsset(assetId, dbPayload as Record<string, unknown>);
    if (!result.success || !result.data) {
      return NextResponse.json({ success: false, error: result.error || 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requirePermission(req, 'sms:delete');
    if (auth.response) return auth.response;

    if (auth.session.role !== 'Admin') {
      return NextResponse.json(
        { success: false, error: 'Only Admin can delete stock assets' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const assetId = parseAssetId(id);
    if (assetId === null) {
      return NextResponse.json({ success: false, error: 'Invalid asset id' }, { status: 400 });
    }

    const result = await smsService.deleteAsset(assetId);
    if (!result.success || !result.data) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, meta: result.meta });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
