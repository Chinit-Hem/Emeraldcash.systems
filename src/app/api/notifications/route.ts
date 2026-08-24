import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth-helpers";
import { getUnifiedNotifications, markUnifiedNotificationsRead, type NotificationSource } from "@/shared/services/UnifiedNotificationService";

const SOURCES = new Set<NotificationSource>(["sms", "vms", "loan", "lms", "hr"]);

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const requestedLimit = Number(new URL(req.url).searchParams.get("limit") || 20);
    const data = await getUnifiedNotifications(session, requestedLimit);
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Could not load notifications" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({})) as { notifications?: Array<{ source?: unknown; id?: unknown }> };
    const notifications = Array.isArray(body.notifications)
      ? body.notifications.flatMap((notification) => {
          const source = typeof notification.source === "string" ? notification.source as NotificationSource : null;
          const id = notification.id == null ? "" : String(notification.id);
          return source && SOURCES.has(source) && id ? [{ source, id }] : [];
        })
      : undefined;
    await markUnifiedNotificationsRead(session, notifications);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Could not update notifications" }, { status: 500 });
  }
}
