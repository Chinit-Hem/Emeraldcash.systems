import { dbManager } from "@/lib/db-singleton";
import type { Role } from "@/shared/types/types";

export const LMS_LESSON_AUDIENCE_ROLES = ["Staff", "Accounting"] as const;

export type LmsLessonAudienceRole = (typeof LMS_LESSON_AUDIENCE_ROLES)[number];

type LessonIdLike = {
  id: number | string;
};

const audienceRoleSet = new Set<string>(LMS_LESSON_AUDIENCE_ROLES);

export function normalizeLessonAudienceRoles(value: unknown): LmsLessonAudienceRole[] {
  const values = Array.isArray(value) ? value : [];
  const roles = new Set<LmsLessonAudienceRole>();

  for (const item of values) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (audienceRoleSet.has(trimmed)) {
      roles.add(trimmed as LmsLessonAudienceRole);
    }
  }

  return [...roles];
}

export function getEffectiveLessonAudienceRoles(role?: Role | null): LmsLessonAudienceRole[] {
  if (role === "Finance") {
    return ["Staff", "Accounting"];
  }

  if (role === "Admin") {
    return [...LMS_LESSON_AUDIENCE_ROLES];
  }

  return ["Staff"];
}

export function canRoleAccessLesson(
  role: Role | undefined | null,
  allowedRoles: readonly string[]
): boolean {
  if (role === "Admin") return true;
  if (allowedRoles.length === 0) return true;

  const effectiveRoles = getEffectiveLessonAudienceRoles(role);
  return allowedRoles.some((allowedRole) =>
    effectiveRoles.includes(allowedRole as LmsLessonAudienceRole)
  );
}

