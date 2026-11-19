/** Prosty limiter zapytań w pamięci (okno przesuwne) — chroni przed nadużyciem kosztów API. */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return {
    take(key: string, nowMs = Date.now()): boolean {
      const list = (hits.get(key) ?? []).filter((t) => nowMs - t < windowMs);
      if (list.length >= limit) {
        hits.set(key, list);
        return false;
      }
      list.push(nowMs);
      hits.set(key, list);
      if (hits.size > 10_000) {
        for (const [k, v] of hits) if (v.every((t) => nowMs - t >= windowMs)) hits.delete(k);
      }
      return true;
    },
  };
}
