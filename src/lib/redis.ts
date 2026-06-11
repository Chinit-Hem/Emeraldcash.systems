import { createClient } from '@vercel/kv';
import type { VercelKV } from '@vercel/kv';

type RedisConfig = {
  url: string;
  token: string;
};

function getRedisConfig(): RedisConfig | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;
  return { url, token };
}

function createUnavailableRedisClient(): VercelKV {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then" || prop === "parse") return undefined;

        return () => {
          throw new Error(
            "Redis is not configured. Set KV_REST_API_URL/KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN."
          );
        };
      },
    }
  ) as VercelKV;
}

const redisConfig = getRedisConfig();

export const isRedisConfigured = Boolean(redisConfig);
export const redis: VercelKV = redisConfig
  ? createClient(redisConfig)
  : createUnavailableRedisClient();

type MemoryCacheEntry = {
  value: unknown;
  expiresAt: number;
};

const memoryCache = new Map<string, MemoryCacheEntry>();
const MAX_MEMORY_CACHE_ENTRIES = 200;

function getMemoryCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }

  memoryCache.delete(key);
  memoryCache.set(key, entry);
  return entry.value as T;
}

function setMemoryCache<T>(key: string, value: T, ttlSeconds: number): void {
  if (memoryCache.size >= MAX_MEMORY_CACHE_ENTRIES) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) memoryCache.delete(firstKey);
  }

  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

function deleteMemoryCachePattern(pattern: string): void {
  const matcher = new RegExp(
    `^${pattern.split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`
  );

  for (const key of memoryCache.keys()) {
    if (matcher.test(key)) memoryCache.delete(key);
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get(key);
    if (value !== null && value !== undefined) {
      return value as T;
    }
    return getMemoryCache<T>(key);
  } catch {
    return getMemoryCache<T>(key);
  }
}

export async function setCache<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  setMemoryCache(key, value, ttlSeconds);

  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch {
    // Ignore Redis errors; the in-memory TTL cache covers local/non-KV runtimes.
  }
}

export async function delCache(key: string): Promise<void> {
  memoryCache.delete(key);

  try {
    await redis.del(key);
  } catch {
    // Ignore Redis errors; cache invalidation is best-effort.
  }
}

export async function delCachePattern(pattern: string): Promise<void> {
  deleteMemoryCachePattern(pattern);

  try {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return;
    await redis.del(...keys);
  } catch {
    // Ignore Redis errors; cache invalidation is best-effort.
  }
}
