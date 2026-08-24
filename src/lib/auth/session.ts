import crypto from "crypto";
import type { Role } from "@/shared/types/types";
import { globalLogger } from "@/lib/logger";
import { getClientIp, getClientUserAgent } from "@/lib/network";

// Session configuration
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours
const SESSION_VERSION = 1;
const MIN_SESSION_SECRET_LENGTH = 32;

// In-memory revocation store (per process)
const revokedSessionUsernames = new Map<string, number>();

export type SessionPayload = {
  username: string;
  role: Role;
  ts: number;
  version: number;
  fingerprint: string;
  staffId?: number;
  userId?: number;
};

function getSessionSecret_(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret) {
    if (process.env.NODE_ENV === "production" && secret.length < MIN_SESSION_SECRET_LENGTH) {
      throw new Error(
        `SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters in production`
      );
    }

    return secret;
  }

  if (process.env.NODE_ENV === "development") {
    const devSecret =
      "ec-vms-dev-secret-2024-do-not-use-in-production-ever-64chars-long!!";
    console.warn("[AUTH] Using development session secret - set SESSION_SECRET env var for production!");
    return devSecret;
  }

  throw new Error("SESSION_SECRET environment variable is required in production");
}

function getRequestFingerprint(): string {
  // ULTRA-SIMPLIFIED: completely static fingerprint for consistency across devices/networks
  const data = `ec-vms-static|v${SESSION_VERSION}`;
  return crypto.createHash("sha256").update(data).digest("hex");
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

function timingSafeEqual_(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

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
    }

    const expectedSignature = sign_(encodedPayload, secret);
    if (!timingSafeEqual_(signature, expectedSignature)) {
      globalLogger.debug("[AUTH] Signature mismatch");
      return null;
    }

    const raw = base64UrlDecode_(encodedPayload).toString("utf8");
    const payload = JSON.parse(raw) as SessionPayload;

    if (payload.version !== SESSION_VERSION) {
      globalLogger.debug(
        `[AUTH] Version mismatch: expected ${SESSION_VERSION}, got ${payload.version}`
      );
      return null;
    }

    // Fingerprint is static; be lenient if it mismatches.
    const currentFingerprint = getRequestFingerprint();
    const fingerprintValid = timingSafeEqual_(payload.fingerprint, currentFingerprint);

    if (!fingerprintValid) {
      globalLogger.debug("[AUTH] Fingerprint mismatch (allowed):", {
        stored: payload.fingerprint?.substring(0, 16),
        current: currentFingerprint?.substring(0, 16),
      });
    }

    return payload;
  } catch (err) {
    globalLogger.error(
      "[AUTH] Parse error",
      err instanceof Error ? err : new Error(String(err))
    );
    return null;
  }
}

export function validateSession(payload: SessionPayload): boolean {
  if (!payload.username || !payload.role) return false;

  if (Date.now() - payload.ts > SESSION_MAX_AGE_MS) {
    globalLogger.debug("[AUTH] Session expired", { username: payload.username });
    return false;
  }

  if (payload.version !== SESSION_VERSION) return false;

  if (isUserSessionRevoked(payload.username, payload.ts)) {
    globalLogger.debug("[AUTH] Session revoked", { username: payload.username });
    return false;
  }

  return true;
}

function isUserSessionRevoked(username: string, sessionIssuedAt: number): boolean {
  const normalizedUsername = username.trim().toLowerCase();
  const revokedAt = revokedSessionUsernames.get(normalizedUsername);
  return revokedAt !== undefined && sessionIssuedAt <= revokedAt;
}

function pruneExpiredSessionRevocations(): void {
  const now = Date.now();
  for (const [username, revokedAt] of revokedSessionUsernames) {
    if (now - revokedAt > SESSION_MAX_AGE_MS) {
      revokedSessionUsernames.delete(username);
    }
  }
}

export function revokeUserSessions(username: string): void {
  const normalizedUsername = username.trim().toLowerCase();
  if (!normalizedUsername) return;

  revokedSessionUsernames.set(normalizedUsername, Date.now());
  pruneExpiredSessionRevocations();
}

export function getSessionFromRequest(
  userAgent: string,
  ip: string,
  sessionCookie: string | undefined
): SessionPayload | null {
  if (!sessionCookie) return null;
  return parseSessionCookie(sessionCookie, userAgent, ip);
}

export function requireSessionFromRequest(req: {
  headers: Headers;
  cookies: { get(name: string): { value?: string } | undefined };
}): { session: SessionPayload | null; debug: string } {
  const ip = getClientIp(req.headers);
  const userAgent = getClientUserAgent(req.headers);
  const sessionCookie = req.cookies.get("session")?.value;

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
    globalLogger.debug(
      `[AUTH] ${mobilePrefix}Session cookie exists but failed to parse/validate. Debug:`,
      debugInfo
    );
    return {
      session: null,
      debug: `Session cookie exists but failed to parse/validate. Debug: ${JSON.stringify(debugInfo)}`,
    };
  }

  if (!validateSession(session)) {
    const age = Date.now() - session.ts;
    globalLogger.debug(
      `[AUTH] ${mobilePrefix}Session expired or invalid. Age: ${age}ms. Debug:`,
      debugInfo
    );
    return {
      session: null,
      debug: `Session expired or invalid. Age: ${age}ms, Max: ${8 * 60 * 60 * 1000}ms. Debug: ${JSON.stringify(debugInfo)}`,
    };
  }

  if (process.env.NODE_ENV === "development" || session.username !== "admin") {
    globalLogger.debug(`[AUTH] ${mobilePrefix}Session valid for user: ${session.username}`);
  }

  return {
    session,
    debug: `Session valid for user: ${session.username}`,
  };
}

export function requireSession(req: {
  headers: Headers;
  cookies: { get(name: string): { value?: string } | undefined };
}): SessionPayload | null {
  return requireSessionFromRequest(req).session;
}

