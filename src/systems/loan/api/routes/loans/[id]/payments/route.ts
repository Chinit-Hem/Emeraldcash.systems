import { NextRequest, NextResponse } from "next/server";

import { auditEventFromRequest, recordAuditEvent } from "@/lib/audit-log";
import { requirePermission } from "@/lib/auth-helpers";
import { PAYMENT_METHODS, loanService, type PaymentMethod } from "@/systems/loan/services/LoanService";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requirePermission(req, "loans:repay");
    if (auth.response) return auth.response;
    const { id } = await params;
    if (!/^\d+$/.test(id) || Number(id) <= 0) {
      return NextResponse.json({ success: false, error: "Invalid loan id" }, { status: 400 });
    }
    const body = await req.json() as Record<string, unknown>;
    const method = typeof body.method === "string" && PAYMENT_METHODS.includes(body.method as PaymentMethod)
      ? body.method as PaymentMethod
      : undefined;
    const data = await loanService.recordPayment(id, {
      amount: typeof body.amount === "number" ? body.amount : Number(body.amount),
      paymentDate: typeof body.paymentDate === "string" ? body.paymentDate : undefined,
      method,
      reference: typeof body.reference === "string" ? body.reference : null,
      notes: typeof body.notes === "string" ? body.notes : null,
    }, auth.session.username);
    if (!data) return NextResponse.json({ success: false, error: "Loan not found" }, { status: 404 });
    await recordAuditEvent(auditEventFromRequest(req, {
      action: "loan.payment.record",
      actorUsername: auth.session.username,
      actorRole: auth.session.role,
      resourceType: "loan",
      resourceId: id,
      status: "success",
      metadata: { loanNumber: data.loan.loanNumber, amount: typeof body.amount === "number" ? body.amount : Number(body.amount), method: method || "cash" },
    }));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to record payment" }, { status: 400 });
  }
}
