import { NextRequest, NextResponse } from "next/server";

import { auditEventFromRequest, recordAuditEvent } from "@/lib/audit-log";
import { getSession, hasAppPermission, requirePermission } from "@/lib/auth-helpers";
import { getUserByUsername } from "@/lib/user-db";
import { loanService, type CreateLoanActivityInput, type LoanActivityType } from "@/systems/loan/services/LoanService";

function validId(id: string): boolean {
  return /^\d+$/.test(id) && Number(id) > 0;
}

const ACTIVITY_TYPES = new Set<LoanActivityType>(["message", "note", "scheduled", "attachment"]);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requirePermission(req, "loans:view");
    if (auth.response) return auth.response;
    const { id } = await params;
    if (!validId(id)) return NextResponse.json({ success: false, error: "Invalid loan id" }, { status: 400 });
    const data = await loanService.getLoanActivityFeed(id, auth.session.username);
    if (!data) return NextResponse.json({ success: false, error: "Loan not found" }, { status: 404 });
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to load activity" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getSession(req);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized - Please log in" }, { status: 401 });
    const canContribute = hasAppPermission(session.role, "loans:create") || hasAppPermission(session.role, "loans:edit") || hasAppPermission(session.role, "loans:approve");
    if (!canContribute) return NextResponse.json({ success: false, error: "Forbidden - Insufficient permissions" }, { status: 403 });
    const { id } = await params;
    if (!validId(id)) return NextResponse.json({ success: false, error: "Invalid loan id" }, { status: 400 });
    const body = await req.json() as Record<string, unknown>;

    if (body.action === "follow") {
      const data = await loanService.setLoanFollowing(id, session.username, body.following === true);
      if (!data) return NextResponse.json({ success: false, error: "Loan not found" }, { status: 404 });
      return NextResponse.json({ success: true, data });
    }

    const type = String(body.type || "") as LoanActivityType;
    if (!ACTIVITY_TYPES.has(type)) return NextResponse.json({ success: false, error: "Invalid activity type" }, { status: 400 });
    const input: CreateLoanActivityInput = {
      type: type as CreateLoanActivityInput["type"],
      body: body.body == null ? null : String(body.body),
      scheduledFor: body.scheduledFor == null ? null : String(body.scheduledFor),
      attachmentName: body.attachmentName == null ? null : String(body.attachmentName),
      attachmentUrl: body.attachmentUrl == null ? null : String(body.attachmentUrl),
    };
    const user = await getUserByUsername(session.username);
    const data = await loanService.createLoanActivity(id, input, {
      username: session.username,
      name: user?.full_name?.trim() || session.username,
      role: String(session.role),
    });
    if (!data) return NextResponse.json({ success: false, error: "Loan not found" }, { status: 404 });
    await recordAuditEvent(auditEventFromRequest(req, {
      action: `loan.activity.${type}`,
      actorUsername: session.username,
      actorRole: session.role,
      resourceType: "loan",
      resourceId: id,
      status: "success",
      metadata: { activityId: data.id },
    }));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to save activity" }, { status: 400 });
  }
}
