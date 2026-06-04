import { getClientIp, requireSession } from "@/lib/auth";
import { auditEventFromRequest, recordAuditEvent } from "@/lib/audit-log";
import { validatePasswordPolicy } from "@/lib/password-policy";
import { clearRateLimit, consumeRateLimit } from "@/lib/rate-limit";
import { updateUserPassword, verifyCurrentPassword } from "@/lib/userStore";
import { NextRequest, NextResponse } from "next/server";

const MAX_CHANGE_ATTEMPTS = 5;
const LOCKOUT_WINDOW_SECONDS = 15 * 60;
const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
  "X-Content-Type-Options": "nosniff",
};

// ============ Password Validation ============
function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  const message = validatePasswordPolicy(password);
  return message ? { valid: false, message } : { valid: true };
}

function getRateLimitKey(req: NextRequest, username: string): string {
  return `auth:password-change:${getClientIp(req.headers)}:${username.toLowerCase()}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
    const confirmPassword = typeof body?.confirmPassword === "string" ? body.confirmPassword : "";

    const session = requireSession(req);
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired session" },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const rateLimitKey = getRateLimitKey(req, session.username);
    const rateLimit = await consumeRateLimit(rateLimitKey, MAX_CHANGE_ATTEMPTS, LOCKOUT_WINDOW_SECONDS);
    if (rateLimit.limited) {
      await recordAuditEvent(auditEventFromRequest(req, {
        action: "auth.password_change.rate_limited",
        actorUsername: session.username,
        actorRole: session.role,
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

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { ok: false, error: "All password fields are required" },
        { status: 400, headers: noStoreHeaders }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { ok: false, error: "New passwords do not match" },
        { status: 400, headers: noStoreHeaders }
      );
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { ok: false, error: passwordValidation.message },
        { status: 400, headers: noStoreHeaders }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyCurrentPassword(session.username, currentPassword);
    if (!isCurrentPasswordValid) {
      await recordAuditEvent(auditEventFromRequest(req, {
        action: "auth.password_change.failed",
        actorUsername: session.username,
        actorRole: session.role,
        resourceType: "auth",
        status: "failure",
        severity: "warning",
        metadata: { reason: "current_password_incorrect" },
      }));

      return NextResponse.json(
        { ok: false, error: "Current password is incorrect" },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const updateResult = await updateUserPassword(session.username, newPassword);
    if (!updateResult.ok) {
      const errorMessage = "error" in updateResult ? updateResult.error : "Failed to update password";
      return NextResponse.json(
        { ok: false, error: errorMessage },
        { status: errorMessage === "User not found" ? 404 : 400, headers: noStoreHeaders }
      );
    }

    await clearRateLimit(rateLimitKey);
    await recordAuditEvent(auditEventFromRequest(req, {
      action: "auth.password_change.success",
      actorUsername: session.username,
      actorRole: session.role,
      resourceType: "auth",
      status: "success",
    }));

    return NextResponse.json({ 
      ok: true, 
      message: "Password changed successfully" 
    }, { headers: noStoreHeaders });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to change password" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
