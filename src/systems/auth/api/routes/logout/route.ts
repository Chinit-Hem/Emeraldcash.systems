import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const isHttps =
    req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";

  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/",
    maxAge: 0,
  });
  return res;
}
