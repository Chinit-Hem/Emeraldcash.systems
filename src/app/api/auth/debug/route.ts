import { NextRequest, NextResponse } from "next/server";
import { requireSessionFromRequest, getClientIp, getClientUserAgent } from "@/lib/auth";

function debugEndpointDisabled() {
  return process.env.NODE_ENV === "production" && process.env.ENABLE_AUTH_DEBUG !== "true";
}

/**
 * Debug endpoint for authentication troubleshooting
 * Helps verify cookie presence and session validity on mobile browsers
 */
export async function GET(req: NextRequest) {
  if (debugEndpointDisabled()) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const ip = getClientIp(req.headers);
  const userAgent = getClientUserAgent(req.headers);

  // Get all cookies for debugging
  const allCookies = req.cookies.getAll();
  const sessionCookie = req.cookies.get("session");

  // Check session
  const { session, debug } = requireSessionFromRequest(req);

  // Build detailed debug response
  const debugInfo = {
    timestamp: new Date().toISOString(),
    request: {
      ip,
      userAgent: userAgent?.substring(0, 100),
      url: req.url,
      method: req.method,
    },
    cookies: {
      count: allCookies.length,
      names: allCookies.map(c => c.name),
      session: {
        exists: !!sessionCookie,
        name: sessionCookie?.name,
        valueLength: sessionCookie?.value?.length || 0,
        valuePrefix: sessionCookie?.value?.substring(0, 20) + "..." || null,
      },
    },
    session: session ? {
      valid: true,
      username: session.username,
      role: session.role,
      createdAt: new Date(session.ts).toISOString(),
      age: Date.now() - session.ts,
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
      version: session.version,
    } : {
      valid: false,
      debug,
    },
    headers: {
      // Safe headers to log for debugging
      "x-forwarded-for": req.headers.get("x-forwarded-for"),
      "x-real-ip": req.headers.get("x-real-ip"),
      "x-forwarded-proto": req.headers.get("x-forwarded-proto"),
      "host": req.headers.get("host"),
      "origin": req.headers.get("origin"),
      "referer": req.headers.get("referer"),
    },
  };

  // Log to server console for server-side debugging
  console.log("[AUTH_DEBUG] Debug request:", JSON.stringify(debugInfo, null, 2));

  // Return debug info
  return NextResponse.json({
    ok: !!session,
    debug: debugInfo,
    message: session
      ? "Session is valid"
      : "No valid session found. Check debug info for details.",
  });
}

/**
 * POST endpoint to test cookie setting
 */
export async function POST(req: NextRequest) {
  if (debugEndpointDisabled()) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const testValue = body.testValue || "test";

  const res = NextResponse.json({
    ok: true,
    message: "Test cookie set",
    testValue,
  });

  // Set a test cookie with same options as session (matching login route)
  // IMPORTANT: Do NOT set domain - let browser use default (current domain)
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const isHttps =
    forwardedProto === "https" ||
    req.nextUrl.protocol === "https:" ||
    process.env.NODE_ENV === "production";

  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isHttps,
    path: "/",
    maxAge: 60 * 5, // 5 minutes for test
  };

  res.cookies.set("auth_test", testValue, cookieOptions);

  console.log("[AUTH_DEBUG] Test cookie set:", {
    ...cookieOptions,
    value: testValue,
    protocol: forwardedProto || req.nextUrl.protocol,
    isHttps,
  });


  return res;
}
