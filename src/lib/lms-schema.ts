/**
 * LMS (Learning Management System) Database Schema & Types
 * 
 * Database Tables:
 * 1. lms_categories - Training categories (Valuation, System Training, etc.)
 * 2. lms_lessons - Individual lessons with YouTube videos and instructions
 * 3. lms_staff - Staff members with branch locations and roles
 * 4. lms_lesson_completions - Track which lessons each staff member completed
 * 
 * @module lms-schema
 */

// ============================================================================
// Enums & Constants
// ============================================================================

import type { Role } from "@/lib/types";

// Unified role system - same as settings/users
export const LMS_ROLES: Role[] = ["Admin", "Staff"];

export type LmsRole = Role;

export const LMS_CATEGORY_NAMES = [
  "Valuation",
  "System Training",
  "Customer Service",
  "Compliance",
  "Sales Techniques"
] as const;

export type LmsCategoryName = (typeof LMS_CATEGORY_NAMES)[number];

// ============================================================================
// Database Types (matching PostgreSQL schema)
// ============================================================================

/**
 * LMS Category - Training pillar/section
 */
export interface LmsCategory {
  id: number;
  name: LmsCategoryName | string;
  description: string | null;
  icon: string | null; // Lucide icon name
  color: string | null; // Tailwind color class
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * LMS Lesson - Individual training content
 */
export interface LmsLesson {
  id: number;
  category_id: number;
  title: string;
  description: string | null;
  youtube_url: string;
  youtube_video_id: string; // Extracted from URL for embed
  thumbnail_url?: string | null; // Cloudinary optimized image URL
  thumbnail_cloudinary_public_id?: string | null; // Cloudinary public ID
  step_by_step_instructions: string | null; // Markdown content
  duration_minutes: number | null; // Estimated duration
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * LMS Staff - Staff member for training tracking
 * Extends the existing user system but adds LMS-specific fields
 */
export interface LmsStaff {
  id: number;
  user_id: number | null; // Link to existing auth.users if applicable
  full_name: string;
  email: string | null;
  branch_location: string | null;
  role: LmsRole;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * LMS Lesson Completion - Track staff progress
 */
export interface LmsLessonCompletion {
  id: number;
  staff_id: number;
  lesson_id: number;
  completed_at: string;
  time_spent_seconds: number | null; // Optional: track time spent
  notes: string | null; // Staff can add notes
  created_at: string;
}

/**
 * Sequential lesson with completion/unlock status
 */
export type SequentialLesson = LmsLesson & {
  is_completed: boolean;
  completed_at: string | null;
  is_unlocked: boolean;
};


// ============================================================================
// Composite Types for API Responses
// ============================================================================

/**
 * Lesson with category info
 */
export interface LmsLessonWithCategory extends LmsLesson {
  category: LmsCategory;
}

/**
 * Staff with completion statistics
 */
export interface LmsStaffWithStats extends LmsStaff {
  total_lessons: number;
  completed_lessons: number;
  completion_percentage: number;
  categories_progress: {
    category_id: number;
    category_name: string;
    total_lessons: number;
    completed_lessons: number;
    is_complete: boolean;
  }[];
}

/**
 * Category with lessons and completion status
 */
export interface LmsCategoryWithLessons extends LmsCategory {
  lessons: (LmsLesson & { is_completed: boolean; completed_at: string | null })[];
  total_lessons: number;
  completed_lessons: number;
  is_complete: boolean; // All lessons completed
}

/**
 * Dashboard statistics
 */
export interface LmsDashboardStats {
  total_staff: number;
  total_categories: number;
  total_lessons: number;
  overall_completion_rate: number;
  staff_progress: {
    staff_id: number;
    staff_name: string;
    branch: string | null;
    completion_percentage: number;
    last_activity: string | null;
  }[];
  category_completion: {
    category_id: number;
    category_name: string;
    completion_rate: number;
  }[];
}

// ============================================================================
// API Input Types
// ============================================================================

export interface CreateLmsCategoryInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order_index?: number;
}

export interface UpdateLmsCategoryInput {
  name?: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  order_index?: number;
  is_active?: boolean;
}

export interface CreateLmsLessonInput {
  category_id: number;
  title: string;
  description?: string;
  youtube_url: string;
  step_by_step_instructions?: string;
  duration_minutes?: number;
  order_index?: number;
}

export interface UpdateLmsLessonInput {
  category_id?: number;
  title?: string;
  description?: string | null;
  youtube_url?: string;
  step_by_step_instructions?: string | null;
  duration_minutes?: number | null;
  order_index?: number;
  is_active?: boolean;
}

export interface CreateLmsStaffInput {
  full_name: string;
  email?: string;
  branch_location?: string;
  role?: LmsRole;
  phone?: string;
}

export interface UpdateLmsStaffInput {
  full_name?: string;
  email?: string | null;
  branch_location?: string | null;
  role?: LmsRole;
  phone?: string | null;
  is_active?: boolean;
}

export interface MarkLessonCompleteInput {
  staff_id: number;
  lesson_id: number;
  time_spent_seconds?: number;
  notes?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYoutubeVideoId(url: string): string | null {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /youtube\.com\/watch\?.*v=([^&\s]+)/,
    /youtu\.be\/([^&\s?]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Build YouTube embed URL with optimal parameters for embedding
 * 
 * Parameters explained:
 * - rel=0: Don't show related videos from other channels
 * - modestbranding=1: Minimal YouTube branding
 * - enablejsapi=1: Enable JavaScript API for player control
 * - playsinline=1: Play inline on mobile (iOS) instead of fullscreen
 * - iv_load_policy=3: Hide video annotations (can cause blocking issues)
 * - fs=1: Allow fullscreen button
 * - autoplay=0: Don't autoplay (prevents blocking)
 * - cc_load_policy=0: Don't force closed captions
 * - origin: Required for local development - tells YouTube where the embed is coming from
 */
export function buildYoutubeEmbedUrl(videoId: string, startTime = 0): string {
  // Get origin safely - works in both SSR and client environments
  let origin = "";
  if (typeof window !== "undefined") {
    // Always use window.location.origin when available (includes local IPs like 192.168.x.x)
    origin = window.location.origin;
  } else {
    // For SSR, use a default or environment variable
    origin = process.env.NEXT_PUBLIC_APP_URL || "https://emeraldcash-vms.vercel.app";
  }
  
  // WORKAROUND 3: If origin is a local IP (192.168.x.x, 10.x.x.x, 127.x.x.x), 
  // use a dummy domain to trick YouTube's API
  const isLocalIP = origin.match(/^(http|https):\/\/(192\.168\.|10\.|127\.|172\.(1[6-9]|2[0-9]|3[01])\.)|localhost/);
  if (isLocalIP) {
    origin = "https://www.youtube.com";
  }
  
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    enablejsapi: "1",
    playsinline: "1",
    iv_load_policy: "3",
    fs: "1",
    autoplay: "0",
    cc_load_policy: "0",
  });
  
  // Always add origin parameter for YouTube embeds - critical for local development
  // YouTube requires this to verify the embed source, even for local IPs
  if (origin) {
    params.set("origin", origin);
  }
  
  if (startTime > 0) {
    params.set("start", String(startTime));
  }
  
  const finalUrl = `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  return finalUrl;
}

/**
 * Calculate completion percentage
 */
export function calculateCompletionPercentage(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * Check if category is complete (all lessons done)
 */
export function isCategoryComplete(
  categoryLessons: number[],
  completedLessonIds: number[]
): boolean {
  if (categoryLessons.length === 0) return false;
  return categoryLessons.every((id) => completedLessonIds.includes(id));
}

// ============================================================================
// SQL Schema (for reference)
// ============================================================================

export const LMS_SQL_SCHEMA = `
-- LMS Categories Table
CREATE TABLE IF NOT EXISTS lms_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(50),
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- LMS Lessons Table
CREATE TABLE IF NOT EXISTS lms_lessons (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES lms_categories(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  youtube_url VARCHAR(500) NOT NULL,
  youtube_video_id VARCHAR(20) NOT NULL,
  thumbnail_url VARCHAR(500),
  thumbnail_cloudinary_public_id VARCHAR(255),
  step_by_step_instructions TEXT,
  duration_minutes INTEGER,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- LMS Staff Table
CREATE TABLE IF NOT EXISTS lms_staff (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  branch_location VARCHAR(100),
  role VARCHAR(50) DEFAULT 'Trainee',
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- LMS Lesson Completions Table
CREATE TABLE IF NOT EXISTS lms_lesson_completions (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES lms_staff(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lms_lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  time_spent_seconds INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(staff_id, lesson_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lms_lessons_category ON lms_lessons(category_id);
CREATE INDEX IF NOT EXISTS idx_lms_lessons_order ON lms_lessons(order_index);
CREATE INDEX IF NOT EXISTS idx_lms_completions_staff ON lms_lesson_completions(staff_id);
CREATE INDEX IF NOT EXISTS idx_lms_completions_lesson ON lms_lesson_completions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lms_staff_branch ON lms_staff(branch_location);
CREATE INDEX IF NOT EXISTS idx_lms_staff_user ON lms_staff(user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lms_categories_updated_at BEFORE UPDATE ON lms_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_lms_lessons_updated_at BEFORE UPDATE ON lms_lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_lms_staff_updated_at BEFORE UPDATE ON lms_staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

// ============================================================================
// Default Data
// ============================================================================

export const LMS_DEFAULT_CATEGORIES: Omit<LmsCategory, "id" | "created_at" | "updated_at">[] = [
  {
    name: "Valuation",
    description: "Learn vehicle valuation techniques and pricing strategies",
    icon: "Calculator",
    color: "emerald",
    order_index: 1,
    is_active: true,
  },
  {
    name: "System Training",
    description: "How to use the VMS platform effectively",
    icon: "Monitor",
    color: "blue",
    order_index: 2,
    is_active: true,
  },
  {
    name: "Customer Service",
    description: "Best practices for customer interactions",
    icon: "Users",
    color: "purple",
    order_index: 3,
    is_active: true,
  },
  {
    name: "Compliance",
    description: "Legal requirements and documentation standards",
    icon: "Shield",
    color: "orange",
    order_index: 4,
    is_active: true,
  },
];

export const LMS_DEFAULT_LESSONS: Omit<LmsLesson, "id" | "created_at" | "updated_at" | "youtube_video_id">[] = [
  {
    category_id: 1, // Valuation
    title: "Introduction to Vehicle Valuation",
    description: "Learn the basics of vehicle valuation and pricing",
    youtube_url: "https://www.youtube.com/watch?v=example1",
    step_by_step_instructions: `
## Vehicle Valuation Basics

### Step 1: Physical Inspection
- Check exterior condition
- Inspect interior wear and tear
- Test all mechanical components

### Step 2: Market Research
- Compare similar vehicles in market
- Check recent sales data
- Consider seasonal factors

### Step 3: Documentation Review
- Verify ownership documents
- Check service history
- Review any accident history
    `.trim(),
    duration_minutes: 15,
    order_index: 1,
    is_active: true,
  },
  {
    category_id: 1, // Valuation
    title: "Advanced Pricing Strategies",
    description: "Deep dive into pricing models and depreciation",
    youtube_url: "https://www.youtube.com/watch?v=example2",
    step_by_step_instructions: `
## Advanced Pricing Strategies

### Depreciation Models
- Year 1: 20-30% depreciation
- Year 2-3: 15-20% per year
- Year 4+: 10-15% per year

### Market Factors
- Supply and demand
- Economic conditions
- Seasonal variations
    `.trim(),
    duration_minutes: 20,
    order_index: 2,
    is_active: true,
  },
  {
    category_id: 2, // System Training
    title: "VMS Platform Overview",
    description: "Getting started with the Vehicle Management System",
    youtube_url: "https://www.youtube.com/watch?v=example3",
    step_by_step_instructions: `
## VMS Platform Guide

### Dashboard
- View vehicle statistics
- Check recent activity
- Access quick actions

### Adding Vehicles
1. Click "Add Vehicle" button
2. Fill in vehicle details
3. Upload photos
4. Set pricing
5. Save

### Searching
- Use the search bar for quick finds
- Apply filters for advanced search
- Save frequently used filters
    `.trim(),
    duration_minutes: 10,
    order_index: 1,
    is_active: true,
  },
];
