import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-helpers';
import { smsService } from '@/systems/sms/services/SmsService';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const auth = requirePermission(request, 'sms:view');
    if (auth.response) return auth.response;

    const shouldScopePendingTransfers = auth.session.role !== 'Admin';
    const [result, notificationsResult, scopedPendingResult] = await Promise.all([
      smsService.getAssetStats(),
      smsService.getNotifications(auth.session.username, { limit: 1 }),
      shouldScopePendingTransfers
        ? smsService.getPendingTransferCountForUser(auth.session.username)
        : Promise.resolve(null),
    ]);
    const duration = Date.now() - startTime;

    if (result.success) {
      let data = result.data;
      const unreadNotifications = notificationsResult.success
        ? notificationsResult.data?.unreadCount || 0
        : 0;

      if (shouldScopePendingTransfers && data) {
        if (!scopedPendingResult?.success) {
          return NextResponse.json({
            success: false,
            error: scopedPendingResult?.error || 'Failed to fetch transfer stats'
          }, { status: 500 });
        }

        data = {
          ...data,
          pendingTransfers: scopedPendingResult.data || 0,
        };
      }

      return NextResponse.json({
        success: true,
        data: data ? { ...data, unreadNotifications } : data,
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
