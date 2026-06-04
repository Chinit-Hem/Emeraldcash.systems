import { getSession } from "@/lib/auth-helpers";
import { log } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
  "X-Content-Type-Options": "nosniff",
};

function authDebugEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.ENABLE_AUTH_DEBUG === "true";
}

/**
 * Debug endpoint to check current session status
 * GET /api/auth/debug-session
 *
 * Returns:
 * - authenticated: boolean
 * - session: session payload (if authenticated)
 * - role: user role (if authenticated)
 * - cookies: info about session cookie presence
 */
export async function GET(req: NextRequest) {
  if (!authDebugEnabled()) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404, headers: noStoreHeaders });
  }

  const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

  try {
    const sessionCookie = req.cookies.get("session");
    const session = getSession(req);

    const debugInfo = {
      requestId,
      timestamp: new Date().toISOString(),
      authenticated: !!session,
      session: session ? {
        username: session.username,
        role: session.role,
        version: session.version,
        createdAt: session.ts ? new Date(session.ts).toISOString() : null,
        expiresAt: session.ts ? new Date(session.ts + (8 * 60 * 60 * 1000)).toISOString() : null,
      } : null,
      cookies: {
        sessionPresent: !!sessionCookie?.value,
        sessionLength: sessionCookie?.value?.length || 0,
      },
      headers: {
        userAgent: req.headers.get("user-agent")?.substring(0, 100) || "unknown",
        forwardedProto: req.headers.get("x-forwarded-proto") || "not set",
      },
    };

    log("INFO", "Debug session check", { requestId, authenticated: !!session });

    return NextResponse.json(debugInfo, {
      status: 200,
      headers: noStoreHeaders,
    });
  } catch (error) {
    log("ERROR", "Debug session check failed", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        requestId,
        error: "Failed to check session",
      },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

