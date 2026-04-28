import { NextRequest, NextResponse } from 'next/server';
import { smsService } from '@/services/SmsService';

export async function GET(_request: NextRequest) {
  const startTime = Date.now();
  try {
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
