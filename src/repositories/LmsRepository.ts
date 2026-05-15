/**
 * LMS Repository - Repository Pattern Implementation
 *
 * Handles all database operations for LMS module:
 * - Categories
 * - Lessons
 * - Staff
 * - Completions
 *
 * Extends BaseRepository for common CRUD operations.
 *
 * @module repositories/LmsRepository
 */

import { BaseRepository } from "./BaseRepository";
import type {
  LmsCategoryDB,
  LmsLessonDB,
  LmsStaffDB,
  LmsLessonCompletionDB,
} from "@/lib/lms-entities";

// ============================================================================
// Category Repository
// ============================================================================

export class LmsCategoryRepository extends BaseRepository<LmsCategoryDB> {
  protected readonly tableName = "lms_categories";

  private static instance: LmsCategoryRepository | null = null;

  public static getInstance(): LmsCategoryRepository {
    if (!LmsCategoryRepository.instance) {
      LmsCategoryRepository.instance = new LmsCategoryRepository();
    }
    return LmsCategoryRepository.instance;
  }

  /**
   * Get categories with lesson counts
   */
  public async getCategoriesWithLessonCounts(): Promise<(LmsCategoryDB & { lesson_count: number })[]> {
    const query = `
      SELECT
        c.*,
        COUNT(l.id) as lesson_count
      FROM ${this.tableName} c
      LEFT JOIN lms_lessons l ON l.category_id = c.id AND l.is_active = true
      WHERE c.is_active = true
      GROUP BY c.id
      ORDER BY c.order_index, c.name
    `;

    const result = await this.executeQuery<LmsCategoryDB & { lesson_count: number }>(query);
    return result.data;
  }

  /**
   * Check if category with name exists
   */
  public async existsByName(name: string): Promise<boolean> {
    const query = `
      SELECT id FROM ${this.tableName}
      WHERE LOWER(name) = LOWER($1) AND is_active = true
      LIMIT 1
    `;

    const result = await this.executeQuery<{ id: number }>(query, [name]);
    return result.data.length > 0;
  }
}

// ============================================================================
// Lesson Repository
// ============================================================================

export class LmsLessonRepository extends BaseRepository<LmsLessonDB> {
  protected readonly tableName = "lms_lessons";

  private static instance: LmsLessonRepository | null = null;

  public static getInstance(): LmsLessonRepository {
    if (!LmsLessonRepository.instance) {
      LmsLessonRepository.instance = new LmsLessonRepository();
    }
    return LmsLessonRepository.instance;
  }

  /**
   * Get lessons by category
   */
  public async getByCategory(categoryId: number): Promise<LmsLessonDB[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE category_id = $1 AND is_active = true
      ORDER BY order_index, id
    `;

    const result = await this.executeQuery<LmsLessonDB>(query, [categoryId]);
    return result.data;
  }

  /**
   * Get lessons with completion status for staff
   */
  public async getLessonsWithCompletionStatus(
    categoryId: number,
    staffId: number
  ): Promise<(LmsLessonDB & { is_completed: boolean; completed_at: string | null })[]> {
    const { dbManager } = await import("@/lib/db-singleton");
    const result = await dbManager.executeUnsafe<LmsLessonDB & { is_completed: boolean; completed_at: string | null }>(`
      SELECT
        l.*,
        CASE WHEN lc.completed_at IS NOT NULL THEN true ELSE false END as is_completed,
        lc.completed_at
      FROM ${this.tableName} l
      LEFT JOIN lms_lesson_completions lc ON lc.lesson_id = l.id AND lc.staff_id = $1
      WHERE l.category_id = $2 AND l.is_active = true
      ORDER BY l.order_index, l.id
    `, [staffId, categoryId]);
    return result;
  }

  /**
   * Get all active lessons
   */
  public async getAllActive(): Promise<LmsLessonDB[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE is_active = true
      ORDER BY category_id, order_index, id
    `;

    const result = await this.executeQuery<LmsLessonDB>(query);
    return result.data;
  }

  /**
   * Count lessons by category
   */
  public async countByCategory(categoryId: number): Promise<number> {
    const query = `
      SELECT COUNT(*) as count FROM ${this.tableName}
      WHERE category_id = $1 AND is_active = true
    `;

    const result = await this.executeQuery<{ count: string }>(query, [categoryId]);
    return parseInt(result.data[0]?.count || "0");
  }
}

// ============================================================================
// Staff Repository
// ============================================================================

export class LmsStaffRepository extends BaseRepository<LmsStaffDB> {
  protected readonly tableName = "lms_staff";

  private static instance: LmsStaffRepository | null = null;

  public static getInstance(): LmsStaffRepository {
    if (!LmsStaffRepository.instance) {
      LmsStaffRepository.instance = new LmsStaffRepository();
    }
    return LmsStaffRepository.instance;
  }

