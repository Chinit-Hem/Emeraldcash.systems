import { NextRequest, NextResponse } from 'next/server';
import { getStockLevels, getStockStats } from '@/lib/stock-service';
import type { StockItem, StockStats } from '@/lib/types';

// Keep legacy stock UI working (mock data, no DB)
export async function GET(req: NextRequest) {
  try {
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

