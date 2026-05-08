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
import { type LmsLesson, type SequentialLesson } from "@/lib/lms-schema";
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
};

function toLegacyLesson(lesson: LessonEntityLike): LmsLesson & Partial<SequentialLesson> {
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
    created_at: lesson.createdAt ?? "",
    updated_at: lesson.updatedAt ?? "",
    ...(lesson.isCompleted !== undefined ? { is_completed: lesson.isCompleted } : {}),
    ...(lesson.isUnlocked !== undefined ? { is_unlocked: lesson.isUnlocked } : {}),
    ...(lesson.completedAt !== undefined ? { completed_at: lesson.completedAt } : {}),
  };
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

  // If id is provided, fetch single lesson
  if (id) {
    const result = await lmsService.getLessonById(parseInt(id));

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error === "Lesson not found" ? 404 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data ? toLegacyLesson(result.data as LessonEntityLike) : null,
      meta: result.meta,
    });
  }

  // If all=true, fetch all lessons (for admin)
  if (all) {
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

    return NextResponse.json({
      success: true,
      data: legacyLessons,
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
      const cacheResult = await getCachedLessonsByCategory(categoryIdNum);
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
lessons = (result.data ?? []).map(l => toLegacyLesson(l)) as LmsLesson[];
        await setCachedLessonsByCategory(categoryIdNum, lessons);
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
    const cacheResult = await getCachedSequentialLessons(categoryIdNum, staffId);
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
      await setCachedSequentialLessons(categoryIdNum, staffId, legacySequentialLessons);
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

    return NextResponse.json({
      success: true,
      data: legacySequentialLessons,
      meta: result.meta,
    });
  }

  // Regular lessons list - CACHED
  // TRY CACHE FIRST (ultra-fast response)
  const cacheResult = await getCachedLessonsByCategory(categoryIdNum);
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
    await setCachedLessonsByCategory(categoryIdNum, legacyLessons);
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

  return NextResponse.json({
    success: true,
    data: legacyLessons,
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
    if (result.success && categoryId) {
      await invalidateCategoryCache(categoryId);
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data ? toLegacyLesson(result.data as LessonEntityLike) : null,
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

    // INVALIDATE CACHE
    if (result.success && typeof categoryId === "number") {
      await invalidateCategoryCache(categoryId);
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data ? toLegacyLesson(result.data as LessonEntityLike) : null,
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

    const result = await lmsService.deleteLesson(parseInt(id));

    // INVALIDATE CACHE for lesson's category
    if (result.success) {
      try {
        const lessonQuery = await lmsService.getLessonById(parseInt(id));
        if (lessonQuery.success && lessonQuery.data?.categoryId) {
          await invalidateCategoryCache(lessonQuery.data.categoryId);
        }
      } catch {}
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
