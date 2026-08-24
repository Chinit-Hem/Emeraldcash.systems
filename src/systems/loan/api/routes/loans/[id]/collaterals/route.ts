import { NextRequest, NextResponse } from "next/server";

import { auditEventFromRequest, recordAuditEvent } from "@/lib/audit-log";
import { requirePermission } from "@/lib/auth-helpers";
import { loanService } from "@/systems/loan/services/LoanService";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requirePermission(req, "loans:edit");
    if (auth.response) return auth.response;
    const { id } = await params;
    if (!/^\d+$/.test(id) || Number(id) <= 0) {
      return NextResponse.json({ success: false, error: "Invalid loan id" }, { status: 400 });
    }
    const body = await req.json() as Record<string, unknown>;
    const data = await loanService.addCollateral(id, {
      type: String(body.type ?? body.collateralType ?? ""),
      description: body.description == null ? null : String(body.description),
      reference: body.reference == null ? null : String(body.reference),
      value: typeof body.value === "number" ? body.value : Number(body.value ?? body.estimatedValue),
      marketValue: typeof body.marketValue === "number" ? body.marketValue : Number(body.marketValue ?? body.market_value),
    });
    if (!data) return NextResponse.json({ success: false, error: "Loan not found" }, { status: 404 });
    await recordAuditEvent(auditEventFromRequest(req, {
      action: "loan.collateral.create",
      actorUsername: auth.session.username,
      actorRole: auth.session.role,
      resourceType: "loan_collateral",
      resourceId: data.id,
      status: "success",
      metadata: { loanId: id, type: data.type, value: data.value, marketValue: data.marketValue },
    }));
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to add collateral" }, { status: 400 });
  }
}
