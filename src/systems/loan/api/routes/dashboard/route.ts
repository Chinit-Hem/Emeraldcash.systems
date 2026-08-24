import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth-helpers";
import { loanService } from "@/systems/loan/services/LoanService";

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, "loans:view");
    if (auth.response) return auth.response;

    const { searchParams } = new URL(req.url);
    const data = await loanService.getDashboard({
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
    });
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load loan dashboard" },
      { status: 500 }
    );
  }
}
