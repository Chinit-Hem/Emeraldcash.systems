/**
 * LMS Entity Types - OOAD Data Transfer Objects
 * 
 * Defines entity interfaces for LMS module following OOAD principles:
 * - Separation of concerns (DB vs Entity vs DTO)
 * - Immutable data structures
 * - Type safety with strict interfaces
 * 
 * @module lib/lms-entities
 */

import type { BaseEntity, BaseDBRecord } from "@/services/BaseService";

// ============================================================================
// Base LMS Database Records (snake_case - matches PostgreSQL schema)
// ============================================================================

/**
 * LMS Category database record
 */
export interface LmsCategoryDB extends BaseDBRecord {
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  order_index: number;
  is_active: boolean;
}

/**
 * LMS Lesson database record
 */
export interface LmsLessonDB extends BaseDBRecord {
  category_id: number;
  title: string;
  description: string | null;
  youtube_url: string;
  youtube_video_id: string;
  thumbnail_url?: string | null;
  thumbnail_cloudinary_public_id?: string | null;
  step_by_step_instructions: string | null;
  duration_minutes: number | null;
  order_index: number;
  is_active: boolean;
}

/**
 * LMS Staff database record
 */
export interface LmsStaffDB extends BaseDBRecord {
  full_name: string;
  email: string | null;
  branch_location: string | null;
  role: string;
  phone: string | null;
  is_active: boolean;
}

/**
 * LMS Lesson Completion database record
 */
export interface LmsLessonCompletionDB extends BaseDBRecord {
  staff_id: number;
  lesson_id: number;
  completed_at: string;
  time_spent_seconds: number | null;
  notes: string | null;
}

// ============================================================================
// LMS Entities (camelCase - API response format)
// ============================================================================

/**
 * LMS Category entity for API responses
 */
export interface LmsCategoryEntity extends BaseEntity {
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  orderIndex: number;
  isActive: boolean;
  lessonCount?: number; // Computed field
}

/**
 * LMS Lesson entity for API responses
 */
export interface LmsLessonEntity extends BaseEntity {
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
  // Completion status (computed)
  isCompleted?: boolean;
  completedAt?: string | null;
  isUnlocked?: boolean;
}

/**
 * LMS Staff entity for API responses
 */
export interface LmsStaffEntity extends BaseEntity {
  fullName: string;
  email: string | null;
  branchLocation: string | null;
  role: string;
  phone: string | null;
  isActive: boolean;
  // Statistics (computed)
  totalLessons?: number;
  completedLessons?: number;
  completionPercentage?: number;
}

/**
 * LMS Lesson Completion entity
 */
export interface LmsLessonCompletionEntity extends BaseEntity {
  staffId: number;
  lessonId: number;
  completedAt: string;
  timeSpentSeconds: number | null;
  notes: string | null;
}

// ============================================================================
// Composite Entities (for complex queries)
// ============================================================================

/**
 * Category with lessons
 */
export interface LmsCategoryWithLessonsEntity extends LmsCategoryEntity {
  lessons: LmsLessonEntity[];
  totalLessons: number;
  completedLessons: number;
  isComplete: boolean;
}

/**
 * Staff with statistics
 */
