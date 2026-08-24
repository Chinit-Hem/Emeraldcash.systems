// auth.ts is kept as a backwards-compatible facade.
// New internal organization:
// - src/lib/auth/session.ts: session cookie + validation
// - src/lib/auth/permissions.ts: RBAC utilities
// - src/lib/auth/token.ts: browser-only helpers

export type { SessionPayload } from "@/lib/auth/session";

export {
  createSessionCookie,
  parseSessionCookie,
  validateSession,
  revokeUserSessions,
  getSessionFromRequest,
  requireSessionFromRequest,
  requireSession,
} from "@/lib/auth/session";

export type { Permission } from "@/lib/auth/permissions";
export {
  hasPermission,
  canDelete,
  canModify,
  isAdmin,
  requireAdmin,
} from "@/lib/auth/permissions";

export { clearAuthToken } from "@/lib/auth/token";

// Re-export network utilities for backwards compatibility
export { getClientIp, getClientUserAgent } from "@/lib/network";

