/**
 * LMS Service - Learning Management System Operations
 *
 * Refactored to extend BaseService using OOAD patterns:
 * - Inheritance: Extends BaseService for common CRUD
 * - Composition: Uses repositories for data access
 * - Template Method: Overrides base methods with LMS-specific logic
 *
 * @module LmsService
 */

import type {
  CreateLmsCategoryInput,
  CreateLmsLessonInput,
  CreateLmsStaffInput,
  LmsCategoryDB,
  LmsCategoryEntity,
  LmsLessonDB,
  LmsLessonEntity,
  LmsStaffDB,
  LmsStaffEntity,
  MarkLessonCompleteInput,
  UpdateLmsCategoryInput,
  UpdateLmsLessonInput,
  UpdateLmsStaffInput,
} from "@/lib/lms-entities";
import {
  calculateCompletionPercentage,
  extractYoutubeVideoId,
} from "@/lib/lms-schema";
import type { InitialLmsData, LessonWithStatus } from "@/lib/lms-types";
import {
  lmsCategoryRepository,
  lmsCompletionRepository,
  lmsDashboardRepository,
  lmsLessonRepository,
  lmsStaffRepository,
} from "@/repositories/LmsRepository";
import { BaseFilters, BaseService, ServiceResult } from "./BaseService";

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface LmsDashboardStats {
  total_staff: number;
  total_categories: number;
  total_lessons: number;
  overall_completion_rate: number;
  staff_progress: {
    staff_id: number;
    staff_name: string;
    branch: string | null;
    role: string;
    completion_percentage: number;
    last_activity: string | null;
  }[];
  category_completion: {
    category_id: number;
    category_name: string;
    completion_rate: number;
  }[];
}

export interface LmsStaffWithStats extends LmsStaffEntity {
  totalLessons: number;
  completedLessons: number;
  completionPercentage: number;
  categoriesProgress: {
    categoryId: number;
    categoryName: string;
    totalLessons: number;
    completedLessons: number;
    isComplete: boolean;
  }[];
}

export interface LmsCategoryWithLessons extends LmsCategoryEntity {
  lessons: (LmsLessonEntity & {
    isCompleted: boolean;
    completedAt: string | null;
  })[];
  totalLessons: number;
  completedLessons: number;
  isComplete: boolean;
}

export interface LmsLessonWithUnlockStatus extends LmsLessonEntity {
  isCompleted: boolean;
  isUnlocked: boolean;
  completedAt: string | null;
}

// ============================================================================
// LMS Service Class
// ============================================================================

export class LmsService extends BaseService<LmsCategoryEntity, LmsCategoryDB> {
  private static instance: LmsService | null = null;

  public readonly tableName = "lms_categories";

  // Repository composition
  private categoryRepo = lmsCategoryRepository;
  private lessonRepo = lmsLessonRepository;
  private staffRepo = lmsStaffRepository;
  private completionRepo = lmsCompletionRepository;
  private dashboardRepo = lmsDashboardRepository;

  private constructor() {
    super("LmsService");
  }

  public static getInstance(): LmsService {
    if (!LmsService.instance) {
      LmsService.instance = new LmsService();
    }
    return LmsService.instance;
  }

  // ============================================================================
  // BaseService Abstract Method Implementations
  // ============================================================================

  protected toEntity(dbRecord: LmsCategoryDB): LmsCategoryEntity {
    return {
      id: String(dbRecord.id),
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
      name: dbRecord.name,
      description: dbRecord.description,
      icon: dbRecord.icon,
      color: dbRecord.color,
      orderIndex: dbRecord.order_index,
      isActive: dbRecord.is_active,
    };
  }

  protected buildCacheKey(filters?: BaseFilters): string {
    if (!filters) return "lms:categories:all";
    const parts = ["lms:categories"];
    if (filters.searchTerm) parts.push(`search:${filters.searchTerm}`);
    if (filters.limit) parts.push(`limit:${filters.limit}`);
    if (filters.offset) parts.push(`offset:${filters.offset}`);
    return parts.join(":");
  }