  /**
   * Get staff with completion statistics
   */
  public async getStaffWithStats(staffId: number): Promise<{
    staff: LmsStaffDB;
    totalLessons: number;
    completedLessons: number;
    categoriesProgress: {
      category_id: number;
      category_name: string;
      total_lessons: number;
      completed_lessons: number;
    }[];
  } | null> {
    // Get staff info
    const staff = await this.findById(staffId);
    if (!staff) return null;

    // Get completion stats
    const { dbManager } = await import("@/lib/db-singleton");
    const statsResult = await dbManager.executeUnsafe<{
      total_lessons: number;
      completed_lessons: number;
    }>(`
      SELECT
        COUNT(DISTINCT l.id) as total_lessons,
        COUNT(DISTINCT lc.lesson_id) as completed_lessons
      FROM lms_lessons l
      LEFT JOIN lms_lesson_completions lc ON lc.lesson_id = l.id AND lc.staff_id = $1
      WHERE l.is_active = true
    `, [staffId]);
    const stats = statsResult[0] || { total_lessons: 0, completed_lessons: 0 };

    // Get category progress
    const categoryResult = await dbManager.executeUnsafe<{
      category_id: number;
      category_name: string;
      total_lessons: number;
      completed_lessons: number;
    }>(`

      SELECT
        c.id as category_id,
        c.name as category_name,
        COUNT(l.id) as total_lessons,
        COUNT(lc.lesson_id) as completed_lessons
      FROM lms_categories c
      LEFT JOIN lms_lessons l ON l.category_id = c.id AND l.is_active = true
      LEFT JOIN lms_lesson_completions lc ON lc.lesson_id = l.id AND lc.staff_id = $1
      WHERE c.is_active = true
      GROUP BY c.id, c.name
      ORDER BY c.order_index
    `, [staffId]);

    return {
      staff,
      totalLessons: parseInt(String(stats?.total_lessons || 0)),
      completedLessons: parseInt(String(stats?.completed_lessons || 0)),
    categoriesProgress: categoryResult,
    };
  }

