import { NextRequest, NextResponse } from "next/server";

import { auditEventFromRequest, recordAuditEvent } from "@/lib/audit-log";
import { getSession, requirePermission } from "@/lib/auth-helpers";
import { loanService } from "@/systems/loan/services/LoanService";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json() as { action?: unknown; comment?: unknown };
    const action = ["approve", "reject", "return", "disburse"].includes(String(body.action)) ? String(body.action) as "approve" | "reject" | "return" | "disburse" : null;
    if (!action) return NextResponse.json({ success: false, error: "Action must be approve, return, reject, or disburse" }, { status: 400 });
    const approvalSession = action === "disburse" ? null : getSession(req);
    const disbursementAuth = action === "disburse" ? requirePermission(req, "loans:disburse") : null;
    if (disbursementAuth?.response) return disbursementAuth.response;
    const session = approvalSession || disbursementAuth?.session;
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized - Please log in" }, { status: 401 });
    const { id } = await params;
    if (!/^\d+$/.test(id) || Number(id) <= 0) {
      return NextResponse.json({ success: false, error: "Invalid loan id" }, { status: 400 });
    }
    const data = action === "disburse"
      ? await loanService.disburseLoan(id, session.username)
      : await loanService.decideLoanApproval(id, { username: session.username, role: String(session.role) }, action, body.comment == null ? null : String(body.comment));
    if (!data) return NextResponse.json({ success: false, error: "Loan not found" }, { status: 404 });
    await recordAuditEvent(auditEventFromRequest(req, {
      action: `loan.application.${action}`,
      actorUsername: session.username,
      actorRole: session.role,
      resourceType: "loan",
      resourceId: id,
      status: "success",
      severity: action === "reject" ? "warning" : "info",
      metadata: { loanNumber: data.loan.loanNumber, comment: body.comment == null ? null : String(body.comment) },
    }));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to process approval" }, { status: 400 });
  }
}
