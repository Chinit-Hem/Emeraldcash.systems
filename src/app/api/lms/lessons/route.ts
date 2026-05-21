/**
 * LMS Lessons API Route
 * 
 * GET /api/lms/lessons?categoryId=1 - List lessons by category (Admin & Staff)
 * POST /api/lms/lessons - Create new lesson (Admin only)
 * 
 * @module api/lms/lessons
 */

import { canAccessLMS, canManageLMS, getSession } from "@/lib/auth-helpers";
import { getRequestedStaffId, resolveLmsStaffContext } from "@/lib/lms-auth";
import { getCachedLessonsByCategory, getCachedSequentialLessons, invalidateCategoryCache, setCachedLessonsByCategory, setCachedSequentialLessons } from "@/lib/lms-cache";
import {
  attachAllowedRolesToLessons,
  canRoleAccessLesson,
  normalizeLessonAudienceRoles,
  recomputeSequentialUnlocks,
  setLessonAllowedRoles,
} from "@/lib/lms-lesson-access";
import { type LmsLesson, type SequentialLesson } from "@/lib/lms-schema";
import type { Role } from "@/lib/types";
import { lmsService } from "@/services/LmsService";
import { NextRequest, NextResponse } from "next/server";

type LessonEntityLike = {
  id: string | number;
  categoryId: number;
  title: string;
  description: string | null;
  youtubeUrl: string;
  youtubeVideoId: string;
  thumbnailUrl?: string | null;
  thumbnailCloudinaryPublicId?: string | null;
  stepByStepInstructions: string | null;
  durationMinutes: number | null;
  orderIndex: number;
  isActive: boolean;
  isCompleted?: boolean;
  isUnlocked?: boolean;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  allowedRoles?: string[];
  allowed_roles?: string[];
};

function toLegacyLesson(lesson: LessonEntityLike): LmsLesson & Partial<SequentialLesson> {
  const allowedRoles = normalizeLessonAudienceRoles(lesson.allowedRoles ?? lesson.allowed_roles);

  return {
    id: Number(lesson.id),
    category_id: lesson.categoryId,
    title: lesson.title,
    description: lesson.description,
    youtube_url: lesson.youtubeUrl,
    youtube_video_id: lesson.youtubeVideoId,
    thumbnail_url: lesson.thumbnailUrl ?? null,
    thumbnail_cloudinary_public_id: lesson.thumbnailCloudinaryPublicId ?? null,
    step_by_step_instructions: lesson.stepByStepInstructions,
    duration_minutes: lesson.durationMinutes,
    order_index: lesson.orderIndex,
    is_active: lesson.isActive,
    allowed_roles: allowedRoles,
    created_at: lesson.createdAt ?? "",
    updated_at: lesson.updatedAt ?? "",
    ...(lesson.isCompleted !== undefined ? { is_completed: lesson.isCompleted } : {}),
    ...(lesson.isUnlocked !== undefined ? { is_unlocked: lesson.isUnlocked } : {}),
    ...(lesson.completedAt !== undefined ? { completed_at: lesson.completedAt } : {}),
  };
}

async function prepareLessonsForRole<T extends LmsLesson & Partial<SequentialLesson>>(
  lessons: T[],
  role: Role
) {
  const lessonsWithRoles = await attachAllowedRolesToLessons(lessons);

  if (role === "Admin") {
    return lessonsWithRoles;
  }

  return lessonsWithRoles.filter((lesson) =>
    canRoleAccessLesson(role, lesson.allowed_roles)
  );
}

function hasLessonAudienceInput(body: Record<string, unknown>) {
  return (
    body.allowedRoles !== undefined ||
    body.allowed_roles !== undefined ||
    body.accountingOnly !== undefined ||
    body.accounting_only !== undefined
  );
}

