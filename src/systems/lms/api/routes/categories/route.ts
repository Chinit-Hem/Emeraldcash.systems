/**
 * LMS Categories API Route
 *
 * GET /api/lms/categories - List all categories (Admin & Staff can view)
 * POST /api/lms/categories - Create new category (Admin only)
 *
 * @module api/lms/categories
 */

import { NextRequest, NextResponse } from "next/server";
import { lmsService } from "@/systems/lms/services/LmsService";
import { canAccessLMS, canManageLMS, getSession } from "@/lib/auth-helpers";
import { getVisibleLessonCountsByCategory } from "@/systems/lms/services/lms-lesson-access";

type CategoryEntityLike = {
  id: string | number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  orderIndex: number;
  isActive: boolean;
  lessonCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

function toLegacyCategory(category: CategoryEntityLike) {
  return {
    id: Number(category.id),
    name: category.name,
    description: category.description,
    icon: category.icon,
    color: category.color,
    order_index: category.orderIndex,
    is_active: category.isActive,
    lesson_count: category.lessonCount ?? 0,
    created_at: category.createdAt ?? null,
    updated_at: category.updatedAt ?? null,
  };
}

// ============================================================================
// GET /api/lms/categories - Both Admin and Staff can view
// ============================================================================

export async function GET(request: NextRequest) {
  const session = getSession(request);

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  // Both Admin and Staff can view categories for learning
  if (!canAccessLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Access denied - LMS access required" },
      { status: 403 }
    );
  }

  const result = await lmsService.getCategories();

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  }

  const isAdmin = canManageLMS(session);
  const visibleCountsByCategory = await getVisibleLessonCountsByCategory(session.role);
  const legacyCategories = (result.data ?? [])
    .map((category) => {
      const legacyCategory = toLegacyCategory(category as CategoryEntityLike);
      return {
        ...legacyCategory,
        lesson_count: visibleCountsByCategory.get(legacyCategory.id) ?? 0,
      };
    })
    .filter((category) => isAdmin || category.lesson_count > 0);

  return NextResponse.json({
    success: true,
    data: legacyCategories,
    meta: result.meta,
  });
}

// ============================================================================
// POST /api/lms/categories - Admin only
// ============================================================================

export async function POST(request: NextRequest) {
  const session = getSession(request);

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  // Only Admin can create categories
  if (!canManageLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Admin access required to create categories" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const orderIndexRaw = body.orderIndex ?? body.order_index;

    // Validate required fields
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        { success: false, error: "Name is required and must be a string" },
        { status: 400 }
      );
    }

    const result = await lmsService.createCategory({
      name: body.name,
      description: body.description,
      icon: body.icon,
      color: body.color,
      orderIndex: typeof orderIndexRaw === "number" ? orderIndexRaw : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data ? toLegacyCategory(result.data as CategoryEntityLike) : null,
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
// PUT /api/lms/categories?id=1 - Admin only
// ============================================================================

export async function PUT(request: NextRequest) {
  const session = getSession(request);

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  // Only Admin can update categories
  if (!canManageLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Admin access required to update categories" },
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
    const orderIndexRaw = body.orderIndex ?? body.order_index;
    const isActiveRaw = body.isActive ?? body.is_active;

    const result = await lmsService.updateCategory(parseInt(id), {
      name: body.name,
      description: body.description,
      icon: body.icon,
      color: body.color,
      orderIndex: typeof orderIndexRaw === "number" ? orderIndexRaw : undefined,
      isActive: typeof isActiveRaw === "boolean" ? isActiveRaw : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data ? toLegacyCategory(result.data as CategoryEntityLike) : null,
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
// DELETE /api/lms/categories?id=1 - Admin only
// ============================================================================

export async function DELETE(request: NextRequest) {
  const session = getSession(request);

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  // Only Admin can delete categories
  if (!canManageLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Admin access required to delete categories" },
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

    const result = await lmsService.deleteCategory(parseInt(id));

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
      { success: false, error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