  /**
   * Get all active staff
   */
  public async getAllActive(): Promise<LmsStaffDB[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE is_active = true
      ORDER BY full_name
    `;

    const result = await this.executeQuery<LmsStaffDB>(query);
    return result.data;
  }
}

// ============================================================================
// Completion Repository
// ============================================================================

export class LmsCompletionRepository extends BaseRepository<LmsLessonCompletionDB> {
  protected readonly tableName = "lms_lesson_completions";

  private static instance: LmsCompletionRepository | null = null;

  public static getInstance(): LmsCompletionRepository {
    if (!LmsCompletionRepository.instance) {
      LmsCompletionRepository.instance = new LmsCompletionRepository();
    }
    return LmsCompletionRepository.instance;
  }

  /**
   * Mark lesson as complete (upsert)
   */
  public async markComplete(
    staffId: number,
    lessonId: number,
    timeSpentSeconds?: number | null,
    notes?: string | null
  ): Promise<LmsLessonCompletionDB> {
    const query = `
      INSERT INTO ${this.tableName} (staff_id, lesson_id, time_spent_seconds, notes)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (staff_id, lesson_id)
      DO UPDATE SET
        completed_at = CURRENT_TIMESTAMP,
        time_spent_seconds = EXCLUDED.time_spent_seconds,
        notes = EXCLUDED.notes
      RETURNING *
    `;

    const result = await this.executeQuery<LmsLessonCompletionDB>(query, [staffId, lessonId, timeSpentSeconds ?? null, notes ?? null]);
    return result.data[0];
  }

  /**
   * Get completed lesson IDs for staff
   */
  public async getCompletedLessonIds(staffId: number): Promise<number[]> {
    const query = `
      SELECT lesson_id FROM ${this.tableName}
      WHERE staff_id = $1
    `;

    const result = await this.executeQuery<{ lesson_id: number }>(query, [staffId]);
    return result.data.map(r => r.lesson_id);
  }

  /**
   * Check if lesson is completed
   */
  public async isCompleted(staffId: number, lessonId: number): Promise<boolean> {
    const query = `
      SELECT 1 FROM ${this.tableName}
      WHERE staff_id = $1 AND lesson_id = $2
      LIMIT 1
    `;

    const result = await this.executeQuery<unknown>(query, [staffId, lessonId]);
    return result.data.length > 0;
  }

  /**
   * Get completion count for staff
   */
  public async getCompletionCount(staffId: number): Promise<number> {
    const query = `
      SELECT COUNT(*) as count FROM ${this.tableName}
      WHERE staff_id = $1
    `;

    const result = await this.executeQuery<{ count: string }>(query, [staffId]);
    return parseInt(result.data[0]?.count || "0");
  }
}

// ============================================================================
// Dashboard Repository
// ============================================================================

export class LmsDashboardRepository {
  private static instance: LmsDashboardRepository | null = null;

  public static getInstance(): LmsDashboardRepository {
    if (!LmsDashboardRepository.instance) {
      LmsDashboardRepository.instance = new LmsDashboardRepository();
    }
    return LmsDashboardRepository.instance;
  }

  /**
   * Get dashboard statistics
   */
  public async getStats(): Promise<{
    totalStaff: number;
    staffAddedThisWeek: number;
    totalCategories: number;
    totalLessons: number;
    staffWithCompletions: number;
    completedLessonsTotal: number;
  }> {
    const query = `
      SELECT
        (SELECT COUNT(*) FROM lms_staff WHERE is_active = true) as total_staff,
        (SELECT COUNT(*) FROM lms_staff WHERE is_active = true AND created_at >= CURRENT_DATE - INTERVAL '7 days') as staff_added_this_week,
        (SELECT COUNT(*) FROM lms_categories WHERE is_active = true) as total_categories,
        (SELECT COUNT(*) FROM lms_lessons WHERE is_active = true) as total_lessons,
        (SELECT COUNT(DISTINCT staff_id) FROM lms_lesson_completions) as staff_with_completions,
        (SELECT COUNT(*) FROM lms_lesson_completions) as completed_lessons_total
    `;

    const result = await this.executeQuery<{
      total_staff: number;
      staff_added_this_week: number;
      total_categories: number;
      total_lessons: number;
      staff_with_completions: number;
      completed_lessons_total: number;
    }>(query);

    const row = result[0];
    return {
      totalStaff: parseInt(String(row?.total_staff || 0)),
      staffAddedThisWeek: parseInt(String(row?.staff_added_this_week || 0)),
      totalCategories: parseInt(String(row?.total_categories || 0)),
      totalLessons: parseInt(String(row?.total_lessons || 0)),
      staffWithCompletions: parseInt(String(row?.staff_with_completions || 0)),
      completedLessonsTotal: parseInt(String(row?.completed_lessons_total || 0)),
    };
  }

  /**
   * Get staff progress list
   */
  public async getStaffProgress(): Promise<{
    staff_id: number;
    staff_name: string;
    branch: string | null;
    role: string;
    completed_count: number;
    last_activity: string | null;
  }[]> {
    const query = `
      SELECT
        s.id as staff_id,
        s.full_name as staff_name,
        s.branch_location as branch,
        s.role,
        COUNT(lc.lesson_id) as completed_count,
        MAX(lc.completed_at) as last_activity
      FROM lms_staff s
      LEFT JOIN lms_lesson_completions lc ON lc.staff_id = s.id
      WHERE s.is_active = true
      GROUP BY s.id, s.full_name, s.branch_location, s.role
      ORDER BY completed_count DESC
    `;

    return await this.executeQuery(query);
  }

  /**
   * Get category completion rates
   */
  public async getCategoryCompletion(): Promise<{
    category_id: number;
    category_name: string;
    total_lessons: number;
    completed_lessons: number;
  }[]> {
    const query = `
      SELECT
        c.id as category_id,
        c.name as category_name,
        COUNT(DISTINCT l.id) as total_lessons,
        COUNT(lc.lesson_id) as completed_lessons
      FROM lms_categories c
      LEFT JOIN lms_lessons l ON l.category_id = c.id AND l.is_active = true
      LEFT JOIN lms_lesson_completions lc ON lc.lesson_id = l.id
      WHERE c.is_active = true
      GROUP BY c.id, c.name
      ORDER BY c.order_index
    `;

    return await this.executeQuery(query);
  }

  /**
   * Execute raw query (helper)
   */
  private async executeQuery<T>(query: string, params: (string | number | null)[] = []): Promise<T[]> {
    const { dbManager } = await import("@/lib/db-singleton"); // Dynamic import for dbManager
    return await dbManager.executeUnsafe<T>(query, params, 45000); // Increased timeout for LMS queries
  }
}

// ============================================================================
// Export singleton instances
// ============================================================================

export const lmsCategoryRepository = LmsCategoryRepository.getInstance();
export const lmsLessonRepository = LmsLessonRepository.getInstance();
export const lmsStaffRepository = LmsStaffRepository.getInstance();
export const lmsCompletionRepository = LmsCompletionRepository.getInstance();
export const lmsDashboardRepository = LmsDashboardRepository.getInstance();

// Default export
export default {
  lmsCategoryRepository,
  lmsLessonRepository,
  lmsStaffRepository,
  lmsCompletionRepository,
  lmsDashboardRepository,
};