function getLessonAudienceFromBody(body: Record<string, unknown>) {
  if (body.accountingOnly === true || body.accounting_only === true) {
    return ["Accounting"];
  }

  return normalizeLessonAudienceRoles(body.allowedRoles ?? body.allowed_roles);
}

// ============================================================================
// GET /api/lms/lessons?categoryId=1 or ?id=1 - Both Admin and Staff can view
// ============================================================================

export async function GET(request: NextRequest) {
  const session = getSession(request);
  
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  // Both Admin and Staff can view lessons for learning
  if (!canAccessLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Access denied - LMS access required" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");
  const id = searchParams.get("id");
  const sequential = searchParams.get("sequential") === "true";
  const all = searchParams.get("all") === "true";
  const isAdmin = canManageLMS(session);
  const viewerRole = session.role;

  // If id is provided, fetch single lesson
  if (id) {
    const result = await lmsService.getLessonById(parseInt(id));

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error === "Lesson not found" ? 404 : 500 }
      );
    }

    const legacyLesson = result.data ? toLegacyLesson(result.data as LessonEntityLike) : null;
    const visibleLessons = legacyLesson
      ? await prepareLessonsForRole([legacyLesson], viewerRole)
      : [];

    if (legacyLesson && visibleLessons.length === 0) {
      return NextResponse.json(
        { success: false, error: "Lesson not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: visibleLessons[0] ?? null,
      meta: result.meta,
    });
  }

  // If all=true, fetch all lessons (for admin)
  if (all) {
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Admin access required to view all lessons" },
        { status: 403 }
      );
    }

    const result = await lmsService.getAllLessons();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    const legacyLessons = (result.data ?? []).map((lesson) =>
      toLegacyLesson(lesson as LessonEntityLike)
    );
    const lessonsWithRoles = await prepareLessonsForRole(legacyLessons, viewerRole);

    return NextResponse.json({
      success: true,
      data: lessonsWithRoles,
      meta: result.meta,
    });
  }

  // Otherwise, require categoryId
  if (!categoryId) {
    return NextResponse.json(
      { success: false, error: "Either id, categoryId, or all=true is required" },
      { status: 400 }
    );
  }

  const categoryIdNum = parseInt(categoryId);

// If sequential mode, return lessons with unlock status
  if (sequential) {
    const staffContext = await resolveLmsStaffContext(
      request,
      session,
      getRequestedStaffId(request)
    );
    if (!staffContext.ok) {
      return staffContext.response;
    }
    const staffId = staffContext.staffId;
    
// If staffId is 0 (admin without staff profile), return all lessons as unlocked
    // Admins can access all lessons regardless of completion status
    if (staffId === 0) {
      console.log('[LESSONS API] Admin without staff profile - all lessons unlocked');
      const cacheResult = await getCachedLessonsByCategory(categoryIdNum, viewerRole);
      let lessons: LmsLesson[];

      if (cacheResult.success) {
        lessons = cacheResult.data as LmsLesson[];
      } else {
        const result = await lmsService.getLessonsByCategory(categoryIdNum);
        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 500 }
          );
        }
        const legacyLessons = (result.data ?? []).map(l => toLegacyLesson(l)) as LmsLesson[];
        lessons = await prepareLessonsForRole(legacyLessons, viewerRole);
        await setCachedLessonsByCategory(categoryIdNum, lessons, viewerRole);
      }

      // Add is_unlocked=true and is_completed=false for all lessons for admins
      const lessonsWithStatus = lessons.map((lesson) => ({
        ...lesson,
        is_unlocked: true,
        is_completed: false,
        completed_at: null,
      }));
      
      return NextResponse.json({
        success: true,
        data: lessonsWithStatus,
        meta: { staffId: 0 }
      });
    }
    
    // TRY CACHE FIRST (99% hit rate expected)
    const cacheResult = await getCachedSequentialLessons(categoryIdNum, staffId, viewerRole);
    if (cacheResult.success) {
      return NextResponse.json({
        success: true,
        data: cacheResult.data,
        meta: {
          ...cacheResult,
          fromCache: true,
          dbDurationMs: 0
        }
      }, {
        headers: { 'X-Cache': 'HIT' }
      });
    }
    
    // CACHE MISS - Database fetch + cache result
    const result = await lmsService.getSequentialLessonsForStaff(categoryIdNum, staffId);
    
    if (result.success) {
      const legacySequentialLessons = (result.data ?? []).map((lesson) =>
        toLegacyLesson(lesson as LessonEntityLike)
      ) as SequentialLesson[];
      const visibleSequentialLessons = recomputeSequentialUnlocks(
        await prepareLessonsForRole(legacySequentialLessons, viewerRole)
      ) as SequentialLesson[];
      await setCachedSequentialLessons(categoryIdNum, staffId, visibleSequentialLessons, viewerRole);
    }
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