  protected applyFilters(
    baseQuery: string,
    filters: BaseFilters,
    params: (string | number | null)[]
  ): { query: string; params: (string | number | null)[]; _paramIndex: number } {
    let _query = baseQuery;
    let _paramIndex = params.length + 1;
    const conditions: string[] = [];


    if (filters.searchTerm) {
      conditions.push(`(name ILIKE $${_paramIndex} OR description ILIKE $${_paramIndex})`);
      params.push(`%${filters.searchTerm}%`);
      _paramIndex++;
    }

    if (conditions.length > 0) {
      _query += ` WHERE ${conditions.join(" AND ")}`;
    }

    // Append LIMIT and OFFSET outside the WHERE clause for correct pagination
    if (filters.limit) {
      _query += ` LIMIT $${_paramIndex}`;
      params.push(filters.limit);
      _paramIndex++;
    }
    if (filters.offset) {
      _query += ` OFFSET $${_paramIndex}`;
      params.push(filters.offset);
      _paramIndex++;
    }

    return { query: _query, params, _paramIndex };
  }

  // ============================================================================
  // Category Operations
  // ============================================================================

  public async getCategories(): Promise<ServiceResult<(LmsCategoryEntity & { lessonCount: number })[]>> {
    const startTime = Date.now();

    try {
      const categories = await this.categoryRepo.getCategoriesWithLessonCounts();

      const data = categories.map(cat => ({
        ...this.toEntity(cat),
        lessonCount: cat.lesson_count,
      }));

      return {
        success: true,
        data,
        meta: {
          durationMs: Date.now() - startTime,
          queryCount: 1,
          cacheHit: false,
        },
      };
    } catch (error) {
      return this.handleError(error, "getCategories");
    }
  }

  public async createCategory(input: CreateLmsCategoryInput): Promise<ServiceResult<LmsCategoryEntity>> {
    const startTime = Date.now();

    try {
      // Check if category with the same name already exists
      // Use a parameterized query to prevent SQL injection
      const exists = await this.categoryRepo.count([
        {
          column: "name",
          operator: "eq",
          value: input.name,
        },
        { column: "is_active", operator: "eq", value: true },
      ]) > 0;

      if (exists) {
        return {
          success: false,
          error: `A category with name "${input.name}" already exists`,
          meta: {
            durationMs: Date.now() - startTime,
            queryCount: 1,
            cacheHit: false,
          },
        };
      }

      // Convert camelCase input to snake_case for DB
      const dbInput: Omit<LmsCategoryDB, "id" | "created_at" | "updated_at"> = {
        name: input.name,
        description: input.description || null,
        icon: input.icon || null,
        color: input.color || null,
        order_index: input.orderIndex ?? 0,
        is_active: true,
      };

      const result = await this.create(dbInput);
      return result;
    } catch (error) {
      return this.handleError(error, "createCategory");
    }
  }

  public async updateCategory(
    id: number,
    input: UpdateLmsCategoryInput
  ): Promise<ServiceResult<LmsCategoryEntity>> {
    // Convert camelCase input to snake_case for DB
    const updates: Partial<LmsCategoryDB> = {};

    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.icon !== undefined) updates.icon = input.icon;
    if (input.color !== undefined) updates.color = input.color;
    if (input.orderIndex !== undefined) updates.order_index = input.orderIndex;
    if (input.isActive !== undefined) updates.is_active = input.isActive;

