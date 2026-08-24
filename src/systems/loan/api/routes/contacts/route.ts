import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth-helpers";
import { loanService, type CustomerProfile, type LoanContactInput } from "@/systems/loan/services/LoanService";

function text(value: unknown): string | null {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function parseContact(body: unknown): LoanContactInput {
  const data = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
  const rawProfile = data.profile && typeof data.profile === "object" && !Array.isArray(data.profile) ? data.profile as Record<string, unknown> : {};
  const profile = Object.fromEntries(Object.entries(rawProfile).filter(([, value]) => typeof value === "string")) as CustomerProfile;
  const income = data.income == null || data.income === "" ? null : Number(data.income);
  if (income != null && (!Number.isFinite(income) || income < 0)) throw new Error("Income must be a positive number");
  return {
    fullName: String(data.fullName ?? data.full_name ?? ""),
    phone: text(data.phone),
    email: text(data.email),
    nationalId: text(data.nationalId ?? data.national_id),
    address: text(data.address),
    occupation: text(data.occupation),
    income,
    guarantor: text(data.guarantor),
    profile,
  };
}

export async function GET(req: NextRequest) {
  const auth = requirePermission(req, "loans:view");
  if (auth.response) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const requestedLimit = Number.parseInt(searchParams.get("limit") || "200", 10);
    const contacts = await loanService.searchBorrowers(searchParams.get("q") || "", Number.isFinite(requestedLimit) ? requestedLimit : 200);
    return NextResponse.json({ success: true, data: contacts }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Could not load contacts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requirePermission(req, "loans:create");
  if (auth.response) return auth.response;
  try {
    const contact = await loanService.saveContact(parseContact(await req.json()));
    return NextResponse.json({ success: true, data: contact }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Could not create contact" }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = requirePermission(req, "loans:edit");
  if (auth.response) return auth.response;
  try {
    const body = await req.json() as Record<string, unknown>;
    const id = String(body.id || "").trim();
    if (!/^\d+$/.test(id)) throw new Error("A valid contact is required");
    const contact = await loanService.saveContact(parseContact(body), id);
    return NextResponse.json({ success: true, data: contact });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Could not update contact" }, { status: 400 });
  }
}