const legacySequentialLessons = (result.data ?? []).map((lesson) =>
      toLegacyLesson(lesson as LessonEntityLike)
    ) as SequentialLesson[];
    const visibleSequentialLessons = recomputeSequentialUnlocks(
      await prepareLessonsForRole(legacySequentialLessons, viewerRole)
    ) as SequentialLesson[];

    return NextResponse.json({
      success: true,
      data: visibleSequentialLessons,
      meta: result.meta,
    });
  }

  // Regular lessons list - CACHED
  // TRY CACHE FIRST (ultra-fast response)
  const cacheResult = await getCachedLessonsByCategory(categoryIdNum, viewerRole);
  if (cacheResult.success) {
    return NextResponse.json({
      success: true,
      data: cacheResult.data as LmsLesson[],
      meta: {
        ...cacheResult,
        fromCache: true,
        dbDurationMs: 0
      }
    }, {
      headers: { 'X-Cache': 'HIT' }
    });
  }
  
  // CACHE MISS - DB + cache
  const result = await lmsService.getLessonsByCategory(categoryIdNum);
  
  if (result.success) {
    const legacyLessons = (result.data ?? []).map((lesson) =>
      toLegacyLesson(lesson as LessonEntityLike)
    ) as LmsLesson[];
    const visibleLessons = await prepareLessonsForRole(legacyLessons, viewerRole);
    await setCachedLessonsByCategory(categoryIdNum, visibleLessons, viewerRole);
  }
  
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  }

  const legacyLessons = (result.data ?? []).map((lesson) =>
    toLegacyLesson(lesson as LessonEntityLike)
  );
  const visibleLessons = await prepareLessonsForRole(legacyLessons, viewerRole);

  return NextResponse.json({
    success: true,
    data: visibleLessons,
    meta: result.meta,
  });

}

// ============================================================================
// POST /api/lms/lessons - Admin only
// ============================================================================

