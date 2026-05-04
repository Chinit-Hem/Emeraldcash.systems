import { requirePermission } from "@/lib/auth-helpers";
import { clearCachedVehicles } from "../_cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const auth = requirePermission(req, "vehicles:edit");
  if (auth.response) return auth.response;

  clearCachedVehicles();
  return NextResponse.json({ ok: true, message: "Cache cleared" });
}
