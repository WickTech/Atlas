// Fixed-window per-key limiter. Best-effort only: state is per serverless
// instance, so it caps casual abuse of the shared free-tier LLM keys rather
// than enforcing a global quota.
export const createRateLimiter = (limit: number, windowMs: number, maxKeys = 5000) => {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (key: string, now = Date.now()): { ok: boolean; retryAfterS: number } => {
    const cur = hits.get(key);
    if (!cur || now >= cur.resetAt) {
      if (hits.size >= maxKeys) hits.delete(hits.keys().next().value as string);
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return { ok: true, retryAfterS: 0 };
    }
    cur.count += 1;
    return cur.count <= limit ? { ok: true, retryAfterS: 0 } : { ok: false, retryAfterS: Math.ceil((cur.resetAt - now) / 1000) };
  };
};

/** Small LRU for identical requests (Map preserves insertion order). */
export const createLru = <V>(max: number, ttlMs: number) => {
  const m = new Map<string, { v: V; exp: number }>();
  return {
    get(k: string, now = Date.now()): V | undefined {
      const e = m.get(k);
      if (!e) return undefined;
      if (now > e.exp) {
        m.delete(k);
        return undefined;
      }
      m.delete(k);
      m.set(k, e); // refresh recency
      return e.v;
    },
    set(k: string, v: V, now = Date.now()) {
      m.delete(k);
      m.set(k, { v, exp: now + ttlMs });
      if (m.size > max) m.delete(m.keys().next().value as string);
    }
  };
};
