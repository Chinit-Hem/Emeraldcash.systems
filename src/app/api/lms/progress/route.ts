/**
 * LMS lesson progress API.
 *
 * GET  /api/lms/progress?lessonId=1
 * POST /api/lms/progress
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession, canAccessLMS } from "@/lib/auth-helpers";
import { dbManager } from "@/lib/db-singleton";
import { getRequestedStaffId, resolveLmsStaffContext } from "@/lib/lms-auth";

const COMPLETE_THRESHOLD_PERCENT = 95;

type ProgressRow = {
  staff_id: number;
  lesson_id: number;
  current_time_seconds: number | string | null;
  max_watched_seconds: number | string | null;
  duration_seconds: number | string | null;
  watch_percentage: number | string | null;
  playback_rate_violations: number | string | null;
  tab_hidden_count: number | string | null;
  last_watched_at: string | null;
};

function toNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeProgress(row: ProgressRow | undefined, staffName: string) {
  return {
    staffName,
    currentTimeSeconds: toNumber(row?.current_time_seconds),
    maxWatchedSeconds: toNumber(row?.max_watched_seconds),
    durationSeconds: toNumber(row?.duration_seconds),
    watchPercentage: toNumber(row?.watch_percentage),
    playbackRateViolations: toNumber(row?.playback_rate_violations),
    tabHiddenCount: toNumber(row?.tab_hidden_count),
    lastWatchedAt: row?.last_watched_at ?? null,
    canComplete: toNumber(row?.watch_percentage) >= COMPLETE_THRESHOLD_PERCENT,
  };
}

async function ensureProgressTable() {
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
}

async function ensureLastWatchedTable() {
  // Table to track last watched lesson per staff - enables "Continue Learning" to show last accessed lesson
  await dbManager.executeUnsafe(`
    CREATE TABLE IF NOT EXISTS lms_last_watched (
      id SERIAL PRIMARY KEY,
      staff_id INTEGER NOT NULL REFERENCES lms_staff(id) ON DELETE CASCADE,
      lesson_id INTEGER NOT NULL REFERENCES lms_lessons(id) ON DELETE CASCADE,
      watched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(staff_id)
    )
  `);
}

// Type for last watched lesson response
type LastWatchedRow = {
  lesson_id: number;
  title: string | null;
  category_id: number | null;
  category_name: string | null;
  watched_at: string | null;
  watch_percentage: number | string | null;
};

export async function GET(request: NextRequest) {
  const session = getSession(request);

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  if (!canAccessLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Access denied - LMS access required" },
      { status: 403 }
    );
  }

  const lessonId = Number(new URL(request.url).searchParams.get("lessonId"));

  // Get last watched lesson (no lessonId parameter)
  if (!lessonId || lessonId <= 0) {
    await ensureLastWatchedTable();
    await ensureProgressTable();

    const staffContext = await resolveLmsStaffContext(
      request,
      session,
      getRequestedStaffId(request)
    );
    if (!staffContext.ok) {
      return staffContext.response;
    }

    // Admins without staff profile cannot track last watched
    if (staffContext.staffId === 0) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    const lastWatchedRows = await dbManager.executeUnsafe<LastWatchedRow>(
      `
        SELECT 
          lw.lesson_id,
          l.title,
          l.category_id,
          c.name as category_name,
          lw.watched_at,
          lp.watch_percentage
        FROM lms_last_watched lw
        JOIN lms_lessons l ON l.id = lw.lesson_id
        LEFT JOIN lms_categories c ON c.id = l.category_id
        WHERE lw.staff_id = $1
        LIMIT 1
      `,
      [staffContext.staffId]
    );

    if (!lastWatchedRows[0]) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    const row = lastWatchedRows[0];
    return NextResponse.json({
      success: true,
      data: {
        lessonId: row.lesson_id,
        title: row.title,
        categoryId: row.category_id,
        categoryName: row.category_name,
        watchedAt: row.watched_at,
        watchPercentage: toNumber(row.watch_percentage),
      },
    });
  }

  // Get progress for specific lesson
  if (!Number.isInteger(lessonId) || lessonId <= 0) {
    return NextResponse.json(
      { success: false, error: "lessonId is required" },
      { status: 400 }
    );
  }

  await ensureProgressTable();

  const staffContext = await resolveLmsStaffContext(
    request,
    session,
    getRequestedStaffId(request)
  );
  if (!staffContext.ok) {
    return staffContext.response;
  }

  const rows = await dbManager.executeUnsafe<ProgressRow>(
    `
      SELECT *
      FROM lms_lesson_progress
      WHERE staff_id = $1 AND lesson_id = $2
      LIMIT 1
    `,
    [staffContext.staffId, lessonId]
  );

  return NextResponse.json({
    success: true,
    data: normalizeProgress(rows[0], staffContext.staffName),
  });
}

export async function POST(request: NextRequest) {
  const session = getSession(request);

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  if (!canAccessLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Access denied - LMS access required" },
      { status: 403 }
    );
  }

  let body: {
    lessonId?: number;
    currentTimeSeconds?: number;
    maxWatchedSeconds?: number;
    durationSeconds?: number;
    playbackRateViolation?: boolean;
    tabHiddenPause?: boolean;
    staffId?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const lessonId = Number(body.lessonId);
  const durationSeconds = Math.max(0, Math.floor(toNumber(body.durationSeconds)));
  const currentTimeSeconds = Math.max(0, Math.floor(toNumber(body.currentTimeSeconds)));
  const maxWatchedSeconds = Math.max(
    currentTimeSeconds,
    Math.floor(toNumber(body.maxWatchedSeconds))
  );
  const watchPercentage =
    durationSeconds > 0
      ? Math.min(100, Number(((maxWatchedSeconds / durationSeconds) * 100).toFixed(2)))
      : 0;

  if (!Number.isInteger(lessonId) || lessonId <= 0) {
    return NextResponse.json(
      { success: false, error: "lessonId is required" },
      { status: 400 }
    );
  }

  await ensureProgressTable();

const staffContext = await resolveLmsStaffContext(
    request,
    session,
    getRequestedStaffId(request, body.staffId)
  );
  if (!staffContext.ok) {
    return staffContext.response;
  }

// Admins without staff profile can still track progress
  // For admins (staffId = 0), use NULL to bypass FK constraint since no staff profile exists
  const effectiveStaffId = staffContext.staffId === 0 ? null : staffContext.staffId;
  const effectiveStaffName = staffContext.staffId === 0 ? session.username : staffContext.staffName;

// Early return for admins without staff profile - no valid staff to track
  if (effectiveStaffId === null) {
    return NextResponse.json({
      success: true,
      data: normalizeProgress(undefined, effectiveStaffName),
    });
  }

const rows = await dbManager.executeUnsafe<ProgressRow>(
    `
      INSERT INTO lms_lesson_progress (
        staff_id,
        lesson_id,
        current_time_seconds,
        max_watched_seconds,
        duration_seconds,
        watch_percentage,
        playback_rate_violations,
        tab_hidden_count,
        last_watched_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      ON CONFLICT (staff_id, lesson_id)
      DO UPDATE SET
        current_time_seconds = LEAST(GREATEST(EXCLUDED.current_time_seconds, 0), GREATEST(lms_lesson_progress.max_watched_seconds, EXCLUDED.max_watched_seconds)),
        max_watched_seconds = GREATEST(lms_lesson_progress.max_watched_seconds, EXCLUDED.max_watched_seconds),
        duration_seconds = GREATEST(lms_lesson_progress.duration_seconds, EXCLUDED.duration_seconds),
        watch_percentage = CASE
          WHEN GREATEST(lms_lesson_progress.duration_seconds, EXCLUDED.duration_seconds) > 0
            THEN LEAST(
              100,
              ROUND(
                (
                  GREATEST(lms_lesson_progress.max_watched_seconds, EXCLUDED.max_watched_seconds)::numeric
                  / GREATEST(lms_lesson_progress.duration_seconds, EXCLUDED.duration_seconds)::numeric
                ) * 100,
                2
              )
            )
          ELSE 0
        END,
        playback_rate_violations = lms_lesson_progress.playback_rate_violations + EXCLUDED.playback_rate_violations,
        tab_hidden_count = lms_lesson_progress.tab_hidden_count + EXCLUDED.tab_hidden_count,
        last_watched_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `,
    [
      effectiveStaffId,
      lessonId,
      currentTimeSeconds,
      maxWatchedSeconds,
      durationSeconds,
      watchPercentage,
      body.playbackRateViolation ? 1 : 0,
      body.tabHiddenPause ? 1 : 0,
    ]
  );

  // Update last watched lesson - this enables "Continue Learning" to show the last video user watched
  await ensureLastWatchedTable();
  await dbManager.executeUnsafe(
    `
      INSERT INTO lms_last_watched (staff_id, lesson_id, watched_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (staff_id)
      DO UPDATE SET
        lesson_id = EXCLUDED.lesson_id,
        watched_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `,
    [effectiveStaffId, lessonId]
  );

  return NextResponse.json({
    success: true,
    data: normalizeProgress(rows[0], effectiveStaffName),
  });
}
