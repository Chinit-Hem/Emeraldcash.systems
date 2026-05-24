import { requireSession } from "@/lib/auth";
import { updateUserPassword, verifyCurrentPassword } from "@/lib/userStore";
import { NextRequest, NextResponse } from "next/server";

// ============ Password Validation ============
function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 4) {
    return { valid: false, message: "Password must be at least 4 characters" };
  }

  // Check for common weak passwords
  const weakPasswords = ["1234", "123456", "password", "admin", "demo", "test"];
  if (weakPasswords.includes(password.toLowerCase())) {
    return { valid: false, message: "Password is too common" };
  }

  return { valid: true };
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
        { status: 401 }
      );
    }

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { ok: false, error: "All password fields are required" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { ok: false, error: "New passwords do not match" },
        { status: 400 }
      );
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { ok: false, error: passwordValidation.message },
        { status: 400 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyCurrentPassword(session.username, currentPassword);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { ok: false, error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    const updateResult = await updateUserPassword(session.username, newPassword);
    if (!updateResult.ok) {
      const errorMessage = "error" in updateResult ? updateResult.error : "Failed to update password";
      return NextResponse.json(
        { ok: false, error: errorMessage },
        { status: errorMessage === "User not found" ? 404 : 400 }
      );
    }

    return NextResponse.json({ 
      ok: true, 
      message: "Password changed successfully" 
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to change password" },
      { status: 500 }
    );
  }
}
