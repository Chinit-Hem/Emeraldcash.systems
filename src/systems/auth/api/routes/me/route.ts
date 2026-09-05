import {
  createSessionCookie,
  getClientIp,
  getClientUserAgent,
  getSessionFromRequest,
  validateSession,
} from "@/lib/auth";
import { getUserByUsername } from "@/lib/user-db";
import { NextRequest, NextResponse } from "next/server";

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(req: NextRequest) {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    const isHttps =
      req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
    const allowInsecureCookies = !isProduction && process.env.ALLOW_HTTP_COOKIES === "true";
    const ip = getClientIp(req.headers);
    const userAgent = getClientUserAgent(req.headers);
    const sessionCookie = req.cookies.get("session")?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { ok: false, error: "No session cookie" },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const session = getSessionFromRequest(userAgent, ip, sessionCookie);
    if (!session || !validateSession(session)) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired session" },
        { status: 401, headers: noStoreHeaders }
      );
    }

    // Get full user profile from database
    const userProfile = await getUserByUsername(session.username);
    if (!userProfile) {
      const response = NextResponse.json(
        { ok: false, error: "User account no longer exists" },
        { status: 401, headers: noStoreHeaders }
      );
      response.cookies.set("session", "", {
        httpOnly: true,
        sameSite: "lax",
        secure: (isProduction || isHttps) && !allowInsecureCookies,
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    const latestRole = userProfile.role || session.role;
    const response = NextResponse.json({
      ok: true,
      user: {
        username: session.username,
        role: latestRole,
        full_name: userProfile.full_name || null,
        position: userProfile.position || null,
        department: userProfile.department || null,
        branch: userProfile.branch || null,
        email: userProfile.email || null,
        phone: userProfile.phone || null,
        mobile: userProfile.mobile || null,
        bio: userProfile.bio || null,
        profile_picture: userProfile.profile_picture || null,
        created_at: userProfile.created_at || null,
        updated_at: userProfile.updated_at || null,
      },
    }, { headers: noStoreHeaders });

    if (latestRole !== session.role) {
      response.cookies.set("session", createSessionCookie({
        username: session.username,
        role: latestRole,
        ...(session.staffId ? { staffId: session.staffId } : {}),
        ...(session.userId ? { userId: session.userId } : {}),
      }, userAgent, ip), {
        httpOnly: true,
        sameSite: "lax",
        secure: (isProduction || isHttps) && !allowInsecureCookies,
        path: "/",
        maxAge: 60 * 60 * 8,
      });
    }

    return response;
  } catch (err) {
    void err;
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
