import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-helpers';
import { smsService } from '@/systems/sms/services/SmsService';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const auth = requirePermission(request, 'sms:view');
    if (auth.response) return auth.response;

    const result = await smsService.getAssetStats();
    const duration = Date.now() - startTime;

    if (result.success) {
      let data = result.data;
      const notificationsResult = await smsService.getNotifications(auth.session.username, { limit: 1 });
      const unreadNotifications = notificationsResult.success
        ? notificationsResult.data?.unreadCount || 0
        : 0;

      if (auth.session.role !== 'Admin' && data) {
        const transfersResult = await smsService.getTransfers();
        if (!transfersResult.success) {
          return NextResponse.json({
            success: false,
            error: transfersResult.error || 'Failed to fetch transfer stats'
          }, { status: 500 });
        }

        data = {
          ...data,
          pendingTransfers: (transfersResult.data || []).filter((transfer) =>
            transfer.status === 'pending' &&
            (transfer.senderId === auth.session.username || transfer.receiverId === auth.session.username)
          ).length,
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
