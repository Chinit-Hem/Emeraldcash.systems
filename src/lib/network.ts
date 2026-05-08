/**
 * Network utilities - shared across the application
 * Consolidated to avoid duplication between auth.ts and auth-edge.ts
 */

/**
 * Get client IP from request headers
 * Checks x-forwarded-for first (handles proxies), then x-real-ip
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return headers.get("x-real-ip") || "unknown";
}

/**
 * Get client user-agent from request headers
 */
export function getClientUserAgent(headers: Headers): string {
  return headers.get("user-agent") || "unknown";
}