export interface LmsStaffWithStatsEntity extends LmsStaffEntity {
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

/**
 * Dashboard statistics
 */
export interface LmsDashboardStatsEntity {
  totalStaff: number;
  totalCategories: number;
  totalLessons: number;
  overallCompletionRate: number;
  staffProgress: {
    staffId: number;
    staffName: string;
    branch: string | null;
    role: string;
    completionPercentage: number;
    lastActivity: string | null;
  }[];
  categoryCompletion: {
    categoryId: number;
    categoryName: string;
    completionRate: number;
  }[];
}

// ============================================================================
// Filter Types
// ============================================================================

/**
 * Base LMS filters
 */
export interface LmsBaseFilters {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: "ASC" | "DESC";
  isActive?: boolean;
}

/**
 * Category filters
 */
export interface LmsCategoryFilters extends LmsBaseFilters {
  searchTerm?: string;
}

/**
 * Lesson filters
 */
export interface LmsLessonFilters extends LmsBaseFilters {
  categoryId?: number;
  searchTerm?: string;
  isCompleted?: boolean; // For staff-specific queries
}

/**
 * Staff filters
 */
export interface LmsStaffFilters extends LmsBaseFilters {
  role?: string;
  branchLocation?: string;
  searchTerm?: string;
}

/**
 * Combined LMS filters type
 */
export type LmsFilters = LmsCategoryFilters | LmsLessonFilters | LmsStaffFilters;

// ============================================================================
// Input Types (for create/update operations)
// ============================================================================

/**
 * Create category input
 */
export interface CreateLmsCategoryInput {
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  orderIndex?: number;
}

/**
 * Update category input
 */
export interface UpdateLmsCategoryInput {
  name?: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  orderIndex?: number;
  isActive?: boolean;
}

/**
 * Create lesson input
 */
export interface CreateLmsLessonInput {
  categoryId: number;
  title: string;
  description?: string | null;
  youtubeUrl: string;
  stepByStepInstructions?: string | null;
  durationMinutes?: number | null;
  orderIndex?: number;
}

/**
 * Update lesson input
 */
export interface UpdateLmsLessonInput {
  categoryId?: number;
  title?: string;
  description?: string | null;
  youtubeUrl?: string;
  stepByStepInstructions?: string | null;
  durationMinutes?: number | null;
  orderIndex?: number;
  isActive?: boolean;
}

/**
 * Create staff input
 */
export interface CreateLmsStaffInput {
  fullName: string;
  email?: string | null;
  branchLocation?: string | null;
  role: string;
  phone?: string | null;
}

/**
 * Update staff input
 */
export interface UpdateLmsStaffInput {
  fullName?: string;
  email?: string | null;
  branchLocation?: string | null;
  role?: string;
  phone?: string | null;
  isActive?: boolean;
}

/**
 * Mark lesson complete input
 */
export interface MarkLessonCompleteInput {
  staffId: number;
  lessonId: number;
  timeSpentSeconds?: number | null;
  notes?: string | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert category DB record to entity
 */
export function toCategoryEntity(db: LmsCategoryDB): LmsCategoryEntity {
  return {
    id: String(db.id),
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    name: db.name,
    description: db.description,
    icon: db.icon,
    color: db.color,
    orderIndex: db.order_index,
    isActive: db.is_active,
  };
}

/**
 * Convert lesson DB record to entity
 */
export function toLessonEntity(db: LmsLessonDB): LmsLessonEntity {
  return {
    id: String(db.id),
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    categoryId: db.category_id,
    title: db.title,
    description: db.description,
    youtubeUrl: db.youtube_url,
    youtubeVideoId: db.youtube_video_id,
    thumbnailUrl: db.thumbnail_url ?? null,
    thumbnailCloudinaryPublicId: db.thumbnail_cloudinary_public_id ?? null,
    stepByStepInstructions: db.step_by_step_instructions,
    durationMinutes: db.duration_minutes,
    orderIndex: db.order_index,
    isActive: db.is_active,
  };
}

/**
 * Convert staff DB record to entity
 */
export function toStaffEntity(db: LmsStaffDB): LmsStaffEntity {
  return {
    id: String(db.id),
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    fullName: db.full_name,
    email: db.email,
    branchLocation: db.branch_location,
    role: db.role,
    phone: db.phone,
    isActive: db.is_active,
  };
}

/**
 * Convert completion DB record to entity
 */
export function toCompletionEntity(db: LmsLessonCompletionDB): LmsLessonCompletionEntity {
  return {
    id: String(db.id),
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    staffId: db.staff_id,
    lessonId: db.lesson_id,
    completedAt: db.completed_at,
    timeSpentSeconds: db.time_spent_seconds,
    notes: db.notes,
  };
}

/**
 * Calculate completion percentage
 */
export function calculateCompletionPercentage(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * Extract YouTube video ID from URL
 */
export function extractYoutubeVideoId(url: string): string | null {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /youtube\.com\/watch\?.*v=([^&\s]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

// Default exports
export default {
  toCategoryEntity,
  toLessonEntity,
  toStaffEntity,
  toCompletionEntity,
  calculateCompletionPercentage,
  extractYoutubeVideoId,
};
