import { NextRequest, NextResponse } from "next/server";

import { auditEventFromRequest, recordAuditEvent } from "@/lib/audit-log";
import { requirePermission } from "@/lib/auth-helpers";
import { loanService } from "@/systems/loan/services/LoanService";
import { parseLoanPayload } from "@/systems/loan/api/routes/loans/route";

function validId(id: string): boolean {
  return /^\d+$/.test(id) && Number(id) > 0;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requirePermission(req, "loans:view");
    if (auth.response) return auth.response;
    const { id } = await params;
    if (!validId(id)) return NextResponse.json({ success: false, error: "Invalid loan id" }, { status: 400 });
    const data = await loanService.getLoanDetail(id);
    if (!data) return NextResponse.json({ success: false, error: "Loan not found" }, { status: 404 });
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to load loan" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requirePermission(req, "loans:edit");
    if (auth.response) return auth.response;
    const { id } = await params;
    if (!validId(id)) return NextResponse.json({ success: false, error: "Invalid loan id" }, { status: 400 });
    const body = await req.json();
    const existing = await loanService.getLoan(id);
    if (!existing) return NextResponse.json({ success: false, error: "Loan not found" }, { status: 404 });
    const isEmployeeRole = ["staff", "loan officer"].includes(String(auth.session.role).toLowerCase());
    if (isEmployeeRole && existing.createdBy?.toLowerCase() !== auth.session.username.toLowerCase()) {
      return NextResponse.json({ success: false, error: "Employees can only edit their own loan applications" }, { status: 403 });
    }
    if (existing.status !== "draft") {
      return NextResponse.json({ success: false, error: "Submitted loans are locked. A reviewer must return the loan for correction before it can be edited." }, { status: 409 });
    }
    const data = await loanService.submitDraftLoan(id, parseLoanPayload(body));
    if (!data) return NextResponse.json({ success: false, error: "Loan not found" }, { status: 404 });
    await recordAuditEvent(auditEventFromRequest(req, {
      action: "loan.application.update",
      actorUsername: auth.session.username,
      actorRole: auth.session.role,
      resourceType: "loan",
      resourceId: id,
      status: "success",
      metadata: { loanNumber: data.loanNumber },
    }));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to update loan" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requirePermission(req, "loans:delete");
    if (auth.response) return auth.response;
    const { id } = await params;
    if (!validId(id)) return NextResponse.json({ success: false, error: "Invalid loan id" }, { status: 400 });
    const deleted = await loanService.deleteLoan(id);
    if (!deleted) return NextResponse.json({ success: false, error: "Loan not found" }, { status: 404 });
    await recordAuditEvent(auditEventFromRequest(req, {
      action: "loan.application.delete",
      actorUsername: auth.session.username,
      actorRole: auth.session.role,
      resourceType: "loan",
      resourceId: id,
      status: "success",
      severity: "warning",
    }));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to delete loan" }, { status: 400 });
  }
}
