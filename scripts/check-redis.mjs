import "dotenv/config";
import { createClient } from "@vercel/kv";

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.error(
    "Redis is not configured. Set KV_REST_API_URL/KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN."
  );
  process.exit(1);
}

const redis = createClient({ url, token });
const key = `ec:redis-check:${Date.now()}`;
const expected = {
  ok: true,
  checkedAt: new Date().toISOString(),
};

try {
  await redis.set(key, expected, { ex: 60 });
  const actual = await redis.get(key);
  await redis.del(key);

  if (!actual || actual.ok !== true) {
    throw new Error("Redis returned an unexpected value.");
  }

  console.log("Redis OK: set/get/delete succeeded.");
} catch (error) {
  console.error("Redis check failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}
