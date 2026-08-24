import {
  createSessionCookie,
  getClientIp,
  getClientUserAgent,
} from "@/lib/auth";
import { auditEventFromRequest, recordAuditEvent } from "@/lib/audit-log";
import { clearRateLimit, consumeRateLimit } from "@/lib/rate-limit";
import { findLmsStaffForSession } from "@/systems/lms/utils/lms-auth";
import { authenticateUser } from "@/lib/userStore";
import { NextRequest, NextResponse } from "next/server";

// ============ Rate Limiting ============
const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_SECONDS = 15 * 60; // 15 minutes
const MAX_LOGIN_BODY_BYTES = 4 * 1024;
const MAX_PASSWORD_LENGTH = 72;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY?.trim();
const TURNSTILE_REQUIRED =
  Boolean(TURNSTILE_SECRET_KEY) || (IS_PRODUCTION && process.env.REQUIRE_TURNSTILE === "true");

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
  "X-Content-Type-Options": "nosniff",
};

function getRateLimitKey(ip: string, username: string): string {
  return `auth:login:${ip}:${username.toLowerCase()}`;
}

// ============ Password Validation ============
function validateLoginPassword(password: string): { valid: boolean; message?: string } {
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { valid: false, message: "Invalid username/password" };
  }
  return { valid: true };
}

function getContentLength(req: NextRequest): number | null {
  const rawLength = req.headers.get("content-length");
  if (!rawLength) return null;

  const parsedLength = Number(rawLength);
  if (!Number.isFinite(parsedLength) || parsedLength < 0) {
    return null;
  }

  return parsedLength;
}

async function verifyTurnstileToken(token: string, ip: string): Promise<boolean> {
  if (!TURNSTILE_REQUIRED) return true;
  if (!TURNSTILE_SECRET_KEY || !token) return false;

  const formData = new FormData();
  formData.append("secret", TURNSTILE_SECRET_KEY);
  formData.append("response", token);
  formData.append("remoteip", ip);

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: formData,
      cache: "no-store",
    });

    if (!response.ok) return false;

    const result = await response.json().catch(() => ({})) as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const userAgent = getClientUserAgent(req.headers);
  const contentLength = getContentLength(req);

  if (contentLength && contentLength > MAX_LOGIN_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Request body too large" },
      { status: 413, headers: noStoreHeaders }
    );
  }

  const body = await req.json().catch(() => ({}));
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const turnstileToken = typeof body?.turnstileToken === "string" ? body.turnstileToken : "";

  if (!username || !password) {
    await recordAuditEvent(auditEventFromRequest(req, {
      action: "auth.login.validation_failed",
      actorUsername: username || null,
      resourceType: "auth",
      status: "failure",
      severity: "warning",
      metadata: { reason: "missing_credentials" },
    }));

    return NextResponse.json(
      { ok: false, error: "Username and password required" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const rateLimitKey = getRateLimitKey(ip, username);
  const rateLimit = await consumeRateLimit(rateLimitKey, MAX_ATTEMPTS, LOCKOUT_WINDOW_SECONDS);

  if (rateLimit.limited) {
    await recordAuditEvent(auditEventFromRequest(req, {
      action: "auth.login.rate_limited",
      actorUsername: username,
      resourceType: "auth",
      status: "denied",
      severity: "warning",
      metadata: { attempts: rateLimit.count, retryAfter: rateLimit.retryAfter },
    }));

    return NextResponse.json(
      {
        ok: false,
        error: "Too many failed attempts. Please try again later.",
        retryAfter: rateLimit.retryAfter,
      },
      {
        status: 429,
        headers: {
          ...noStoreHeaders,
          "Retry-After": String(rateLimit.retryAfter ?? LOCKOUT_WINDOW_SECONDS),
        },
      }
    );
  }

  const passwordValidation = validateLoginPassword(password);
  if (!passwordValidation.valid) {
    await recordAuditEvent(auditEventFromRequest(req, {
      action: "auth.login.failed",
      actorUsername: username,
      resourceType: "auth",
      status: "failure",
      severity: "warning",
      metadata: { reason: "invalid_password_format" },
    }));

    return NextResponse.json(
      { ok: false, error: passwordValidation.message },
      { status: 401, headers: noStoreHeaders }
    );
  }

  const turnstileOk = await verifyTurnstileToken(turnstileToken, ip);
  if (!turnstileOk) {
    await recordAuditEvent(auditEventFromRequest(req, {
      action: "auth.login.security_check_failed",
      actorUsername: username,
      resourceType: "auth",
      status: "failure",
      severity: "warning",
      metadata: { reason: "turnstile_failed" },
    }));

    return NextResponse.json(
      { ok: false, error: "Security check failed. Please refresh and try again." },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const authenticatedUser = await authenticateUser(username, password);
  if (!authenticatedUser) {
    await recordAuditEvent(auditEventFromRequest(req, {
      action: "auth.login.failed",
      actorUsername: username,
      resourceType: "auth",
      status: "failure",
      severity: "warning",
      metadata: { reason: "invalid_credentials" },
    }));

    return NextResponse.json(
      { ok: false, error: "Invalid username/password" },
      { status: 401, headers: noStoreHeaders }
    );
  }

  // Successful login
  await clearRateLimit(rateLimitKey);

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
  } catch (err) {
    console.error("[LOGIN_API] Failed to create session:", err);
    await recordAuditEvent(auditEventFromRequest(req, {
      action: "auth.login.session_create_failed",
      actorUsername: authenticatedUser.username,
      actorRole: authenticatedUser.role,
      resourceType: "auth",
      status: "failure",
      severity: "critical",
    }));

    return NextResponse.json(
      { ok: false, error: "Failed to create session" },
      { status: 500, headers: noStoreHeaders }
    );
  }

  // Determine if cookie should use secure flag.
  // secure=true means cookie only sent over HTTPS.
  // For HTTP environments (localhost, LAN, some proxies), must be false.
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const isActuallyHttps = forwardedProto === "https" || req.nextUrl.protocol === "https:";
  
  // Only mark the session cookie as secure when the incoming request is actually HTTPS.
  // This is required for LAN HTTP environments (e.g. http://192.168.1.94:3000).
  const isSecureEnvironment = isActuallyHttps;


  const res = NextResponse.json({
    ok: true,
    user,
    message: "Login successful"
  }, { headers: noStoreHeaders });

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

  await recordAuditEvent(auditEventFromRequest(req, {
    action: "auth.login.success",
    actorUsername: authenticatedUser.username,
    actorRole: authenticatedUser.role,
    resourceType: "auth",
    status: "success",
  }));

  return res;
}
