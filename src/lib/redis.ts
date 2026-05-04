import { kv } from '@vercel/kv';

export const redis = kv;

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get(key);
    return value as T | null;
  } catch {
    return null;
  }
}

export async function setCache<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch {
    // Ignore Redis errors - fallback to HTTP cache
  }
}

export async function delCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch {
    // Ignore Redis errors - fallback to stale-safe application behavior
  }
}

export async function delCachePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return;
    await redis.del(...keys);
  } catch {
    // Ignore Redis errors - cache invalidation is best-effort
  }
}
