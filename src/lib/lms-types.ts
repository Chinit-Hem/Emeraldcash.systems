/**
 * LMS Shared Types
 * 
 * Centralized type definitions for LMS components to eliminate duplication
 * between LmsDashboard and AdminLMSPage.
 * 
 * @module lms-types
 */

import type { Role } from "@/lib/types";

// ============================================================================
// Core LMS Types
// ============================================================================

export interface LmsCategory {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  order_index: number;
  lesson_count: number;
  is_active: boolean;
}

export interface LmsLesson {
  id: number;
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

export interface LmsStaff {
  id: number;
  full_name: string;
  email: string | null;
  branch_location: string | null;
  role: string;
  phone: string | null;
  is_active: boolean;
}

// ============================================================================
// Dashboard & Progress Types
// ============================================================================

export interface LessonWithStatus {
  id: number;
  category_id: number;
  title: string;
  description: string | null;
  youtube_url: string;
  youtube_video_id: string;
  duration_minutes: number | null;
  order_index: number;
  is_completed: boolean;
  is_unlocked: boolean;
  completed_at: string | null;
  category_name?: string;
  category_color?: string;
}

export interface StaffProgress {
  staff_id: number;
  staff_name: string;
  branch: string | null;
  role: string;
  completion_percentage: number;
  last_activity: string | null;
}

export interface CategoryCompletion {
  category_id: number;
  category_name: string;
  completion_rate: number;
}

export interface LmsDashboardStats {
  total_staff: number;
  staff_added_this_week?: number;
  total_categories: number;
  total_lessons: number;
  completed_lessons_total?: number;
  total_possible_completions?: number;
  overall_completion_rate: number;
  staff_progress: StaffProgress[];
  category_completion: CategoryCompletion[];
}

// ============================================================================
// NEW: Server Prefetch Types for Lazy Loading Fix
// ============================================================================

export interface InitialLmsData {
  stats: LmsDashboardStats | null;
  categories: LmsCategory[];
  lessons: LessonWithStatus[];
}

// ============================================================================
// Form Data Types
// ============================================================================

export interface CategoryFormData {
  id?: number;
  name: string;
  description: string;
  icon: string;
  color: "emerald" | "blue" | "purple" | "orange" | "red";
  orderIndex: number;
}

export interface LessonFormData {
  id?: number;
  categoryId: number;
  title: string;
  description: string;
  youtubeUrl: string;
  stepByStepInstructions: string;
  durationMinutes: number;
  orderIndex: number;
  isActive?: boolean;
}

export interface StaffFormData {
  id?: number;
  fullName: string;
  email: string;
  branchLocation: string;
  role: Role;
  phone: string;
  isActive?: boolean;
}

// ============================================================================
// Color Scheme Types
// ============================================================================

export type LmsColorScheme = "emerald" | "blue" | "purple" | "orange" | "red";

export interface ColorClasses {
  bg: string;
  text: string;
  border: string;
  gradient: string;
  light: string;
}

export const LMS_COLOR_MAP: Record<LmsColorScheme, ColorClasses> = {
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
    gradient: "from-emerald-500 to-emerald-600",
    light: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
    gradient: "from-blue-500 to-blue-600",
    light: "bg-blue-100 dark:bg-blue-900/30",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-900/20",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800",
    gradient: "from-purple-500 to-purple-600",
    light: "bg-purple-100 dark:bg-purple-900/30",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-800",
    gradient: "from-orange-500 to-orange-600",
    light: "bg-orange-100 dark:bg-orange-900/30",
  },
  red: {
    bg: "bg-red-50 dark:bg-red-900/20",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
    gradient: "from-red-500 to-red-600",
    light: "bg-red-100 dark:bg-red-900/30",
  },
};

// ============================================================================
// Icon Mapping
// ============================================================================

export const LMS_ICON_MAP: Record<string, string> = {
  Calculator: "GraduationCap",
  Monitor: "BookOpen",
  Users: "Users",
  Shield: "Trophy",
  BookOpen: "BookOpen",
  PlayCircle: "PlayCircle",
  BarChart3: "BarChart3",
  Clock: "Clock",
  CheckCircle2: "CheckCircle2",
  Circle: "Circle",
  ChevronRight: "ChevronRight",
  GraduationCap: "GraduationCap",
  Building2: "Building2",
  Lock: "Lock",
  Trophy: "Trophy",
  Plus: "Plus",
  Edit2: "Edit2",
  Trash2: "Trash2",
  RefreshCw: "RefreshCw",
  ExternalLink: "ExternalLink",
};

