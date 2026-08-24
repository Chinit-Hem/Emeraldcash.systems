import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth-helpers";
import { loanService } from "@/systems/loan/services/LoanService";

export async function GET(req: NextRequest) {
  const auth = requirePermission(req, "loans:view");
  if (auth.response) return auth.response;
  try {
    const accounts = await loanService.listBankingAccounts();
    return NextResponse.json({ success: true, data: accounts }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Could not load banking accounts" }, { status: 500 });
  }
}