export async function ensureLmsLessonRoleAccessTable(): Promise<void> {
  await dbManager.executeUnsafe(`
    CREATE TABLE IF NOT EXISTS lms_lesson_role_access (
      lesson_id INTEGER NOT NULL REFERENCES lms_lessons(id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (lesson_id, role)
    )
  `);

  await dbManager.executeUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_lms_lesson_role_access_role
    ON lms_lesson_role_access(role)
  `);
}

export async function getAllowedRolesForLessons(
  lessonIds: readonly number[]
): Promise<Map<number, LmsLessonAudienceRole[]>> {
  const roleMap = new Map<number, LmsLessonAudienceRole[]>();
  const uniqueLessonIds = [...new Set(lessonIds.filter((id) => Number.isInteger(id) && id > 0))];

  if (uniqueLessonIds.length === 0) {
    return roleMap;
  }

  await ensureLmsLessonRoleAccessTable();

  const placeholders = uniqueLessonIds.map((_, index) => `$${index + 1}`).join(", ");
  const rows = await dbManager.executeUnsafe<{ lesson_id: number | string; role: string }>(
    `
      SELECT lesson_id, role
      FROM lms_lesson_role_access
      WHERE lesson_id IN (${placeholders})
      ORDER BY lesson_id, role
    `,
    uniqueLessonIds
  );

  for (const row of rows) {
    const lessonId = Number(row.lesson_id);
    const [role] = normalizeLessonAudienceRoles([row.role]);
    if (!role) continue;

    const roles = roleMap.get(lessonId) ?? [];
    roles.push(role);
    roleMap.set(lessonId, roles);
  }

  return roleMap;
}

export async function getAllowedRolesForLesson(
  lessonId: number
): Promise<LmsLessonAudienceRole[]> {
  const roleMap = await getAllowedRolesForLessons([lessonId]);
  return roleMap.get(lessonId) ?? [];
}

export async function setLessonAllowedRoles(
  lessonId: number,
  rawRoles: unknown
): Promise<LmsLessonAudienceRole[]> {
  const roles = normalizeLessonAudienceRoles(rawRoles);

  await ensureLmsLessonRoleAccessTable();
  await dbManager.executeUnsafe(
    "DELETE FROM lms_lesson_role_access WHERE lesson_id = $1",
    [lessonId]
  );

  for (const role of roles) {
    await dbManager.executeUnsafe(
      `
        INSERT INTO lms_lesson_role_access (lesson_id, role)
        VALUES ($1, $2)
        ON CONFLICT (lesson_id, role) DO NOTHING
      `,
      [lessonId, role]
    );
  }

  return roles;
}

export async function canAccessLessonForRole(
  lessonId: number,
  role: Role | undefined | null
): Promise<boolean> {
  const allowedRoles = await getAllowedRolesForLesson(lessonId);
  return canRoleAccessLesson(role, allowedRoles);
}

export async function attachAllowedRolesToLessons<T extends LessonIdLike>(
  lessons: readonly T[]
): Promise<Array<T & { allowed_roles: LmsLessonAudienceRole[]; allowedRoles: LmsLessonAudienceRole[] }>> {
  const lessonIds = lessons
    .map((lesson) => Number(lesson.id))
    .filter((lessonId) => Number.isInteger(lessonId) && lessonId > 0);
  const rolesByLessonId = await getAllowedRolesForLessons(lessonIds);

  return lessons.map((lesson) => {
    const allowedRoles = rolesByLessonId.get(Number(lesson.id)) ?? [];
    return {
      ...lesson,
      allowed_roles: allowedRoles,
      allowedRoles,
    };
  });
}

export async function filterLessonsForRole<T extends LessonIdLike>(
  lessons: readonly T[],
  role: Role | undefined | null
): Promise<T[]> {
  if (role === "Admin") {
    return [...lessons];
  }

  const lessonIds = lessons
    .map((lesson) => Number(lesson.id))
    .filter((lessonId) => Number.isInteger(lessonId) && lessonId > 0);
  const rolesByLessonId = await getAllowedRolesForLessons(lessonIds);

  return lessons.filter((lesson) => {
    const allowedRoles = rolesByLessonId.get(Number(lesson.id)) ?? [];
    return canRoleAccessLesson(role, allowedRoles);
  });
}

export async function filterLessonIdsForRole(
  lessonIds: readonly number[],
  role: Role | undefined | null
): Promise<number[]> {
  if (role === "Admin") {
    return [...lessonIds];
  }

  const rolesByLessonId = await getAllowedRolesForLessons(lessonIds);
  return lessonIds.filter((lessonId) => {
    const allowedRoles = rolesByLessonId.get(lessonId) ?? [];
    return canRoleAccessLesson(role, allowedRoles);
  });
}

export async function getVisibleLessonCountsByCategory(
  role: Role | undefined | null
): Promise<Map<number, number>> {
  await ensureLmsLessonRoleAccessTable();

  const counts = new Map<number, number>();

  if (role === "Admin") {
    const rows = await dbManager.executeUnsafe<{ category_id: number | string; lesson_count: number | string }>(`
      SELECT category_id, COUNT(*) AS lesson_count
      FROM lms_lessons
      WHERE is_active = true
      GROUP BY category_id
    `);

    for (const row of rows) {
      counts.set(Number(row.category_id), Number(row.lesson_count) || 0);
    }

    return counts;
  }

  const effectiveRoles = getEffectiveLessonAudienceRoles(role);
  const placeholders = effectiveRoles.map((_, index) => `$${index + 1}`).join(", ");
  const rows = await dbManager.executeUnsafe<{ category_id: number | string; lesson_count: number | string }>(
    `
      SELECT l.category_id, COUNT(*) AS lesson_count
      FROM lms_lessons l
      WHERE l.is_active = true
        AND (
          NOT EXISTS (
            SELECT 1
            FROM lms_lesson_role_access access
            WHERE access.lesson_id = l.id
          )
          OR EXISTS (
            SELECT 1
            FROM lms_lesson_role_access access
            WHERE access.lesson_id = l.id
              AND access.role IN (${placeholders})
          )
        )
      GROUP BY l.category_id
    `,
    effectiveRoles
  );

  for (const row of rows) {
    counts.set(Number(row.category_id), Number(row.lesson_count) || 0);
  }

  return counts;
}

export function recomputeSequentialUnlocks<T extends { is_completed?: boolean; isCompleted?: boolean }>(
  lessons: readonly T[]
): T[] {
  let previousCompleted = true;

  return lessons.map((lesson) => {
    const isUnlocked = previousCompleted;
    const isCompleted = Boolean(lesson.is_completed ?? lesson.isCompleted);
    previousCompleted = previousCompleted && isCompleted;

    return {
      ...lesson,
      is_unlocked: isUnlocked,
      isUnlocked,
    };
  });
}
