/**
 * Auth Helpers - Simplified authentication utilities for API routes
 *
 * @module auth-helpers
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession, type SessionPayload } from "@/lib/auth";

import { DEFAULT_ROLE_PERMISSIONS, type Permission, type Role } from "@/shared/types/types";

/**
 * Auth result type
 */
export interface AuthResult {
  success: boolean;
  user?: {
    username: string;
    role: Role;
  };
  error?: string;
}

export type PermissionResult =
  | { session: SessionPayload; response: null }
  | { session: null; response: NextResponse };

function createAuthResponse(error: string, status: 401 | 403): NextResponse {
  return NextResponse.json(
    { ok: false, success: false, error },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    }
  );
}

export function hasAppPermission(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false;
  const legacyRoleMap: Record<string, string> = {
    "loan officer": "Loan Operations", "loan specialist": "Loan Operations", "collateral checker": "Loan Operations",
    "branch manager": "Manager / Approver", bm: "Manager / Approver", "credit manager": "Manager / Approver",
    accounting: "Finance", "finance manager": "Finance", "it executive (support and systems)": "IT Support", risk: "Risk & Compliance", "risk officer": "Risk & Compliance", "digital marketing": "Marketing", intern: "Intern / Read Only", ceo: "Executive Viewer",
  };
  const normalizedRole = legacyRoleMap[role.toLowerCase()] || role;
  const key = Object.keys(DEFAULT_ROLE_PERMISSIONS).find((candidate) => candidate.toLowerCase() === normalizedRole.toLowerCase());
  return key ? DEFAULT_ROLE_PERMISSIONS[key]?.includes(permission) ?? false : false;
}

export function requirePermission(req: NextRequest, permission: Permission): PermissionResult {
  const session = getSession(req);

  if (!session) {
    return {
      session: null,
      response: createAuthResponse("Unauthorized - Please log in", 401),
    };
  }

  if (!hasAppPermission(session.role, permission)) {
    return {
      session: null,
      response: createAuthResponse("Forbidden - Insufficient permissions", 403),
    };
  }

  return { session, response: null };
}

/**
 * Require authentication for API routes
 * Returns user info if authenticated, error message if not
 */
export async function requireAuth(req?: NextRequest): Promise<AuthResult> {
  if (!req) {
    return {
      success: false,
      error: "Request context is required",
    };
  }

  // Get session from request cookies
  const session = requireSession({
    headers: req.headers,
    cookies: {
      get: (name: string) => {
        const cookie = req.cookies.get(name);
        return cookie ? { value: cookie.value } : undefined;
      },
    },
  });

  if (!session) {
    return {
      success: false,
      error: "Unauthorized - Please log in",
    };
  }

  return {
    success: true,
    user: {
      username: session.username,
      role: session.role,
    },
  };
}

/**
 * Require specific role for API routes
 */
export async function requireRole(
  allowedRoles: Role[],
  req?: NextRequest
): Promise<AuthResult> {
  const auth = await requireAuth(req);

  if (!auth.success) {
    return auth;
  }

  if (!auth.user || !allowedRoles.includes(auth.user.role)) {
    return {
      success: false,
      error: "Insufficient permissions",
    };
  }

  return auth;
}

/**
 * Get session from NextRequest
 */
export function getSession(req: NextRequest): SessionPayload | null {
  return requireSession({
    headers: req.headers,
    cookies: {
      get: (name: string) => {
        const cookie = req.cookies.get(name);
        return cookie ? { value: cookie.value } : undefined;
      },
    },
  });
}

/**
 * Check if user is admin
 */
export function isAdmin(session: SessionPayload | null): boolean {
  return session?.role === "Admin";
}

/**
 * Check if user can manage LMS content (Admin only)
 */
export function canManageLMS(session: SessionPayload | null): boolean {
  return hasAppPermission(session?.role, "lms:manage");
}

/**
 * Check if user can access LMS (Admin or Staff)
 */
export function canAccessLMS(session: SessionPayload | null): boolean {
  return hasAppPermission(session?.role, "lms:view");
}

/**
 * Check if user is Staff (not Admin)
 */
export function isStaff(session: SessionPayload | null): boolean {
  return session?.role === "Staff";
}

/**
 * Check if user can view the LMS management panel
 */
export function canViewLMSAdmin(session: SessionPayload | null): boolean {
  return canManageLMS(session);
}
