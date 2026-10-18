// ponytail: in-memory; add Redis when running multiple instances
interface RateEntry { hits: number; windowStart: number }
const store = new Map<string, RateEntry>();

export function checkRateLimit(
  identifier: string,
  action: string,
  maxHits: number,
  windowMs: number,
): { allowed: boolean; remaining: number } {
  const key = `${action}:${identifier}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    store.set(key, { hits: 1, windowStart: now });
    return { allowed: true, remaining: maxHits - 1 };
  }
  if (entry.hits >= maxHits) return { allowed: false, remaining: 0 };
  entry.hits += 1;
  return { allowed: true, remaining: maxHits - entry.hits };
}
