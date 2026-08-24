import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth-helpers";
import { loanService } from "@/systems/loan/services/LoanService";

/** Saved customer and loan-type suggestions for the editable loan form fields. */
export async function GET(req: NextRequest) {
  const auth = requirePermission(req, "loans:view");
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const kind = searchParams.get("kind");
    const requestedLimit = Number.parseInt(searchParams.get("limit") || "8", 10);
    const limit = Number.isFinite(requestedLimit) ? requestedLimit : 8;
    const [borrowers, loanTypes] = await Promise.all([
      kind === "loanTypes" ? Promise.resolve([]) : loanService.searchBorrowers(query, limit),
      kind === "borrowers" ? Promise.resolve([]) : loanService.listLoanTypes(query, 20),
    ]);
    return NextResponse.json({ success: true, data: { borrowers, loanTypes } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Could not load loan form suggestions" }, { status: 500 });
  }
}
