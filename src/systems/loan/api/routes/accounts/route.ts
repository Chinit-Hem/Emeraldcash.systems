import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth-helpers";
import { loanService, type LoanChartAccount } from "@/systems/loan/services/LoanService";

export async function GET(req: NextRequest) {
  const auth = requirePermission(req, "loans:view");
  if (auth.response) return auth.response;
  const { searchParams } = new URL(req.url);
  const data = await loanService.listLoanChartAccounts(searchParams.get("q") || "");
  return NextResponse.json({ success: true, data });
}

export async function POST(req: NextRequest) {
  const auth = requirePermission(req, "loans:create");
  if (auth.response) return auth.response;
  try {
    const body = await req.json() as Partial<LoanChartAccount>;
    const data = await loanService.saveLoanChartAccount({ code: String(body.code || ""), name: String(body.name || ""), type: String(body.type || "Current Assets"), defaultTaxes: body.defaultTaxes ? String(body.defaultTaxes) : null, tags: body.tags ? String(body.tags) : null, accountGroup: body.accountGroup ? String(body.accountGroup) : null, accountCurrency: body.accountCurrency ? String(body.accountCurrency) : null, allowReconciliation: Boolean(body.allowReconciliation), inactive: Boolean(body.inactive) });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Could not save account" }, { status: 400 });
  }
}
