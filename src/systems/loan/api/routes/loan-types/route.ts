import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth-helpers";
import { loanService, type LoanTypeDefinition } from "@/systems/loan/services/LoanService";

export async function GET(req: NextRequest) {
  const auth = requirePermission(req, "loans:view");
  if (auth.response) return auth.response;
  const { searchParams } = new URL(req.url);
  const data = await loanService.listLoanTypeDefinitions(searchParams.get("q") || "");
  return NextResponse.json({ success: true, data });
}

export async function POST(req: NextRequest) {
  const auth = requirePermission(req, "loans:create");
  if (auth.response) return auth.response;
  try {
    const body = await req.json() as Partial<LoanTypeDefinition>;
    const approvers = Array.isArray(body.approvers) ? body.approvers.map((item) => ({ username: String(item?.username || ""), name: String(item?.name || item?.username || ""), required: Boolean(item?.required) })).filter((item) => item.username) : [];
    const data = await loanService.saveLoanTypeDefinition({ name: String(body.name || ""), nameKhmer: body.nameKhmer ? String(body.nameKhmer) : null, approvers, amountOffer: Number(body.amountOffer || 0), minOffer: Number(body.minOffer || 0), maxOffer: Number(body.maxOffer || 0), approverRequired: Boolean(body.approverRequired), contractTerms: body.contractTerms ? String(body.contractTerms) : null, currency: String(body.currency || "USD"), sequenceCode: body.sequenceCode ? String(body.sequenceCode) : null, incomeAccount: body.incomeAccount ? String(body.incomeAccount) : null, penaltyAccount: body.penaltyAccount ? String(body.penaltyAccount) : null, feeAccount: body.feeAccount ? String(body.feeAccount) : null, badDebtAccount: body.badDebtAccount ? String(body.badDebtAccount) : null });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Could not save loan type" }, { status: 400 }); }
}
