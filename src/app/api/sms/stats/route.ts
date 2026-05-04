import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-helpers';
import { smsService } from '@/services/SmsService';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const auth = requirePermission(request, 'sms:view');
    if (auth.response) return auth.response;

    const result = await smsService.getAssetStats();
    const duration = Date.now() - startTime;

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        meta: { durationMs: duration }
      });
    } else {
      // Service error logged
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to fetch stats'
      }, { status: 500 });
    }
  } catch (error) {
    // duration is logged in response
    console.error('[SMS Stats API]', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
