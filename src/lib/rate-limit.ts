import { redis } from "@/lib/redis";

type MemoryRateLimitEntry = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  limited: boolean;
  count: number;
  remaining: number;
  retryAfter?: number;
  resetAt: number;
};

const memoryRateLimits = new Map<string, MemoryRateLimitEntry>();
const MAX_MEMORY_RATE_LIMIT_KEYS = 20_000;

function pruneMemoryRateLimits(now = Date.now()): void {
  for (const [key, entry] of memoryRateLimits) {
    if (entry.resetAt <= now) memoryRateLimits.delete(key);
  }

  while (memoryRateLimits.size > MAX_MEMORY_RATE_LIMIT_KEYS) {
    const oldestKey = memoryRateLimits.keys().next().value as string | undefined;
    if (!oldestKey) break;
    memoryRateLimits.delete(oldestKey);
  }
}

function consumeMemoryRateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  pruneMemoryRateLimits(now);

  const existing = memoryRateLimits.get(key);
  const resetAt = existing && existing.resetAt > now ? existing.resetAt : now + windowSeconds * 1000;
  const count = existing && existing.resetAt > now ? existing.count + 1 : 1;

  memoryRateLimits.set(key, { count, resetAt });

  const remaining = Math.max(limit - count, 0);
  const retryAfter = Math.max(Math.ceil((resetAt - now) / 1000), 1);

  return {
    limited: count > limit,
    count,
    remaining,
    retryAfter: count > limit ? retryAfter : undefined,
    resetAt,
  };
}

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const normalizedKey = `rate-limit:${key}`;
  const now = Date.now();

  try {
    const count = await redis.incr(normalizedKey);
    if (count === 1) {
      await redis.expire(normalizedKey, windowSeconds);
    }

    const ttl = await redis.ttl(normalizedKey);
    const retryAfter = ttl > 0 ? ttl : windowSeconds;
    const resetAt = now + retryAfter * 1000;

    return {
      limited: count > limit,
      count,
      remaining: Math.max(limit - count, 0),
      retryAfter: count > limit ? retryAfter : undefined,
      resetAt,
    };
  } catch {
    return consumeMemoryRateLimit(normalizedKey, limit, windowSeconds);
  }
}

export async function clearRateLimit(key: string): Promise<void> {
  const normalizedKey = `rate-limit:${key}`;
  memoryRateLimits.delete(normalizedKey);

  try {
    await redis.del(normalizedKey);
  } catch {
    // In-memory fallback has already been cleared.
  }
}
