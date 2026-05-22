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
import { invalidateSequentialLessonsCache } from "@/lib/lms-cache";
import { canAccessLessonForRole } from "@/lib/lms-lesson-access";

const COMPLETE_THRESHOLD_PERCENT = 95;
const COMPLETE_END_TOLERANCE_SECONDS = 5;

type ProgressRow = {
  staff_id: number;
  lesson_id: number;
  current_time_seconds: number | string | null;
  max_watched_seconds: number | string | null;
  duration_seconds: number | string | null;
  watch_percentage: number | string | null;
  is_completed?: boolean | null;
  completed_at?: string | null;
  playback_rate_violations: number | string | null;
  tab_hidden_count: number | string | null;
  last_watched_at: string | null;
};

function toNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeProgress(row: ProgressRow | undefined, staffName: string) {
  const isCompleted = Boolean(row?.is_completed);
  const maxWatchedSeconds = toNumber(row?.max_watched_seconds);
  const durationSeconds = toNumber(row?.duration_seconds);
  const watchPercentage = isCompleted
    ? Math.max(toNumber(row?.watch_percentage), COMPLETE_THRESHOLD_PERCENT)
    : toNumber(row?.watch_percentage);
  const reachedVideoEnd =
    durationSeconds > 0 && maxWatchedSeconds >= Math.max(0, durationSeconds - COMPLETE_END_TOLERANCE_SECONDS);

  return {
    staffName,
    isCompleted,
    completedAt: row?.completed_at ?? null,
    currentTimeSeconds: toNumber(row?.current_time_seconds),
    maxWatchedSeconds,
    durationSeconds,
    watchPercentage,
    playbackRateViolations: toNumber(row?.playback_rate_violations),
    tabHiddenCount: toNumber(row?.tab_hidden_count),
    lastWatchedAt: row?.last_watched_at ?? null,
    canComplete: isCompleted || watchPercentage >= COMPLETE_THRESHOLD_PERCENT || reachedVideoEnd,
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

async function ensureCompletionTable() {
  await dbManager.executeUnsafe(`
    CREATE TABLE IF NOT EXISTS lms_lesson_completions (
      id SERIAL PRIMARY KEY,
      staff_id INTEGER NOT NULL REFERENCES lms_staff(id) ON DELETE CASCADE,
      lesson_id INTEGER NOT NULL REFERENCES lms_lessons(id) ON DELETE CASCADE,
      completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      time_spent_seconds INTEGER,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(staff_id, lesson_id)
    )
  `);
}

async function markLessonCompleteFromProgress(
  staffId: number,
  lessonId: number,
  timeSpentSeconds: number
) {
  await ensureCompletionTable();

  const existingRows = await dbManager.executeUnsafe<{ completed_at: string | null }>(
    `
      SELECT completed_at
      FROM lms_lesson_completions
      WHERE staff_id = $1 AND lesson_id = $2
      LIMIT 1
    `,
    [staffId, lessonId]
  );

  if (existingRows[0]) {
    await dbManager.executeUnsafe(
      `
        UPDATE lms_lesson_completions
        SET time_spent_seconds = CASE
          WHEN time_spent_seconds IS NULL THEN $3
          ELSE GREATEST(time_spent_seconds, $3)
        END
        WHERE staff_id = $1 AND lesson_id = $2
      `,
      [staffId, lessonId, timeSpentSeconds]
    );

    return {
      completedAt: existingRows[0].completed_at,
      inserted: false,
    };
  }

  const completionRows = await dbManager.executeUnsafe<{
    completed_at: string | null;
    category_id: number | string | null;
  }>(
    `
      WITH completed AS (
        INSERT INTO lms_lesson_completions (staff_id, lesson_id, time_spent_seconds)
        VALUES ($1, $2, $3)
        ON CONFLICT (staff_id, lesson_id)
        DO UPDATE SET
          time_spent_seconds = CASE
            WHEN lms_lesson_completions.time_spent_seconds IS NULL THEN EXCLUDED.time_spent_seconds
            ELSE GREATEST(lms_lesson_completions.time_spent_seconds, EXCLUDED.time_spent_seconds)
          END
        RETURNING lesson_id, completed_at
      )
      SELECT completed.completed_at, l.category_id
      FROM completed
      JOIN lms_lessons l ON l.id = completed.lesson_id
      LIMIT 1
    `,
    [staffId, lessonId, timeSpentSeconds]
  );

  const categoryId = Number(completionRows[0]?.category_id);
  if (Number.isInteger(categoryId) && categoryId > 0) {
    await invalidateSequentialLessonsCache(categoryId, staffId);
  }

  return {
    completedAt: completionRows[0]?.completed_at ?? null,
    inserted: true,
  };
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

function lastWatchedResponse(data: unknown) {
  return NextResponse.json(
    { success: true, data },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}

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
      return lastWatchedResponse(null);
    }

    const lastWatchedRows = await dbManager.executeUnsafe<LastWatchedRow>(
      `
        WITH recent_lessons AS (
          SELECT lesson_id, watched_at
          FROM lms_last_watched
          WHERE staff_id = $1

          UNION ALL

          SELECT lesson_id, last_watched_at AS watched_at
          FROM lms_lesson_progress
          WHERE staff_id = $1
        )
        SELECT 
          recent_lessons.lesson_id,
          l.title,
          l.category_id,
          c.name as category_name,
          recent_lessons.watched_at,
          lp.watch_percentage
        FROM recent_lessons
        JOIN lms_lessons l ON l.id = recent_lessons.lesson_id
        LEFT JOIN lms_categories c ON c.id = l.category_id
        LEFT JOIN lms_lesson_progress lp
          ON lp.staff_id = $1
          AND lp.lesson_id = recent_lessons.lesson_id
        ORDER BY recent_lessons.watched_at DESC NULLS LAST
        LIMIT 10
      `,
      [staffContext.staffId]
    );

    const visibleLastWatched = [];
    for (const row of lastWatchedRows) {
      if (await canAccessLessonForRole(Number(row.lesson_id), session.role)) {
        visibleLastWatched.push(row);
        break;
      }
    }

    if (!visibleLastWatched[0]) {
      return lastWatchedResponse(null);
    }

    const row = visibleLastWatched[0];
    return lastWatchedResponse({
      lessonId: row.lesson_id,
      title: row.title,
      categoryId: row.category_id,
      categoryName: row.category_name,
      watchedAt: row.watched_at,
      watchPercentage: toNumber(row.watch_percentage),
    });
  }

  // Get progress for specific lesson
  if (!Number.isInteger(lessonId) || lessonId <= 0) {
    return NextResponse.json(
      { success: false, error: "lessonId is required" },
      { status: 400 }
    );
  }

  if (!(await canAccessLessonForRole(lessonId, session.role))) {
    return NextResponse.json(
      { success: false, error: "Lesson not found" },
      { status: 404 }
    );
  }

  await ensureProgressTable();
  await ensureCompletionTable();

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
      SELECT
        lp.*,
        CASE WHEN lc.lesson_id IS NULL THEN false ELSE true END AS is_completed,
        lc.completed_at
      FROM lms_lesson_progress lp
      LEFT JOIN lms_lesson_completions lc
        ON lc.staff_id = lp.staff_id
        AND lc.lesson_id = lp.lesson_id
      WHERE lp.staff_id = $1 AND lp.lesson_id = $2
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

  if (!(await canAccessLessonForRole(lessonId, session.role))) {
    return NextResponse.json(
      { success: false, error: "Lesson not found" },
      { status: 404 }
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

  let progressData = normalizeProgress(rows[0], effectiveStaffName);

  if (progressData.canComplete) {
    const completion = await markLessonCompleteFromProgress(
      effectiveStaffId,
      lessonId,
      Math.max(maxWatchedSeconds, currentTimeSeconds)
    );

    progressData = {
      ...progressData,
      isCompleted: true,
      completedAt: completion.completedAt,
      watchPercentage: Math.max(progressData.watchPercentage, COMPLETE_THRESHOLD_PERCENT),
    };
  }

  return NextResponse.json({
    success: true,
    data: progressData,
  });
}
