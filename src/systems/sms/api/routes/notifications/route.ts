import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-helpers';
import { smsService } from '@/systems/sms/services/SmsService';

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'sms:view');
    if (auth.response) return auth.response;

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = Number(searchParams.get('limit') || 20);

    const result = await smsService.getNotifications(auth.session.username, {
      unreadOnly,
      limit,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'sms:view');
    if (auth.response) return auth.response;

    const body = await req.json().catch(() => ({}));
    const notificationId =
      typeof body.id === 'number' || typeof body.id === 'string'
        ? Number(body.id)
        : undefined;

    const result = await smsService.markNotificationsRead(
      auth.session.username,
      Number.isFinite(notificationId) ? notificationId : undefined
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
