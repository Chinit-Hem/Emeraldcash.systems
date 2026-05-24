import {
  createSessionCookie,
  getClientIp,
  getClientUserAgent,
} from "@/lib/auth";
import { findLmsStaffForSession } from "@/systems/lms/utils/lms-auth";
import { authenticateUser } from "@/lib/userStore";
import { NextRequest, NextResponse } from "next/server";

// ============ Rate Limiting ============
interface RateLimitEntry {
  count: number;
  firstAttempt: number;
}

const loginAttempts = new Map<string, RateLimitEntry>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getRateLimitKey(ip: string, username: string): string {
  return `${ip}:${username.toLowerCase()}`;
}

function isRateLimited(key: string): { limited: boolean; remaining?: number; resetTime?: number } {
  const entry = loginAttempts.get(key);
  const now = Date.now();

  if (!entry) {
    return { limited: false, remaining: MAX_ATTEMPTS };
  }

  if (now - entry.firstAttempt < LOCKOUT_WINDOW_MS) {
    if (entry.count >= MAX_ATTEMPTS) {
      const remaining = Math.ceil((LOCKOUT_WINDOW_MS - (now - entry.firstAttempt)) / 1000);
      return { limited: true, remaining, resetTime: entry.firstAttempt + LOCKOUT_WINDOW_MS };
    }
    return { limited: false, remaining: MAX_ATTEMPTS - entry.count };
  }

  loginAttempts.delete(key);
  return { limited: false, remaining: MAX_ATTEMPTS };
}

function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const existing = loginAttempts.get(key);

  if (existing && now - existing.firstAttempt < LOCKOUT_WINDOW_MS) {
    existing.count += 1;
  } else {
    loginAttempts.set(key, { count: 1, firstAttempt: now });
  }
}

function recordSuccessfulAttempt(key: string): void {
  loginAttempts.delete(key);
}

// ============ Password Validation ============
function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 4) {
    return { valid: false, message: "Password must be at least 4 characters" };
  }
  return { valid: true };
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const userAgent = getClientUserAgent(req.headers);

  const body = await req.json().catch(() => ({}));
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  console.log(`[LOGIN_API] Attempt for user: ${username}`);

  if (!username || !password) {
    return NextResponse.json(
      { ok: false, error: "Username and password required" },
      { status: 400 }
    );
  }

  const rateLimitKey = getRateLimitKey(ip, username);
  const rateLimit = isRateLimited(rateLimitKey);

  if (rateLimit.limited) {
    return NextResponse.json(
      {
        ok: false,
        error: "Too many failed attempts. Please try again later.",
        retryAfter: rateLimit.remaining,
      },
      { status: 429 }
    );
  }

  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.valid) {
    recordFailedAttempt(rateLimitKey);
    return NextResponse.json(
      { ok: false, error: passwordValidation.message },
      { status: 400 }
    );
  }

  const authenticatedUser = await authenticateUser(username, password);
  if (!authenticatedUser) {
    recordFailedAttempt(rateLimitKey);
    return NextResponse.json(
      { ok: false, error: "Invalid username/password" },
      { status: 401 }
    );
  }

  // Successful login
  recordSuccessfulAttempt(rateLimitKey);

  const user = { username: authenticatedUser.username, role: authenticatedUser.role };
  let sessionCookie = "";

  try {
    const lmsStaff = await findLmsStaffForSession({
      ...user,
      ts: Date.now(),
      version: 1,
      fingerprint: "",
    });

    sessionCookie = createSessionCookie(
      {
        ...user,
        ...(lmsStaff ? { staffId: Number(lmsStaff.id) } : {}),
      },
      userAgent,
      ip
    );
    console.log(`[LOGIN_API] Session created for ${username}`);
  } catch (err) {
    console.error("[LOGIN_API] Failed to create session:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to create session" },
      { status: 500 }
    );
  }

  // Determine if cookie should use secure flag.
  // secure=true means cookie only sent over HTTPS.
  // For HTTP environments (localhost, LAN, some proxies), must be false.
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const isActuallyHttps = forwardedProto === "https" || req.nextUrl.protocol === "https:";
  
  // Allow override via env var for special deployments
  const forceInsecureCookies = process.env.ALLOW_HTTP_COOKIES === "true";
  const isSecureEnvironment = isActuallyHttps && !forceInsecureCookies;

  // Get host for debugging.
  const host = req.headers.get("host") || "";

  // Detect mobile browser for debugging
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  const res = NextResponse.json({
    ok: true,
    user,
    message: "Login successful"
  });

  // Cookie options for maximum compatibility including Safari ITP (Intelligent Tracking Prevention)
  // - httpOnly: prevents JavaScript access (security)
  // - sameSite: "lax" REQUIRED for Safari ITP - allows cookies on same-site requests and top-level navigation
  // - secure: only send over HTTPS (disabled for HTTP dev environments, REQUIRED for Safari ITP)
  // - path: "/" makes cookie available to all routes
  // - maxAge: 8 hours session duration
  const cookieOptions: {
    httpOnly: boolean;
    sameSite: "lax" | "none" | "strict";
    secure: boolean;
    path: string;
    maxAge: number;
  } = {
    httpOnly: true,
    sameSite: "lax" as const, // Safari ITP compatible - allows cookies in 3rd party contexts with user interaction
    secure: isSecureEnvironment, // Must be true for Safari ITP when on HTTPS
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  };
  
  res.cookies.set("session", sessionCookie, cookieOptions);

  console.log(`[LOGIN_API] Cookie set for ${username}`);
  console.log(`[LOGIN_API] Cookie options:`, {
    httpOnly: cookieOptions.httpOnly,
    sameSite: cookieOptions.sameSite,
    secure: cookieOptions.secure,
    path: cookieOptions.path,
    maxAge: cookieOptions.maxAge,
    valueLength: sessionCookie.length,
  });
  console.log(
    `[LOGIN_API] Host: ${host}, protocol=${forwardedProto || req.nextUrl.protocol}, isSecure: ${isSecureEnvironment}, isMobile: ${isMobile}`
  );

  return res;
}
