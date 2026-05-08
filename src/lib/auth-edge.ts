import type { Role } from "./types";
import { getClientIp, getClientUserAgent } from "./network";

// Session configuration
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
const SESSION_VERSION = 1;

export type EdgeSessionPayload = {
  username: string;
  role: Role;
  ts: number;
  version: number;
  fingerprint: string;
  staffId?: number;
  userId?: number;
};

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret) return secret;

  if (process.env.NODE_ENV === "development") {
    return "ec-vms-dev-secret-2024-do-not-use-in-production-ever-64chars-long!!";
  }

  throw new Error("SESSION_SECRET environment variable is required in production");
}

function base64UrlToBytes(input: string): Uint8Array {
  let base64 = input.replaceAll("-", "+").replaceAll("_", "/");
  const pad = base64.length % 4;
  if (pad === 2) base64 += "==";
  else if (pad === 3) base64 += "=";
  else if (pad !== 0) throw new Error("Invalid base64url");

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replaceAll("=", "").replaceAll("+", "-").replaceAll("/", "_");
}

async function sign(encodedPayload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(encodedPayload));
  return bytesToBase64Url(digest);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function parseSessionCookieEdge(session: string): Promise<EdgeSessionPayload | null> {
  try {
    const [encodedPayload, signature] = String(session || "").split(".");
    if (!encodedPayload || !signature) return null;

    const expectedSignature = await sign(encodedPayload, getSessionSecret());
    if (!safeEqual(signature, expectedSignature)) return null;

    const raw = new TextDecoder().decode(base64UrlToBytes(encodedPayload));
    const payload = JSON.parse(raw) as EdgeSessionPayload;

    if (payload.version !== SESSION_VERSION) return null;
    return payload;
  } catch {
    return null;
  }
}

export function validateSessionEdge(payload: EdgeSessionPayload): boolean {
  if (!payload.username || !payload.role) return false;
  if (Date.now() - payload.ts > SESSION_MAX_AGE_MS) return false;
  return payload.version === SESSION_VERSION;
}

export async function getSessionFromRequestEdge(
  sessionCookie: string | undefined
): Promise<EdgeSessionPayload | null> {
  if (!sessionCookie) return null;
  return parseSessionCookieEdge(sessionCookie);
}

// Re-export network utilities for backwards compatibility
export { getClientIp, getClientUserAgent } from "./network";
