/**
 * LMS Cache Layer - Vercel KV Integration
 * High-performance caching for /api/lms/lessons endpoint
 *
 * Cache Strategy:
 * - lessons-{categoryId}: All lessons for category (5min TTL)
 * - lessons-seq-{categoryId}-{staffId}: Sequential lessons (5min TTL)
 * - Invalidated on lesson/category updates
 *
 * @module lms-cache
 */

import type { VercelKV } from '@vercel/kv';
import type { LmsLesson } from './lms-schema';

let kv: VercelKV | null = null;

async function ensureKv() {
  if (kv || process.env.NODE_ENV === 'development') return;
  try {
    const vercelKv = await import('@vercel/kv');
    kv = vercelKv.kv;
  } catch (error) {
    console.error('[LmsCache] Vercel KV import failed:', error);
  }
}

// ============================================================================
// Cache Keys & TTLs
// ============================================================================

const CACHE_PREFIX = 'lms:';
const LESSONS_CACHE_TTL = 60 * 5; // 5 minutes
const _STATS_CACHE_TTL = 60 * 10;  // 10 minutes

export interface LmsCacheResult<T> {
  success: boolean;
  data?: T;
  fromCache?: boolean;
  cachedAt?: number;
  ttlRemaining?: number;
}

// ============================================================================
// Lesson Caching
// ============================================================================

/**
 * Get cached lessons by category (regular list)
 */
export async function getCachedLessonsByCategory(
  categoryId: number
): Promise<LmsCacheResult<LmsLesson[]>> {
  const cacheKey = `${CACHE_PREFIX}lessons:${categoryId}`;
  await ensureKv();

  if (process.env.NODE_ENV === 'development' || !kv) {
    return { success: false };
  }

  try {
    const cached = await kv.get(cacheKey);

    if (cached) {
      const ttl = await kv.ttl(cacheKey);
      return {
        success: true,
        data: cached as LmsLesson[],
        fromCache: true,
        cachedAt: Date.now(),
        ttlRemaining: ttl,
      };
    }

    return { success: false };
  } catch (error) {
    console.error('[LmsCache] Get lessons error:', error);
    return { success: false };
  }
}

/**
 * Cache lessons by category
 */
export async function setCachedLessonsByCategory(
  categoryId: number,
  lessons: LmsLesson[]
): Promise<boolean> {
  const cacheKey = `${CACHE_PREFIX}lessons:${categoryId}`;
  await ensureKv();

  if (!kv) return false;

  try {
    await kv.set(cacheKey, lessons, { ex: LESSONS_CACHE_TTL });
    return true;
  } catch (error) {
    console.error('[LmsCache] Set lessons error:', error);
    return false;
  }
}

/**
 * Get cached sequential lessons
 */
export async function getCachedSequentialLessons(
  categoryId: number,
  staffId: number
): Promise<LmsCacheResult<LmsLesson[]>> {
  const cacheKey = `${CACHE_PREFIX}lessons-seq:${categoryId}:${staffId}`;
  await ensureKv();

  if (!kv) return { success: false };

  try {
    const cached = await kv.get(cacheKey);

    if (cached) {
      const ttl = await kv.ttl(cacheKey);
      return {
        success: true,
        data: cached as LmsLesson[],
        fromCache: true,
        cachedAt: Date.now(),
        ttlRemaining: ttl,
      };
    }

    return { success: false };
  } catch (error) {
    console.error('[LmsCache] Get sequential lessons error:', error);
    return { success: false };
  }
}

/**
 * Cache sequential lessons
 */
export async function setCachedSequentialLessons(
  categoryId: number,
  staffId: number,
  lessons: LmsLesson[]
): Promise<boolean> {
  const cacheKey = `${CACHE_PREFIX}lessons-seq:${categoryId}:${staffId}`;

  if (!kv) return false;

  try {
    await kv.set(cacheKey, lessons, { ex: LESSONS_CACHE_TTL });
    return true;
  } catch (error) {
    console.error('[LmsCache] Set sequential lessons error:', error);
    return false;
  }
}

// ============================================================================
// Cache Invalidation
// ============================================================================

/**
 * Invalidate all caches for a category (called on lesson/category update)
 */
export async function invalidateCategoryCache(categoryId: number): Promise<void> {
  await ensureKv();
  if (!kv) return;
  const client = kv;

  const keys = [
    `${CACHE_PREFIX}lessons:${categoryId}`,
  ];

  try {
    await Promise.all(
      keys.map(key => client.del(key))
    );
  } catch (error) {
    console.error('[LmsCache] Invalidate error:', error);
  }
}

/**
 * Invalidate all LMS caches (nuclear option - on major schema changes)
 */
export async function clearAllLmsCache(): Promise<void> {
  await ensureKv();
  if (!kv) return;
  const client = kv;

  try {
    await client.flushdb();
    console.log('[LmsCache] All LMS cache cleared');
  } catch (error) {
    console.error('[LmsCache] Clear all error:', error);
  }
}

// ============================================================================
// Cache Stats & Health
// ============================================================================

/**
 * Get cache hit statistics
 */
export async function getCacheStats(): Promise<{
  totalKeys: number;
  lmsKeys: number;
  memoryUsage: number;
}> {
  if (!kv) {
    return { totalKeys: 0, lmsKeys: 0, memoryUsage: 0 };
  }

interface RedisInfo {
  keys?: string;
  used_memory?: string;
  [key: string]: string | undefined;
}

  try {
    const info = await (kv as VercelKV & { info(): Promise<RedisInfo> }).info();
    return {
      totalKeys: parseInt(info.keys || '0'),
      lmsKeys: 0, // Vercel KV doesn't support pattern count
      memoryUsage: parseInt(info.used_memory || '0'),
    };
  } catch {
    return { totalKeys: 0, lmsKeys: 0, memoryUsage: 0 };
  }
}

// ============================================================================
// Default Export
// ============================================================================

const lmsCache = {
  getCachedLessonsByCategory,
  setCachedLessonsByCategory,
  getCachedSequentialLessons,
  setCachedSequentialLessons,
  invalidateCategoryCache,
  clearAllLmsCache,
  getCacheStats,
};

export default lmsCache;
