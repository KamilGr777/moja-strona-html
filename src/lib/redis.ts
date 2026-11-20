import IORedis from "ioredis";
import { env } from "./env";

const g = globalThis as unknown as { redis?: IORedis };

/** Połączenie Redis współdzielone przez kolejkę i limity. */
export function redis(): IORedis {
  if (!g.redis) {
    g.redis = new IORedis(env().REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: false });
    g.redis.on("error", (e) => console.error("[redis]", e.message));
  }
  return g.redis;
}
