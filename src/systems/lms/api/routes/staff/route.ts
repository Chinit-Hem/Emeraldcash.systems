/**
 * LMS Staff API Route
 * 
 * GET /api/lms/staff - List all staff members (Admin only)
 * POST /api/lms/staff - Create new staff member (Admin only)
 * 
 * @module api/lms/staff
 */

import { NextRequest, NextResponse } from "next/server";
import { lmsService } from "@/systems/lms/services/LmsService";
import { canManageLMS, getSession } from "@/lib/auth-helpers";

type StaffEntityLike = {
  id: string | number;
  fullName: string;
  email: string | null;
  branchLocation: string | null;
  role: string;
  phone: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type StaffProgressLike = {
  staff_id: number;
  staff_name: string;
  branch: string | null;
  role: string;
  completed_lessons_count: number;
  total_lessons: number;
  completion_percentage: number;
  watched_lessons_count: number;
  in_progress_lessons_count: number;
  average_watch_percentage: number;
  latest_watch_percentage: number;
  last_completed_at: string | null;
  last_watched_at: string | null;
  last_watched_lesson_title: string | null;
  training_status: "not_started" | "watching" | "ready_to_complete" | "completed";
  last_activity: string | null;
};

function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() || "";
}

function toLegacyStaff(staff: StaffEntityLike, progress?: StaffProgressLike) {
  const staffId = Number(staff.id);

  return {
    id: staffId,
    staff_id: staffId,
    full_name: staff.fullName,
    staff_name: staff.fullName,
    email: staff.email,
    branch_location: staff.branchLocation,
    branch: staff.branchLocation,
    role: staff.role,
    phone: staff.phone,
    is_active: staff.isActive,
    created_at: staff.createdAt ?? null,
    updated_at: staff.updatedAt ?? null,
    completed_lessons_count: progress?.completed_lessons_count ?? 0,
    total_lessons: progress?.total_lessons ?? 0,
    completion_percentage: progress?.completion_percentage ?? 0,
    watched_lessons_count: progress?.watched_lessons_count ?? 0,
    in_progress_lessons_count: progress?.in_progress_lessons_count ?? 0,
    average_watch_percentage: progress?.average_watch_percentage ?? 0,
    latest_watch_percentage: progress?.latest_watch_percentage ?? 0,
    last_completed_at: progress?.last_completed_at ?? null,
    last_watched_at: progress?.last_watched_at ?? null,
    last_watched_lesson_title: progress?.last_watched_lesson_title ?? null,
    training_status: progress?.training_status ?? "not_started",
    last_activity: progress?.last_activity ?? null,
  };
}

// ============================================================================
// GET /api/lms/staff - Admin only
// ============================================================================

export async function GET(request: NextRequest) {
  const session = getSession(request);
  
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  // Only Admin can view staff list
  if (!canManageLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Admin access required to view staff" },
      { status: 403 }
    );
  }

  const [result, dashboardResult] = await Promise.all([
    lmsService.getStaff(),
    lmsService.getDashboardStats(),
  ]);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  }

  const progressByStaffId = new Map(
    (dashboardResult.success ? dashboardResult.data?.staff_progress ?? [] : []).map((progress) => [
      progress.staff_id,
      progress,
    ])
  );

  return NextResponse.json({
    success: true,
    data: (result.data ?? []).map((staff) => {
      const staffRecord = staff as StaffEntityLike;
      return toLegacyStaff(staffRecord, progressByStaffId.get(Number(staffRecord.id)));
    }),
    meta: result.meta,
  });
}

// ============================================================================
// POST /api/lms/staff - Admin only
// ============================================================================

export async function POST(request: NextRequest) {
  const session = getSession(request);
  
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  // Only Admin can create staff
  if (!canManageLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Admin access required to create staff" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const fullName = body.fullName ?? body.full_name;
    const branchLocation = body.branchLocation ?? body.branch_location;

    // Validate required fields
    if (!fullName || typeof fullName !== "string") {
      return NextResponse.json(
        { success: false, error: "full_name/fullName is required and must be a string" },
        { status: 400 }
      );
    }

    const result = await lmsService.createStaff({
      fullName,
      email: body.email,
      branchLocation: typeof branchLocation === "string" ? branchLocation : null,
      role: body.role,
      phone: body.phone,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data ? toLegacyStaff(result.data as StaffEntityLike) : null,
      meta: result.meta,
    }, { status: 201 });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// ============================================================================
// PUT /api/lms/staff?id=1 - Admin only
// ============================================================================

export async function PUT(request: NextRequest) {
  const session = getSession(request);
  
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  // Only Admin can update staff
  if (!canManageLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Admin access required to update staff" },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "id is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const fullName = body.fullName ?? body.full_name;
    const branchLocation = body.branchLocation ?? body.branch_location;
    const isActive = body.isActive ?? body.is_active;

    const result = await lmsService.updateStaff(parseInt(id), {
      fullName: typeof fullName === "string" ? fullName : undefined,
      email: body.email,
      branchLocation: typeof branchLocation === "string" ? branchLocation : undefined,
      role: body.role,
      phone: body.phone,
      isActive: typeof isActive === "boolean" ? isActive : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data ? toLegacyStaff(result.data as StaffEntityLike) : null,
      meta: result.meta,
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// ============================================================================
// DELETE /api/lms/staff?id=1 - Admin only
// ============================================================================

export async function DELETE(request: NextRequest) {
  const session = getSession(request);
  
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  // Only Admin can delete staff
  if (!canManageLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Admin access required to delete staff" },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "id is required" },
        { status: 400 }
      );
    }

    const staffId = Number.parseInt(id, 10);
    if (!Number.isInteger(staffId) || staffId <= 0) {
      return NextResponse.json(
        { success: false, error: "id must be a positive number" },
        { status: 400 }
      );
    }

    if (session.staffId && Number(session.staffId) === staffId) {
      return NextResponse.json(
        { success: false, error: "You cannot delete your own LMS staff record" },
        { status: 403 }
      );
    }

    const staffListResult = await lmsService.getStaff();
    const targetStaff = staffListResult.success
      ? staffListResult.data?.find((staff) => Number(staff.id) === staffId)
      : null;
    const currentUsername = normalizeText(session.username);

    if (
      targetStaff &&
      currentUsername &&
      (normalizeText(targetStaff.fullName) === currentUsername ||
        normalizeText(targetStaff.email) === currentUsername)
    ) {
      return NextResponse.json(
        { success: false, error: "You cannot delete your own LMS staff record" },
        { status: 403 }
      );
    }

    const result = await lmsService.deleteStaff(staffId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "Failed to delete staff" },
      { status: 500 }
    );
  }
}
