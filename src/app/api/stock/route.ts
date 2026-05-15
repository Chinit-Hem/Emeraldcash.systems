import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-helpers';
import type { StockItem } from '@/lib/types';
import { vehicleService } from '@/services/VehicleService';

// Stock API - uses real database via VehicleService
export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'sms:view');
    if (auth.response) return auth.response;

    const { searchParams } = new URL(req.url);
    const modelKey = searchParams.get('modelKey');

    // Use real service methods to fetch stock data
    const [levelsResult, statsResult] = await Promise.all([
      vehicleService.getStockLevels(modelKey || undefined),
      vehicleService.getStockStats()
    ]);

    const items = levelsResult.success ? levelsResult.data || [] : [];
    const stats = statsResult.success ? statsResult.data || { total_items: 0, total_quantity: 0, low_stock_items: 0, locations: [] } : { total_items: 0, total_quantity: 0, low_stock_items: 0, locations: [] };

    return NextResponse.json({ success: true, data: items, stats });
  } catch (error) {
    console.error('[API/stock/GET] Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// POST handler for stock operations (adjust, transfer, return)
export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'sms:create');
    if (auth.response) return auth.response;

    const body = await req.json();
    const { action, modelKey, quantity, reason, location, fromLocation, toLocation, userId = 1, notifyTo } = body;

    // Get current user info for notification
    const username = auth.session?.username || 'User';

    let result;
    switch (action) {
      case 'return':
        // Return stock - add items back to inventory
        if (!modelKey || !quantity || !reason || !location) {
          return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }
        result = await vehicleService.returnStock(modelKey, quantity, reason, location, userId);
        // Send notification if specified
        if (notifyTo && result?.success) {
          await vehicleService.createStockNotification({
            type: 'return',
            title: 'Stock Returned',
            message: `${quantity}x ${modelKey} returned to ${location} by ${username}`,
            recipientId: notifyTo,
            relatedModelKey: modelKey,
          });
        }
        break;
      case 'transfer':
        // Transfer stock between locations
        if (!modelKey || !quantity || !fromLocation || !toLocation || !reason) {
          return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }
        result = await vehicleService.transferStock(modelKey, quantity, fromLocation, toLocation, reason, userId);
        // Send notification to the receiver
        if (notifyTo && result?.success) {
          await vehicleService.createStockNotification({
            type: 'transfer',
            title: 'Stock Transfer Received',
            message: `${quantity}x ${modelKey} transferred from ${fromLocation} to ${toLocation} by ${username}`,
            recipientId: notifyTo,
            relatedModelKey: modelKey,
          });
        }
        break;
      case 'adjust':
      default:
        // Adjust stock (IN/OUT)
        if (!modelKey || quantity === undefined || !reason || !location) {
          return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }
        result = await vehicleService.adjustStock(modelKey, quantity, reason, location, userId);
        break;
    }

    if (result?.success) {
      return NextResponse.json({ success: true, data: true });
    } else {
      return NextResponse.json({ success: false, error: result?.error || 'Operation failed' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

