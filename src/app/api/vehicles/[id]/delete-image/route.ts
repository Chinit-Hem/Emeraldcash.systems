import { requirePermission } from "@/lib/auth-helpers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { fetchAppsScript } from "../../_shared";

// Input validation helper
function sanitizeString(value: unknown, maxLength = 1000): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export async function POST(req: NextRequest) {
  const auth = requirePermission(req, "vehicles:edit");
  if (auth.response) return auth.response;

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { ok: false, error: "Missing NEXT_PUBLIC_API_URL" },
      { status: 500 }
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const imageFileId = sanitizeString(body.imageFileId, 500);

    if (!imageFileId) {
      return NextResponse.json({ ok: false, error: "Missing or invalid imageFileId" }, { status: 400 });
    }

    // Validate token
    const uploadToken = process.env.APPS_SCRIPT_UPLOAD_TOKEN;
    if (!uploadToken) {
      return NextResponse.json(
        { ok: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    const res = await fetchAppsScript(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "deleteImage",
        fileId: imageFileId,
        token: uploadToken,
      }),
      cache: "no-store",
      timeoutMs: 30000,
    });

    const data = await res.json();
    if (data.ok === false) {
      return NextResponse.json({ ok: false, error: data.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: data.data ?? null });
  } catch (e: unknown) {
    const message =
      e instanceof Error && e.name === "AbortError"
        ? "Request to Apps Script timed out."
        : e instanceof Error
          ? e.message
          : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