    return this.update(id, updates);
  }

  public async deleteCategory(id: number): Promise<ServiceResult<boolean>> {
    return this.delete(id);
  }

  // ============================================================================
  // Lesson Operations
  // ============================================================================

  public async getLessonsByCategory(categoryId: number): Promise<ServiceResult<LmsLessonEntity[]>> {
    const startTime = Date.now();

    try {
      const lessons = await this.lessonRepo.getByCategory(categoryId);

      return {
        success: true,
        data: lessons.map(this.toLessonEntity),
        meta: {
          durationMs: Date.now() - startTime,
          queryCount: 1,
          cacheHit: false,
        },
      };
    } catch (error) {
      return this.handleError(error, "getLessonsByCategory");
    }
  }

  public async getAllLessons(): Promise<ServiceResult<LmsLessonEntity[]>> {
    const startTime = Date.now();

    try {
      const lessons = await this.lessonRepo.getAllActive();

      return {
        success: true,
        data: lessons.map(this.toLessonEntity),
        meta: {
          durationMs: Date.now() - startTime,
          queryCount: 1,
          cacheHit: false,
        },
      };
    } catch (error) {
      return this.handleError(error, "getAllLessons");
    }
  }

  public async getLessonById(id: number): Promise<ServiceResult<LmsLessonEntity>> {
    const startTime = Date.now();

    try {
      const lesson = await this.lessonRepo.findById(id);

      if (!lesson) {
        return {
          success: false,
          error: "Lesson not found",
          meta: {
            durationMs: Date.now() - startTime,
            queryCount: 1,
            cacheHit: false,
          },
        };
      }

      return {
        success: true,
        data: this.toLessonEntity(lesson),
        meta: {
          durationMs: Date.now() - startTime,
          queryCount: 1,
          cacheHit: false,
        },
      };
    } catch (error) {
      return this.handleError(error, "getLessonById");
    }
  }

  public async createLesson(input: CreateLmsLessonInput): Promise<ServiceResult<LmsLessonEntity>> {
    const startTime = Date.now();

    try {
      // Validate category exists using repository's exists method (returns boolean)
      const categoryExists = await this.categoryRepo.exists(input.categoryId); // This returns a boolean
      if (!categoryExists) { // Check the boolean directly
        return {
          success: false,
          error: `Category not found: ${input.categoryId}`,
          meta: {
            durationMs: Date.now() - startTime,
            queryCount: 1,
            cacheHit: false,
          },
        };
      }

      const videoId = extractYoutubeVideoId(input.youtubeUrl);
      if (!videoId) {
        return {
          success: false,
          error: "Invalid YouTube URL - Could not extract video ID",
          meta: {
            durationMs: Date.now() - startTime,
            queryCount: 1,
            cacheHit: false,
          },
        };
      }

      if (!input.title || input.title.trim().length === 0) {
        return {
          success: false,
          error: "Title is required",
          meta: {
            durationMs: Date.now() - startTime,
            queryCount: 1,
            cacheHit: false,
          },
        };
      }

      const lesson = await this.lessonRepo.create({
        category_id: input.categoryId,
        title: input.title,
        description: input.description || null,
        youtube_url: input.youtubeUrl,
        youtube_video_id: videoId,
        step_by_step_instructions: input.stepByStepInstructions || null,
        duration_minutes: input.durationMinutes ?? null,
        order_index: input.orderIndex ?? 0,
        is_active: true,
      });

      return {
        success: true,
        data: this.toLessonEntity(lesson),
        meta: {
          durationMs: Date.now() - startTime,
          queryCount: 1,
          cacheHit: false,
        },
      };
    } catch (error) {
      return this.handleError(error, "createLesson");
    }
  }

  public async updateLesson(
    id: number,
    input: UpdateLmsLessonInput
  ): Promise<ServiceResult<LmsLessonEntity>> {
    const startTime = Date.now();

    try {
      const updates: Partial<LmsLessonDB> = {};

      if (input.categoryId !== undefined) updates.category_id = input.categoryId;
      if (input.title !== undefined) updates.title = input.title;
      if (input.description !== undefined) updates.description = input.description;

      if (input.youtubeUrl !== undefined) {
        const videoId = extractYoutubeVideoId(input.youtubeUrl);
        if (!videoId) {
          return {
            success: false,
            error: "Invalid YouTube URL",
            meta: {
              durationMs: Date.now() - startTime,
              queryCount: 0,
              cacheHit: false,
            },
          };
        }
        updates.youtube_url = input.youtubeUrl;
        updates.youtube_video_id = videoId;
      }

      if (input.stepByStepInstructions !== undefined) {
        updates.step_by_step_instructions = input.stepByStepInstructions;
      }
      if (input.durationMinutes !== undefined) updates.duration_minutes = input.durationMinutes;
      if (input.orderIndex !== undefined) updates.order_index = input.orderIndex;
      if (input.isActive !== undefined) updates.is_active = input.isActive;

      const lesson = await this.lessonRepo.update(id, updates);
      if (!lesson) {
        return {
          success: false,
          error: "Lesson not found",
          meta: {
            durationMs: Date.now() - startTime,
            queryCount: 1,
            cacheHit: false,
          },
        };
      }

      return {
        success: true,
        data: this.toLessonEntity(lesson),
        meta: {
          durationMs: Date.now() - startTime,
          queryCount: 1,
          cacheHit: false,
        },
      };
    } catch (error) {
      return this.handleError(error, "updateLesson");
    }
  }

  public async deleteLesson(id: number): Promise<ServiceResult<boolean>> {
    const startTime = Date.now();

    try {
      await this.lessonRepo.softDelete(id);

      return {
        success: true,
        data: true,
        meta: {
          durationMs: Date.now() - startTime,
          queryCount: 1,
          cacheHit: false,
        },
      };
    } catch (error) {
      return this.handleError(error, "deleteLesson");
    }
  }

  // ============================================================================
  // Staff Operations
  // ============================================================================

  public async getStaff(): Promise<ServiceResult<LmsStaffEntity[]>> {
    const startTime = Date.now();

    try {
      const staff = await this.staffRepo.getAllActive();

      return {
        success: true,
        data: staff.map(this.toStaffEntity),
        meta: {
          durationMs: Date.now() - startTime,
          queryCount: 1,
          cacheHit: false,
        },
      };
    } catch (error) {
      return this.handleError(error, "getStaff");
    }
  }

  public async getStaffById(id: number): Promise<ServiceResult<LmsStaffWithStats>> {
    const startTime = Date.now();

    try {
      const result = await this.staffRepo.getStaffWithStats(id);

      if (!result) {
        return {
          success: false,
          error: "Staff not found",
          meta: {
            durationMs: Date.now() - startTime,
            queryCount: 1,
            cacheHit: false,
          },
        };
      }

      const staffWithStats: LmsStaffWithStats = {
        ...this.toStaffEntity(result.staff),
        totalLessons: result.totalLessons,
        completedLessons: result.completedLessons,
        completionPercentage: calculateCompletionPercentage(
          result.completedLessons,
          result.totalLessons
        ),
        categoriesProgress: result.categoriesProgress.map(cat => ({
          categoryId: cat.category_id,
          categoryName: cat.category_name,
          totalLessons: cat.total_lessons,
          completedLessons: cat.completed_lessons,
          isComplete: cat.total_lessons > 0 && cat.completed_lessons === cat.total_lessons,
        })),
      };

      return {
        success: true,
        data: staffWithStats,
        meta: {
          durationMs: Date.now() - startTime,
          queryCount: 3,
          cacheHit: false,
        },
      };
    } catch (error) {
      return this.handleError(error, "getStaffById");
    }
  }

  public async createStaff(input: CreateLmsStaffInput): Promise<ServiceResult<LmsStaffEntity>> {
    const startTime = Date.now();

    try {
      const validRoles = ["Appraiser", "Manager", "Admin", "Trainee"];
      const role = input.role && validRoles.includes(input.role) ? input.role : "Trainee";

      const staff = await this.staffRepo.create({
        full_name: input.fullName,
        email: input.email || null,
        branch_location: input.branchLocation || null,
        role,
        phone: input.phone || null,
        is_active: true,
      });

      return {
        success: true,
        data: this.toStaffEntity(staff),
        meta: {
          durationMs: Date.now() - startTime,
          queryCount: 1,
          cacheHit: false,
        },
      };
    } catch (error) {
      return this.handleError(error, "createStaff");
    }
  }

  public async updateStaff(
    id: number,
    input: UpdateLmsStaffInput
  ): Promise<ServiceResult<LmsStaffEntity>> {
    const startTime = Date.now();

    try {
      const updates: Partial<LmsStaffDB> = {};

      if (input.fullName !== undefined) updates.full_name = input.fullName;
      if (input.email !== undefined) updates.email = input.email;
      if (input.branchLocation !== undefined) updates.branch_location = input.branchLocation;
      if (input.role !== undefined) updates.role = input.role;
      if (input.phone !== undefined) updates.phone = input.phone;
      if (input.isActive !== undefined) updates.is_active = input.isActive;

      const staff = await this.staffRepo.update(id, updates);
      if (!staff) {
        return {
          success: false,
          error: "Staff not found",
          meta: {
            durationMs: Date.now() - startTime,
            queryCount: 1,
            cacheHit: false,
          },
        };
      }

      return {
        success: true,
        data: this.toStaffEntity(staff),
        meta: {
          durationMs: Date.now() - startTime,
          queryCount: 1,
          cacheHit: false,
        },
      };
    } catch (error) {
      return this.handleError(error, "updateStaff");
    }
  }

  public async deleteStaff(id: number): Promise<ServiceResult<boolean>> {
    const startTime = Date.now();

    try {
      await this.staffRepo.softDelete(id);

      return {
        success: true,
        data: true,
        meta: {
          durationMs: Date.now() - startTime,
          queryCount: 1,
          cacheHit: false,
        },
      };
    } catch (error) {
      return this.handleError(error, "deleteStaff");
    }
  }

  // ============================================================================
  // Completion Operations
  // ============================================================================

  public async markLessonComplete(
    input: MarkLessonCompleteInput
  ): Promise<ServiceResult<{ completedAt: string; timeSpentSeconds: number | null }>> {
    const startTime = Date.now();

    try {
      const completion = await this.completionRepo.markComplete(
        input.staffId,
        input.lessonId,
        input.timeSpentSeconds,
        input.notes
      );

      return {
        success: true,
        data: {
          completedAt: completion.completed_at,
          timeSpentSeconds: completion.time_spent_seconds,
        },
        meta: {
          durationMs: Date.now() - startTime,
          queryCount: 1,
          cacheHit: false,
        },
      };
    } catch (error) {
      return this.handleError(error, "markLessonComplete");
    }
  }

  public async getStaffCompletions(staffId: number): Promise<ServiceResult<number[]>> {
    const startTime = Date.now();

    try {
      const lessonIds = await this.completionRepo.getCompletedLessonIds(staffId);

      return {
        success: true,
        data: lessonIds,
        meta: {
          durationMs: Date.now() - startTime,
          queryCount: 1,
          cacheHit: false,
        },
      };
    } catch (error) {
      return this.handleError(error, "getStaffCompletions");
    }
  }

  public async isLessonCompleted(staffId: number, lessonId: number): Promise<ServiceResult<boolean>> {
    const startTime = Date.now();

    try {
      const isCompleted = await this.completionRepo.isCompleted(staffId, lessonId);

      return {
        success: true,
        data: isCompleted,
        meta: {
          durationMs: Date.now() - startTime,
          queryCount: 1,
          cacheHit: false,
        },
      };
    } catch (error) {
      return this.handleError(error, "isLessonCompleted");
    }
  }

