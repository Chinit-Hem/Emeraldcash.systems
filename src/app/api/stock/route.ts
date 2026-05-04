import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-helpers';
import type { StockItem } from '@/lib/types';

// Keep legacy stock UI working (mock data, no DB)
export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'sms:view');
    if (auth.response) return auth.response;

    const { searchParams } = new URL(req.url);
    const modelKey = searchParams.get('modelKey');

// Mock empty data
    const stats = { total_items: 0, total_quantity: 0, low_stock_items: 0, locations: [] };
    const items: StockItem[] = [];

    return NextResponse.json({ success: true, data: items, stats });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

