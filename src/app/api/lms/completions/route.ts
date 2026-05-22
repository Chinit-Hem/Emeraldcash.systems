/**
 * LMS Completions API Route
 * 
 * GET /api/lms/completions?staffId=1 - Get staff completions
 *   - Admin: Can view any staff member's completions
 *   - Staff: Can only view their own completions
 * 
 * POST /api/lms/completions - Mark lesson as complete
 *   - Admin: Can mark any lesson complete for any staff
 *   - Staff: Can only mark lessons complete for themselves
 * 
 * @module api/lms/completions
 */

import { NextRequest, NextResponse } from "next/server";
import { lmsService } from "@/services/LmsService";
import { canAccessLMS, canManageLMS, getSession } from "@/lib/auth-helpers";
import { logAuditEvent } from "@/lib/audit-log";
import { dbManager } from "@/lib/db-singleton";
import { resolveLmsStaffContext } from "@/lib/lms-auth";
import { invalidateSequentialLessonsCache } from "@/lib/lms-cache";
import { canAccessLessonForRole, filterLessonIdsForRole } from "@/lib/lms-lesson-access";

const REQUIRED_WATCH_PERCENTAGE = 95;

// ============================================================================
// GET /api/lms/completions?staffId=1
// ============================================================================

export async function GET(request: NextRequest) {
  const session = getSession(request);
  
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  // Both Admin and Staff can access completions
  if (!canAccessLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Access denied - LMS access required" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get("staffId") ?? searchParams.get("staff_id");

  const staffContext = await resolveLmsStaffContext(request, session, staffId);
  if (!staffContext.ok) {
    return staffContext.response;
  }

  const result = await lmsService.getStaffCompletions(staffContext.staffId);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  }

  const visibleLessonIds = await filterLessonIdsForRole(result.data ?? [], session.role);

  return NextResponse.json({
    success: true,
    data: visibleLessonIds,
    meta: result.meta,
  });
}

// ============================================================================
// POST /api/lms/completions
// ============================================================================

export async function POST(request: NextRequest) {
  const session = getSession(request);
  
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  // Both Admin and Staff can mark lessons complete
  if (!canAccessLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Access denied - LMS access required" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const lessonId = body.lessonId ?? body.lesson_id;
    const incomingStaffId = body.staffId ?? body.staff_id;
    const timeSpentSeconds = body.timeSpentSeconds ?? body.time_spent_seconds;

    // Validate required fields
    if (!lessonId || typeof lessonId !== "number") {
      return NextResponse.json(
        { success: false, error: "lesson_id/lessonId is required and must be a number" },
        { status: 400 }
      );
    }

const isAdmin = canManageLMS(session);
    const staffContext = await resolveLmsStaffContext(request, session, incomingStaffId);
    if (!staffContext.ok) {
      return staffContext.response;
    }
    const staffId = staffContext.staffId;

    if (!(await canAccessLessonForRole(lessonId, session.role))) {
      return NextResponse.json(
        { success: false, error: "Lesson not found" },
        { status: 404 }
      );
    }

    // Admins without staff profile can still mark their own lessons complete
    // staffId = 0 means admin without staff profile, allow completion without checking percentage
    if (staffId === 0 && isAdmin) {
      console.log('[COMPLETIONS API] Admin without staff profile - allowing completion');
      await logAuditEvent(request, session, {
        action: "lms.lesson.complete",
        entityType: "lms_lesson",
        entityId: lessonId,
        metadata: {
          staffId,
          adminWithoutStaffProfile: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          completed_at: new Date().toISOString(),
          time_spent_seconds: null,
        }
      }, { status: 201 });
    }

    await dbManager.executeUnsafe(`
      CREATE TABLE IF NOT EXISTS lms_lesson_progress (
        id SERIAL PRIMARY KEY,
        staff_id INTEGER NOT NULL REFERENCES lms_staff(id) ON DELETE CASCADE,
        lesson_id INTEGER NOT NULL REFERENCES lms_lessons(id) ON DELETE CASCADE,
        current_time_seconds INTEGER DEFAULT 0,
        max_watched_seconds INTEGER DEFAULT 0,
        duration_seconds INTEGER DEFAULT 0,
        watch_percentage NUMERIC(5,2) DEFAULT 0,
        playback_rate_violations INTEGER DEFAULT 0,
        tab_hidden_count INTEGER DEFAULT 0,
        last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(staff_id, lesson_id)
      )
    `);

    const progressRows = await dbManager.executeUnsafe<{ watch_percentage: number | string | null }>(
      `
        SELECT watch_percentage
        FROM lms_lesson_progress
        WHERE staff_id = $1 AND lesson_id = $2
        LIMIT 1
      `,
      [staffId, lessonId]
    );
    const watchPercentage = Number(progressRows[0]?.watch_percentage ?? 0);

    if (watchPercentage < REQUIRED_WATCH_PERCENTAGE) {
      return NextResponse.json(
        {
          success: false,
          error: `Please watch at least ${REQUIRED_WATCH_PERCENTAGE}% of the lesson before marking it complete.`,
          data: {
            watchPercentage,
            requiredPercentage: REQUIRED_WATCH_PERCENTAGE,
            staffId,
            isAdmin,
          },
        },
        { status: 403 }
      );
    }

    const result = await lmsService.markLessonComplete({
      staffId,
      lessonId,
      timeSpentSeconds: typeof timeSpentSeconds === "number" ? timeSpentSeconds : null,
      notes: body.notes,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    const lessonRows = await dbManager.executeUnsafe<{ category_id: number | string | null }>(
      `
        SELECT category_id
        FROM lms_lessons
        WHERE id = $1
        LIMIT 1
      `,
      [lessonId]
    );
    const categoryId = Number(lessonRows[0]?.category_id);
    if (Number.isInteger(categoryId) && categoryId > 0) {
      await invalidateSequentialLessonsCache(categoryId, staffId);
    }

    await logAuditEvent(request, session, {
      action: "lms.lesson.complete",
      entityType: "lms_lesson",
      entityId: lessonId,
      metadata: {
        staffId,
        timeSpentSeconds: typeof timeSpentSeconds === "number" ? timeSpentSeconds : null,
        watchPercentage,
      },
    });

    return NextResponse.json({
      success: true,
      data: result.data
        ? {
            completed_at: result.data.completedAt,
            time_spent_seconds: result.data.timeSpentSeconds,
          }
        : null,
      meta: result.meta,
    }, { status: 201 });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}
