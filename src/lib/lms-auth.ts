import { NextRequest, NextResponse } from "next/server";
import { canManageLMS } from "@/lib/auth-helpers";
import type { SessionPayload } from "@/lib/auth";
import { dbManager } from "@/lib/db-singleton";

export type LmsStaffContext =
  | {
      ok: true;
      staffId: number;
      staffName: string;
      isAdmin: boolean;
    }
  | {
      ok: false;
      response: NextResponse;
    };

type StaffRow = {
  id: number | string;
  full_name: string | null;
  email: string | null;
};

function toPositiveInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function findStaffById(staffId: number) {
  const rows = await dbManager.executeUnsafe<StaffRow>(
    `
      SELECT id, full_name, email
      FROM lms_staff
      WHERE id = $1 AND is_active = true
      LIMIT 1
    `,
    [staffId]
  );

  return rows[0] ?? null;
}

export async function findLmsStaffForSession(session: SessionPayload) {
  try {
    const sessionStaffId = toPositiveInteger(session.staffId);
    if (sessionStaffId) {
      const staff = await findStaffById(sessionStaffId);
      if (staff) {
        return staff;
      }
    }

    const sessionUserId = toPositiveInteger(session.userId);
    if (sessionUserId) {
      const rows = await dbManager.executeUnsafe<StaffRow>(
        `
          SELECT id, full_name, email
          FROM lms_staff
          WHERE user_id = $1 AND is_active = true
          LIMIT 1
        `,
        [sessionUserId]
      );

      if (rows[0]) {
        return rows[0];
      }
    }

    const normalizedUsername = session.username.trim().toLowerCase();
    const rows = await dbManager.executeUnsafe<StaffRow>(
      `
        SELECT id, full_name, email
        FROM lms_staff
        WHERE is_active = true
          AND (
            LOWER(full_name) = $1
            OR LOWER(email) = $1
          )
        ORDER BY id
        LIMIT 1
      `,
      [normalizedUsername]
    );

    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function resolveLmsStaffContext(
  request: NextRequest,
  session: SessionPayload,
  requestedStaffId?: unknown
): Promise<LmsStaffContext> {
  const isAdmin = canManageLMS(session);
  const parsedRequestedStaffId = toPositiveInteger(requestedStaffId);

  // Admin requesting specific staff view
  if (isAdmin && parsedRequestedStaffId) {
    const staff = await findStaffById(parsedRequestedStaffId);

    if (!staff) {
      return {
        ok: false,
        response: NextResponse.json(
          { success: false, error: "Requested LMS staff member was not found" },
          { status: 404 }
        ),
      };
    }

    return {
      ok: true,
      staffId: Number(staff.id),
      staffName: staff.full_name || staff.email || `Staff #${staff.id}`,
      isAdmin,
    };
  }

  // Try to find staff profile for current session
  const sessionStaff = await findLmsStaffForSession(session);
  if (!sessionStaff) {
    // For admins without a staff profile, allow viewing without completion status
    if (isAdmin) {
      return {
        ok: true,
        staffId: 0,
        staffName: 'Admin',
        isAdmin: true,
      };
    }
    
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: isAdmin 
            ? "Your admin account is not linked to an LMS staff profile. Please add yourself to the LMS Staff list in the Admin panel to view sequential progress."
            : "No active LMS staff profile is linked to this user",
          code: "LMS_STAFF_PROFILE_REQUIRED",
          isAdmin
        },
        { status: 403 }
      ),
    };
  }

  const sessionStaffId = Number(sessionStaff.id);

  // Non-admin users can only access their own progress
  if (!isAdmin && parsedRequestedStaffId && parsedRequestedStaffId !== sessionStaffId) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Staff can only access their own LMS progress" },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    staffId: sessionStaffId,
    staffName: sessionStaff.full_name || sessionStaff.email || session.username,
    isAdmin,
  };
}

export function getRequestedStaffId(request: NextRequest, bodyStaffId?: unknown) {
  const urlStaffId = new URL(request.url).searchParams.get("staffId");
  return bodyStaffId ?? urlStaffId;
}