export async function POST(request: NextRequest) {
  const session = getSession(request);
  
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  // Only Admin can create lessons
  if (!canManageLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Admin access required to create lessons" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const categoryId = body.categoryId ?? body.category_id;
    const youtubeUrl = body.youtubeUrl ?? body.youtube_url;
    const stepByStepInstructions = body.stepByStepInstructions ?? body.step_by_step_instructions;
    const durationMinutes = body.durationMinutes ?? body.duration_minutes;
    const orderIndex = body.orderIndex ?? body.order_index;
    const allowedRoles = getLessonAudienceFromBody(body);

    // Validate required fields
    if (!categoryId || typeof categoryId !== "number") {
      return NextResponse.json(
        { success: false, error: "category_id/categoryId is required and must be a number" },
        { status: 400 }
      );
    }

    if (!body.title || typeof body.title !== "string") {
      return NextResponse.json(
        { success: false, error: "title is required and must be a string" },
        { status: 400 }
      );
    }

    if (!youtubeUrl || typeof youtubeUrl !== "string") {
      return NextResponse.json(
        { success: false, error: "youtube_url/youtubeUrl is required and must be a string" },
        { status: 400 }
      );
    }

    const result = await lmsService.createLesson({
      categoryId,
      title: body.title,
      description: body.description,
      youtubeUrl,
      stepByStepInstructions,
      durationMinutes: typeof durationMinutes === "number" ? durationMinutes : undefined,
      orderIndex: typeof orderIndex === "number" ? orderIndex : undefined,
    });

    // INVALIDATE CACHE for this category
    if (result.success && result.data) {
      await setLessonAllowedRoles(Number(result.data.id), allowedRoles);
    }

    if (result.success && categoryId) {
      await invalidateCategoryCache(categoryId);
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    const responseLesson = result.data
      ? (await prepareLessonsForRole([toLegacyLesson(result.data as LessonEntityLike)], session.role))[0] ?? null
      : null;

    return NextResponse.json({
      success: true,
      data: responseLesson,
      meta: result.meta,
    }, {
      status: 201,
      headers: { 'X-Cache': 'INVALIDATED' }
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// ============================================================================
// PUT /api/lms/lessons?id=1 - Admin only
// ============================================================================

export async function PUT(request: NextRequest) {
  const session = getSession(request);
  
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  // Only Admin can update lessons
  if (!canManageLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Admin access required to update lessons" },
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
    const categoryId = body.categoryId ?? body.category_id;
    const youtubeUrl = body.youtubeUrl ?? body.youtube_url;
    const stepByStepInstructions = body.stepByStepInstructions ?? body.step_by_step_instructions;
    const durationMinutes = body.durationMinutes ?? body.duration_minutes;
    const orderIndex = body.orderIndex ?? body.order_index;
    const isActive = body.isActive ?? body.is_active;
    const shouldUpdateAudience = hasLessonAudienceInput(body);
    const allowedRoles = getLessonAudienceFromBody(body);

    const result = await lmsService.updateLesson(parseInt(id), {
      categoryId: typeof categoryId === "number" ? categoryId : undefined,
      title: body.title,
      description: body.description,
      youtubeUrl: typeof youtubeUrl === "string" ? youtubeUrl : undefined,
      stepByStepInstructions,
      durationMinutes: typeof durationMinutes === "number" ? durationMinutes : undefined,
      orderIndex: typeof orderIndex === "number" ? orderIndex : undefined,
      isActive: typeof isActive === "boolean" ? isActive : undefined,
    });

    if (result.success && shouldUpdateAudience) {
      await setLessonAllowedRoles(parseInt(id), allowedRoles);
    }

    // INVALIDATE CACHE
    if (result.success && typeof categoryId === "number") {
      await invalidateCategoryCache(categoryId);
    } else if (result.success && result.data?.categoryId) {
      await invalidateCategoryCache(result.data.categoryId);
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    const responseLesson = result.data
      ? (await prepareLessonsForRole([toLegacyLesson(result.data as LessonEntityLike)], session.role))[0] ?? null
      : null;

    return NextResponse.json({
      success: true,
      data: responseLesson,
      meta: result.meta,
    }, {
      headers: { 'X-Cache': 'INVALIDATED' }
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// ============================================================================
// DELETE /api/lms/lessons?id=1 - Admin only
// ============================================================================

export async function DELETE(request: NextRequest) {
  const session = getSession(request);
  
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  // Only Admin can delete lessons
  if (!canManageLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Admin access required to delete lessons" },
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

    const existingLesson = await lmsService.getLessonById(parseInt(id));
    const result = await lmsService.deleteLesson(parseInt(id));

    // INVALIDATE CACHE for lesson's category
    if (result.success && existingLesson.success && existingLesson.data?.categoryId) {
      await invalidateCategoryCache(existingLesson.data.categoryId);
    }

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
    }, {
      headers: { 'X-Cache': 'INVALIDATED' }
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "Failed to delete lesson" },
      { status: 500 }
    );
  }
}
