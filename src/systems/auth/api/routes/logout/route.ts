import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const isProduction = process.env.NODE_ENV === "production";
  const isHttps =
    req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  const allowInsecureCookies = !isProduction && process.env.ALLOW_HTTP_COOKIES === "true";

  const res = NextResponse.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "X-Content-Type-Options": "nosniff",
      },
    }
  );
  res.cookies.set("session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: (isProduction || isHttps) && !allowInsecureCookies,
    path: "/",
    maxAge: 0,
  });
  return res;
}
