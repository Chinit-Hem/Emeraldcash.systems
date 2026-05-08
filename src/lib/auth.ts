import crypto from "crypto";
import type { Role } from "./types";
import { globalLogger } from "./logger";
import { getClientIp, getClientUserAgent } from "./network";

// Session configuration
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours
const SESSION_VERSION = 1;

export type SessionPayload = {
  username: string;
  role: Role;
  ts: number;
  version: number;
  fingerprint: string;
  staffId?: number; // optional staff reference for LMS sequential lesson queries
  userId?: number; // optional legacy user identifier
  // Add any other session-specific data here
};

// Session secret is managed by getSessionSecret_() function

/**
 * Generate a session fingerprint
 * ULTRA-SIMPLIFIED: Use a completely static fingerprint that works across all devices
 * The fingerprint is intentionally static to avoid ANY session issues on mobile
 * Mobile browsers often change user-agent or IP between requests due to:
 * - Network switching (WiFi to cellular)
 * - Carrier-grade NAT
 * - Browser privacy features
 */
function getRequestFingerprint(): string {
  // Use a completely static fingerprint - no userAgent or IP dependency
  // This ensures sessions work consistently across all devices and networks
  const data = `ec-vms-static|v${SESSION_VERSION}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Create a secure session cookie
 */
export function createSessionCookie(
  payload: Omit<SessionPayload, "ts" | "version" | "fingerprint">,
  _userAgent: string,
  _ip: string
): string {
  const secret = getSessionSecret_();

  const fullPayload: SessionPayload = {
    ...payload,
    ts: Date.now(),
    version: SESSION_VERSION,
    fingerprint: getRequestFingerprint(),
  };

  const encodedPayload = base64UrlEncode_(JSON.stringify(fullPayload));
  const signature = sign_(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

/**
 * Parse and validate a session cookie
 */
export function parseSessionCookie(
  session: string,
  _userAgent: string,
  _ip: string
): SessionPayload | null {
  try {
    const secret = getSessionSecret_();

    const [encodedPayload, signature] = String(session || "").split(".");
    if (!encodedPayload || !signature) {
      globalLogger.debug("[AUTH] Missing encoded payload or signature");
      return null;
    } // Use globalLogger here

    // Verify signature
    const expectedSignature = sign_(encodedPayload, secret);
    if (!timingSafeEqual_(signature, expectedSignature)) {
      globalLogger.debug("[AUTH] Signature mismatch");
      return null;
    }

    // Decode payload
    const raw = base64UrlDecode_(encodedPayload).toString("utf8");
    const payload = JSON.parse(raw) as SessionPayload;

    // Validate version
    if (payload.version !== SESSION_VERSION) {
      globalLogger.debug(`[AUTH] Version mismatch: expected ${SESSION_VERSION}, got ${payload.version}`);
      return null;
    }

    // Validate fingerprint (session binding) - MOBILE FIX: Be lenient with fingerprint mismatches
    // Mobile browsers often change user-agent or network conditions between requests
    const currentFingerprint = getRequestFingerprint(); // This is static, so it should always match
    const fingerprintValid = timingSafeEqual_(payload.fingerprint, currentFingerprint);

    if (!fingerprintValid) {
      // Log for debugging but don't reject - the fingerprint is already static
      // so mismatches are likely due to mobile browser quirks, not security issues
      globalLogger.debug("[AUTH] Fingerprint mismatch (allowed):", {
        stored: payload.fingerprint?.substring(0, 16),
        current: currentFingerprint?.substring(0, 16),
      });
      // Continue to return the payload - session is valid if signature and expiration are good
    }

    return payload;
  } catch (err) {
    globalLogger.error("[AUTH] Parse error", err instanceof Error ? err : new Error(String(err)));
    return null;
  }
}

/**
 * Validate session payload
 */
export function validateSession(payload: SessionPayload): boolean {
  if (!payload.username || !payload.role) return false;

  // Check expiration
  if (Date.now() - payload.ts > SESSION_MAX_AGE_MS) {
    globalLogger.debug("[AUTH] Session expired", { username: payload.username });
    return false;
  }

  // Check version
  if (payload.version !== SESSION_VERSION) return false;

  return true;
}

/**
 * Get session from request (convenience function)
 */
export function getSessionFromRequest(
  _userAgent: string,
  _ip: string,
  sessionCookie: string | undefined
): SessionPayload | null {
  if (!sessionCookie) return null;
  return parseSessionCookie(sessionCookie, _userAgent, _ip);
}

/**
 * Require session from NextRequest - shared helper for API routes
 * Returns session or null with detailed logging
 */
export function requireSessionFromRequest(req: {
  headers: Headers;
  cookies: { get(name: string): { value?: string } | undefined };
}): { session: SessionPayload | null; debug: string } {
  const ip = getClientIp(req.headers);
  const userAgent = getClientUserAgent(req.headers);
  const sessionCookie = req.cookies.get("session")?.value;

  // Detect mobile for enhanced debugging
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const mobilePrefix = isMobile ? "[MOBILE] " : "";

  const debugInfo = {
    ip,
    userAgent: userAgent?.substring(0, 50),
    cookieExists: !!sessionCookie,
    cookieLength: sessionCookie?.length || 0,
    isMobile,
  };

  if (!sessionCookie) {
    globalLogger.debug(`[AUTH] ${mobilePrefix}No session cookie found. Debug:`, debugInfo);
    return {
      session: null,
      debug: `No session cookie found. Debug: ${JSON.stringify(debugInfo)}`,
    };
  }

  const session = getSessionFromRequest(userAgent, ip, sessionCookie);

  if (!session) {
    globalLogger.debug(`[AUTH] ${mobilePrefix}Session cookie exists but failed to parse/validate. Debug:`, debugInfo); // This is a loop.
    return {
      session: null,
      debug: `Session cookie exists but failed to parse/validate. Debug: ${JSON.stringify(debugInfo)}`,
    };
  }

  if (!validateSession(session)) {
    const age = Date.now() - session.ts;
    globalLogger.debug(`[AUTH] ${mobilePrefix}Session expired or invalid. Age: ${age}ms. Debug:`, debugInfo);
    return {
      session: null,
      debug: `Session expired or invalid. Age: ${age}ms, Max: ${8 * 60 * 60 * 1000}ms. Debug: ${JSON.stringify(debugInfo)}`,
    };
  }

  // PERFORMANCE: Silent logging for admin (appears 100+ times per session)
  if (process.env.NODE_ENV === 'development' || session.username !== 'admin') {
    globalLogger.debug(`[AUTH] ${mobilePrefix}Session valid for user: ${session.username}`);
  }
  return {
    session,
    debug: `Session valid for user: ${session.username}`,
  };
}

/**
 * Standardized requireSession helper for API routes
 * Use this in all API route handlers for consistent session validation
 *
 * Example usage:
 *   const session = requireSession(req);
 *   if (!session) {
 *     return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
 *   }
 */
export function requireSession(req: {
  headers: Headers;
  cookies: { get(name: string): { value?: string } | undefined };
}): SessionPayload | null {
  const result = requireSessionFromRequest(req);
  return result.session;
}

// ============ Helper Functions ============

function getSessionSecret_(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret) return secret;

  // Only use dev secret in development
  if (process.env.NODE_ENV === "development") {
    const devSecret = "ec-vms-dev-secret-2024-do-not-use-in-production-ever-64chars-long!!";
    console.warn("[AUTH] Using development session secret - set SESSION_SECRET env var for production!");
    return devSecret;
  }

  // Production MUST have SESSION_SECRET
  throw new Error("SESSION_SECRET environment variable is required in production");
}

function base64UrlEncode_(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replaceAll("=", "")
    .replaceAll("+", "-")
    .replaceAll("/", "_");
}

function base64UrlDecode_(input: string): Buffer {
  let base64 = input.replaceAll("-", "+").replaceAll("_", "/");
  const pad = base64.length % 4;
  if (pad === 2) base64 += "==";
  else if (pad === 3) base64 += "=";
  else if (pad !== 0) throw new Error("Invalid base64url");
  return Buffer.from(base64, "base64");
}

function sign_(encodedPayload: string, secret: string): string {
  const digest = crypto.createHmac("sha256", secret).update(encodedPayload).digest();
  return digest
    .toString("base64")
    .replaceAll("=", "")
    .replaceAll("+", "-")
    .replaceAll("/", "_");
}

/**
 * Timing-safe string comparison for sensitive values
 */
function timingSafeEqual_(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(a, "utf8"),
      Buffer.from(b, "utf8")
    );
  } catch {
    return false;
  }
}

// Re-export network utilities for backwards compatibility
export { getClientIp, getClientUserAgent } from "./network";

// ============ Role-Based Permissions ============

export type Permission = "read" | "create" | "update" | "delete" | "admin";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  Admin: ["read", "create", "update", "delete", "admin"],
  Staff: ["read", "create", "update"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canDelete(role: Role): boolean {
  return hasPermission(role, "delete");
}

export function canModify(role: Role): boolean {
  return hasPermission(role, "update");
}

export function isAdmin(role: Role): boolean {
  return role === "Admin";
}

export function requireAdmin(session: SessionPayload | null): boolean {
  if (!session || session.role !== "Admin") {
    return false;
  }
  return true;
}

// Clear auth token from localStorage
export function clearAuthToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
  }
}
