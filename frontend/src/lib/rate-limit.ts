// Rate limiting distribuído para endpoints públicos; usa memória somente no desenvolvimento.
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const hasRedis = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const limiter = hasRedis
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(60, "1 m"), prefix: "crm-jd" })
  : null;

const localHits = new Map<string, { count: number; resetAt: number }>();

export async function allowRequest(key: string, limit = 60): Promise<boolean> {
  if (limiter) return (await limiter.limit(key)).success;
  const now = Date.now();
  const current = localHits.get(key);
  if (!current || current.resetAt <= now) {
    localHits.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}