// ============================================================================
  // Dashboard & Analytics
  // ============================================================================

  /**
   * NEW: Server-side prefetch for LMS page (eliminates client loading spinner)
   */
  public async getLmsDashboardInitial(): Promise<ServiceResult<InitialLmsData>> {
    const startTime = Date.now();

    try {
      // Avoid heavy parallel DB queries to reduce Neon pool pressure/timeouts
      const statsResult = await this.getDashboardStats();
      const categoriesResult = await this.getCategories();
      const allLessonsResult = await this.getAllLessons();

      if (
        !statsResult.success ||
        !statsResult.data ||
        !categoriesResult.success ||
        !categoriesResult.data ||
        !allLessonsResult.success ||
        !allLessonsResult.data
      ) {
        return {
          success: false,
          error: 'Failed to load initial LMS data',
          meta: { durationMs: Date.now() - startTime, queryCount: 0, cacheHit: false }
        };
      }

      // Transform lessons to LessonWithStatus (mock is_completed for server, client will override)
      const lessons: LessonWithStatus[] = allLessonsResult.data.map(lesson => ({
        id: Number(lesson.id),
        category_id: lesson.categoryId,
        title: lesson.title,
        description: lesson.description,
        youtube_url: lesson.youtubeUrl,
        youtube_video_id: lesson.youtubeVideoId,
        duration_minutes: lesson.durationMinutes,
        order_index: lesson.orderIndex,
        is_completed: false, // Client-side user-specific
        is_unlocked: true,   // Simplified for initial load
        completed_at: null,
        category_name: '',   // Client will populate from categories
        category_color: ''
      }));

      const categories = categoriesResult.data.map((category) => ({
        id: Number(category.id),
        name: category.name,
        description: category.description,
        icon: category.icon,
        color: category.color,
        order_index: category.orderIndex,
        lesson_count: category.lessonCount || 0,
        is_active: category.isActive,
      }));

      const initialData: InitialLmsData = {
        stats: statsResult.data,
        categories,
        lessons
      };

      return {
        success: true,
        data: initialData,
        meta: {
          durationMs: Date.now() - startTime,
          queryCount: 3,
          cacheHit: false
        }
      };
    } catch (error) {
      return this.handleError(error, "getLmsDashboardInitial");
    }
  }

  public async getDashboardStats(): Promise<ServiceResult<LmsDashboardStats>> {
    const startTime = Date.now();

    try {
      const [stats, staffProgress, categoryCompletion] = await Promise.all([
        this.dashboardRepo.getStats(),
        this.dashboardRepo.getStaffProgress(),
        this.dashboardRepo.getCategoryCompletion()
      ]);

      const totalStaff = stats.totalStaff;
      const totalLessons = stats.totalLessons;
      const totalPossibleCompletions = totalStaff * totalLessons;

      const dashboardStats: LmsDashboardStats = {
        total_staff: stats.totalStaff,
        total_categories: stats.totalCategories,
        total_lessons: stats.totalLessons,
        overall_completion_rate: totalPossibleCompletions > 0
          ? Math.round((stats.completedLessonsTotal / totalPossibleCompletions) * 100)
          : 0,
        staff_progress: staffProgress.map(s => ({
          staff_id: s.staff_id,
          staff_name: s.staff_name,
          branch: s.branch,
          role: s.role,
          completion_percentage: calculateCompletionPercentage(
            s.completed_count,
            totalLessons
          ),
          last_activity: s.last_activity,
        })),
        category_completion: categoryCompletion.map(c => ({
          category_id: c.category_id,
          category_name: c.category_name,
          completion_rate: calculateCompletionPercentage(
            c.completed_lessons,
            c.total_lessons * totalStaff
          ),
        })),
      };

      return {
        success: true,
        data: dashboardStats,
        meta: {
          durationMs: Date.now() - startTime,
          queryCount: 3,
          cacheHit: false,
        },
      };
    } catch (error) {
      return this.handleError(error, "getDashboardStats");
    }
  }

  public async getCategoryWithLessonsForStaff(
    categoryId: number,
    staffId: number
  ): Promise<ServiceResult<LmsCategoryWithLessons>> {
    const startTime = Date.now();

    try {
      const categoryResult = await this.getById(categoryId);
      if (!categoryResult.success || !categoryResult.data) {
        return {
          success: false,
          error: "Category not found",
          meta: {
            durationMs: Date.now() - startTime,
            queryCount: 1,
            cacheHit: false,
          },
        };
      }

      const lessons = await this.lessonRepo.getLessonsWithCompletionStatus(categoryId, staffId);

      const totalLessons = lessons.length;
      const completedLessons = lessons.filter(l => l.is_completed).length;

      const categoryWithLessons: LmsCategoryWithLessons = {
        ...categoryResult.data,
        lessons: lessons.map(l => ({
          ...this.toLessonEntity(l),
          isCompleted: l.is_completed,
          completedAt: l.completed_at,
        })),
        totalLessons,
        completedLessons,
        isComplete: totalLessons > 0 && completedLessons === totalLessons,
      };

      return {
        success: true,
        data: categoryWithLessons,
        meta: {
          durationMs: Date.now() - startTime,
          queryCount: 2,
          cacheHit: false,
        },
      };
    } catch (error) {
      return this.handleError(error, "getCategoryWithLessonsForStaff");
    }
  }

  public async getSequentialLessonsForStaff(
    categoryId: number,
    staffId: number
  ): Promise<ServiceResult<LmsLessonWithUnlockStatus[]>> {
    const startTime = Date.now();

    try {
      const lessons = await this.lessonRepo.getLessonsWithCompletionStatus(categoryId, staffId);

      let previousCompleted = true;

      const lessonsWithUnlockStatus: LmsLessonWithUnlockStatus[] = lessons.map(lesson => {
        const isUnlocked = previousCompleted;
        previousCompleted = previousCompleted && lesson.is_completed;

        return {
          ...this.toLessonEntity(lesson),
          isCompleted: lesson.is_completed,
          isUnlocked,
          completedAt: lesson.completed_at,
        };
      });

      return {
        success: true,
        data: lessonsWithUnlockStatus,
        meta: {
          durationMs: Date.now() - startTime,
          queryCount: 1,
          cacheHit: false,
        },
      };
    } catch (error) {
      return this.handleError(error, "getSequentialLessonsForStaff");
    }
  }

  public async isLessonUnlocked(
    staffId: number,
    lessonId: number
  ): Promise<ServiceResult<{ isUnlocked: boolean; message?: string }>> {
    const startTime = Date.now();

    try {
      const lesson = await this.lessonRepo.findById(lessonId);
      if (!lesson) {
        return {
          success: false,
          error: "Lesson not found",
          meta: {
            durationMs: Date.now() - startTime,
            queryCount: 1,
            cacheHit: false,
          },
        };
      }

      const categoryLessons = await this.lessonRepo.getByCategory(lesson.category_id);

      const targetIndex = categoryLessons.findIndex(l => l.id === lessonId);
      if (targetIndex === -1) {
        return {
          success: false,
          error: "Lesson not found in category",
          meta: {
            durationMs: Date.now() - startTime,
            queryCount: 2,
            cacheHit: false,
          },
        };
      }

      if (targetIndex === 0) {
        return {
          success: true,
          data: { isUnlocked: true },
          meta: {
            durationMs: Date.now() - startTime,
            queryCount: 2,
            cacheHit: false,
          },
        };
      }

      const previousLesson = categoryLessons[targetIndex - 1];
      const isPreviousCompleted = await this.completionRepo.isCompleted(staffId, Number(previousLesson.id));

      if (!isPreviousCompleted) {
        return {
          success: true,
          data: {
            isUnlocked: false,
            message: `Please complete "${previousLesson.title}" first.`,
          },
          meta: {
            durationMs: Date.now() - startTime,
            queryCount: 3,
            cacheHit: false,
          },
        };
      }

      return {
        success: true,
        data: { isUnlocked: true },
        meta: {
          durationMs: Date.now() - startTime,
          queryCount: 3,
          cacheHit: false,
        },
      };
    } catch (error) {
      return this.handleError(error, "isLessonUnlocked");
    }
  }

  public async getNextAvailableLesson(
    staffId: number,
    categoryId: number
  ): Promise<ServiceResult<{ nextLessonId: number | null; allCompleted: boolean }>> {
    const startTime = Date.now();

    try {
      const seqResult = await this.getSequentialLessonsForStaff(categoryId, staffId);

      if (!seqResult.success || !seqResult.data) {
        return {
          success: false,
          error: seqResult.error || "Failed to get lessons",
          meta: {
            durationMs: Date.now() - startTime,
            queryCount: 1,
            cacheHit: false,
          },
        };
      }

      const lessons = seqResult.data;
      const nextLesson = lessons.find(l => l.isUnlocked && !l.isCompleted);

      if (nextLesson) {
        return {
          success: true,
          data: { nextLessonId: Number(nextLesson.id), allCompleted: false },
          meta: {
            durationMs: Date.now() - startTime,
            queryCount: 1,
            cacheHit: false,
          },
        };
      }

      const allCompleted = lessons.every(l => l.isCompleted);

      return {
        success: true,
        data: {
          nextLessonId: null,
          allCompleted,
        },
        meta: {
          durationMs: Date.now() - startTime,
          queryCount: 1,
          cacheHit: false,
        },
      };
    } catch (error) {
      return this.handleError(error, "getNextAvailableLesson");
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private toLessonEntity(dbRecord: LmsLessonDB): LmsLessonEntity {
    return {
      id: String(dbRecord.id),
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
      categoryId: dbRecord.category_id,
      title: dbRecord.title,
      description: dbRecord.description,
      youtubeUrl: dbRecord.youtube_url,
      youtubeVideoId: dbRecord.youtube_video_id,
      stepByStepInstructions: dbRecord.step_by_step_instructions,
      durationMinutes: dbRecord.duration_minutes,
      orderIndex: dbRecord.order_index,
      isActive: dbRecord.is_active,
    };
  }

  private toStaffEntity(dbRecord: LmsStaffDB): LmsStaffEntity {
    return {
      id: String(dbRecord.id),
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
      fullName: dbRecord.full_name,
      email: dbRecord.email,
      branchLocation: dbRecord.branch_location,
      role: dbRecord.role,
      phone: dbRecord.phone,
      isActive: dbRecord.is_active,
    };
  }

  protected handleError(error: unknown, operation: string): ServiceResult<never> {
    const errorMessage = error instanceof Error ? error.message : `Failed to ${operation}`;
    console.error(`[LmsService.${operation}] Error:`, errorMessage);

    return {
      success: false,
      error: errorMessage,
      meta: {
        durationMs: 0,
        queryCount: 0,
        cacheHit: false,
      },
    };
  }
}

export const lmsService = LmsService.getInstance();
export default lmsService;
