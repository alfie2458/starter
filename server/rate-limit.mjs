export function createRateLimiter({ limit = 120, windowMs = 60_000 } = {}) {
  const buckets = new Map();
  return function rateLimit(key, now = Date.now()) {
    const previous = buckets.get(key);
    if (!previous || now - previous.startedAt >= windowMs) { buckets.set(key, { startedAt: now, count: 1 }); return { allowed: true, remaining: limit - 1 }; }
    previous.count += 1;
    return { allowed: previous.count <= limit, remaining: Math.max(0, limit - previous.count), retryAfterMs: windowMs - (now - previous.startedAt) };
  };
}
