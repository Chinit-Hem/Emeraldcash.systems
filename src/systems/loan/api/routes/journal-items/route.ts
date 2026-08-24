import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth-helpers";
import { loanService } from "@/systems/loan/services/LoanService";

export async function GET(req: NextRequest) {
  const auth = requirePermission(req, "loans:view");
  if (auth.response) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const accountCode = searchParams.get("accountCode") || "";
    const data = await loanService.listLoanJournalItems(accountCode);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Could not load journal items" }, { status: 400 });
  }
}
