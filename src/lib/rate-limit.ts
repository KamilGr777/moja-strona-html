import { redis } from "./redis";
import { HttpError } from "./http";

/**
 * Prosty limiter okna stałego oparty o Redis.
 * Rzuca HttpError 429 z komunikatem po polsku po przekroczeniu limitu.
 */
export async function rateLimit(key: string, limit: number, windowSec: number, label = "operacji") {
  const bucket = Math.floor(Date.now() / 1000 / windowSec);
  const k = `rl:${key}:${bucket}`;
  try {
    const r = redis();
    const count = await r.incr(k);
    if (count === 1) await r.expire(k, windowSec + 5);
    if (count > limit) {
      throw new HttpError(429, `Przekroczono limit ${label} (${limit} na ${Math.round(windowSec / 60)} min). Spróbuj później.`, "rate_limited");
    }
  } catch (e) {
    if (e instanceof HttpError) throw e;
    // Redis niedostępny — nie blokujemy użytkownika, ale logujemy
    console.warn("[rate-limit] Redis niedostępny:", (e as Error).message);
  }
}
