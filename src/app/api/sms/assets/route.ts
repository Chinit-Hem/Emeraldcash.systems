import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-helpers';
import { smsService } from '@/services/SmsService';
import { validateAssetForm } from '@/lib/sms-validation';
import type { SmsAssetDB, SmsFilters } from '@/services/SmsService';

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'sms:view');
    if (auth.response) return auth.response;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const assigned_to = searchParams.get('assigned_to') || searchParams.get('assignedTo') || undefined;

    const filters = {
      search,
      status,
      assigned_to,
      limit: pageSize,
      offset: (page - 1) * pageSize
    };
    const result = await smsService.getAssets(filters as SmsFilters);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to fetch assets' },
        { status: 500 }
      );
    }

    const total = result.data?.length || 0;

    return NextResponse.json({
      success: true,
      data: result.data || [],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('[SMS Assets GET]', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

/**
 * Map camelCase form fields to snake_case DB columns.
 * Accepts both naming conventions for robustness.
 */
function mapToDbPayload(data: Record<string, unknown>): Omit<SmsAssetDB, 'id' | 'created_at' | 'updated_at'> {
  return {
    name: String(data.name || ''),
    item_code: (data.item_code ?? data.itemCode ?? null) as string | null,
    type: String(data.type || ''),
    category: (data.category ?? null) as string | null,
    quantity: data.quantity !== undefined ? Number(data.quantity) : null,
    location: (data.location ?? null) as string | null,
    assigned_to: (data.assigned_to ?? data.assignedTo ?? null) as string | null,
    image_url: (data.image_url ?? data.imageUrl ?? null) as string | null,
    document_url: (data.document_url ?? data.documentUrl ?? null) as string | null,
    description: (data.description ?? null) as string | null,
    ref_id: (data.ref_id ?? data.refId ?? null) as string | null,
    status: String(data.status || 'Available'),
  };
}

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'sms:create');
    if (auth.response) return auth.response;

    const body = await req.json();

    // Debug: Log the incoming body for troubleshooting
    console.log('[SMS Assets POST] Received body:', JSON.stringify(body));

    // Validate incoming data
    const { isValid, errors } = validateAssetForm(body);
    if (!isValid) {
      console.log('[SMS Assets POST] Validation failed:', errors);
      return NextResponse.json(
        { success: false, error: 'Validation failed. Please check the form fields below.', errors },
        { status: 400 }
      );
    }

    const dbPayload = mapToDbPayload(body);
    console.log('[SMS Assets POST] DB payload:', JSON.stringify(dbPayload));

    const result = await smsService.createAsset(dbPayload);
    if (!result.success) {
      console.log('[SMS Assets POST] Create failed:', result.error);
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create asset' },
        { status: 500 }
      );
    }

    console.log('[SMS Assets POST] Created successfully:', result.data?.id);
    return NextResponse.json({ success: true, data: result.data, meta: result.meta }, { status: 201 });
  } catch (error) {
    console.error('[SMS Assets POST] Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
