import {
  getClientIp,
  getClientUserAgent,
  getSessionFromRequest,
  validateSession,
} from "@/lib/auth";
import { getUserByUsername } from "@/lib/user-db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const userAgent = getClientUserAgent(req.headers);
    const sessionCookie = req.cookies.get("session")?.value;

    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    if (!sessionCookie) {
      const res = NextResponse.json({ ok: false, error: "No session cookie" });
      // Add debug header for mobile troubleshooting
      res.headers.set("X-Auth-Debug", "no-cookie");
      return res;
    }

    const session = getSessionFromRequest(userAgent, ip, sessionCookie);
    if (!session || !validateSession(session)) {
      const res = NextResponse.json({ ok: false, error: "Invalid or expired session" });
      res.headers.set("X-Auth-Debug", "invalid-session");
      return res;
    }

    // Get full user profile from database
    const userProfile = await getUserByUsername(session.username);

    const res = NextResponse.json({
      ok: true,
      user: {
        username: session.username,
        role: session.role,
        full_name: userProfile?.full_name || null,
        email: userProfile?.email || null,
        phone: userProfile?.phone || null,
        bio: userProfile?.bio || null,
        profile_picture: userProfile?.profile_picture || null,
        created_at: userProfile?.created_at || null,
        updated_at: userProfile?.updated_at || null,
      },
    });

    // Add debug headers for mobile
    if (isMobile) {
      res.headers.set("X-Auth-Debug", "success");
      res.headers.set("X-User-Role", session.role);
    }

    return res;
  } catch (err) {
    void err;
    const res = NextResponse.json({ ok: false, error: "Internal error" });
    res.headers.set("X-Auth-Debug", "error");
    return res;
  }
}
