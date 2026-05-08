/**
 * LMS Initialization API Route
 * 
 * POST /api/lms/init - Initialize LMS database tables
 * Creates all necessary tables if they don't exist
 * 
 * @module api/lms/init
 */

import { NextRequest, NextResponse } from "next/server";
import { dbManager } from "@/lib/db-singleton";
import { canManageLMS, getSession } from "@/lib/auth-helpers";

// ============================================================================
// POST /api/lms/init - Initialize LMS tables (Admin only)
// ============================================================================

export async function POST(request: NextRequest) {
  const session = getSession(request);
  
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - Please log in" },
      { status: 401 }
    );
  }

  // Only Admin can initialize tables
  if (!canManageLMS(session)) {
    return NextResponse.json(
      { success: false, error: "Admin access required" },
      { status: 403 }
    );
  }

  try {
    // Create LMS Categories Table
    const createCategoriesTable = `
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
      )
    `;
    await dbManager.executeUnsafe(createCategoriesTable);

    // Create LMS Lessons Table
    const createLessonsTable = `
      CREATE TABLE IF NOT EXISTS lms_lessons (
        id SERIAL PRIMARY KEY,
        category_id INTEGER NOT NULL REFERENCES lms_categories(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        youtube_url VARCHAR(500) NOT NULL,
        youtube_video_id VARCHAR(20) NOT NULL,
        step_by_step_instructions TEXT,
        duration_minutes INTEGER,
        order_index INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await dbManager.executeUnsafe(createLessonsTable);
    await dbManager.executeUnsafe(
      `ALTER TABLE lms_lessons ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(500)`
    );
    await dbManager.executeUnsafe(
      `ALTER TABLE lms_lessons ADD COLUMN IF NOT EXISTS thumbnail_cloudinary_public_id VARCHAR(255)`
    );

    // Create LMS Staff Table
    const createStaffTable = `
      CREATE TABLE IF NOT EXISTS lms_staff (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        full_name VARCHAR(200) NOT NULL,
        email VARCHAR(200),
        branch_location VARCHAR(100),
        role VARCHAR(50) DEFAULT 'Trainee',
        phone VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await dbManager.executeUnsafe(createStaffTable);

    // Create LMS Lesson Completions Table
    const createCompletionsTable = `
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
    `;
    await dbManager.executeUnsafe(createCompletionsTable);

    // Create LMS Lesson Progress Table
    const createProgressTable = `
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
    `;
    await dbManager.executeUnsafe(createProgressTable);

    // Create indexes for performance
    const createIndexes = [
      `CREATE INDEX IF NOT EXISTS idx_lms_lessons_category ON lms_lessons(category_id)`,
      `CREATE INDEX IF NOT EXISTS idx_lms_lessons_order ON lms_lessons(order_index)`,
      `CREATE INDEX IF NOT EXISTS idx_lms_completions_staff ON lms_lesson_completions(staff_id)`,
      `CREATE INDEX IF NOT EXISTS idx_lms_completions_lesson ON lms_lesson_completions(lesson_id)`,
      `CREATE INDEX IF NOT EXISTS idx_lms_progress_staff_lesson ON lms_lesson_progress(staff_id, lesson_id)`,
      `CREATE INDEX IF NOT EXISTS idx_lms_progress_last_watched ON lms_lesson_progress(last_watched_at)`,
      `CREATE INDEX IF NOT EXISTS idx_lms_staff_branch ON lms_staff(branch_location)`,
      `CREATE INDEX IF NOT EXISTS idx_lms_staff_user ON lms_staff(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_lms_categories_active ON lms_categories(is_active)`,
    ];

    for (const indexQuery of createIndexes) {
      await dbManager.executeUnsafe(indexQuery);
    }

    // Create updated_at trigger function if it doesn't exist
    const createTriggerFunction = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `;
    await dbManager.executeUnsafe(createTriggerFunction);

    // Create triggers for updated_at (wrapped in try-catch to handle "already exists" errors)
    const createTriggers = [
      { table: 'lms_categories', trigger: 'update_lms_categories_updated_at' },
      { table: 'lms_lessons', trigger: 'update_lms_lessons_updated_at' },
      { table: 'lms_staff', trigger: 'update_lms_staff_updated_at' },
      { table: 'lms_lesson_progress', trigger: 'update_lms_lesson_progress_updated_at' },
    ];

    for (const { table, trigger } of createTriggers) {
      try {
        // Drop trigger if exists, then create
        await dbManager.executeUnsafe(`DROP TRIGGER IF EXISTS ${trigger} ON ${table}`);
        await dbManager.executeUnsafe(`
          CREATE TRIGGER ${trigger} 
          BEFORE UPDATE ON ${table}
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        `);
      } catch (_triggerError) {
        // If trigger already exists, log but don't fail
        console.log(`[LMS Init] Trigger ${trigger} may already exist, continuing...`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "LMS tables initialized successfully",
    });
  } catch (error) {
    console.error("[LMS Init] Error initializing tables:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to initialize LMS tables";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
