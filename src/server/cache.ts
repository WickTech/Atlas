// In-instance TTL cache with inflight de-dupe: concurrent cold requests share a
// single upstream fetch, and a refresh failure serves the last good value.
// Module state survives across invocations on a warm serverless instance
// (best-effort — CDN `s-maxage` headers are the cross-instance layer).
export interface Cached<T> {
  data: T;
  fetchedAt: number;
}

export const createCache = <T>(load: () => Promise<T>, ttlMs: number, merge?: (fresh: T, prev: T | null) => T) => {
  let cached: Cached<T> | null = null;
  let inflight: Promise<T> | null = null;

  const get = async (): Promise<Cached<T>> => {
    if (cached && Date.now() - cached.fetchedAt < ttlMs) return cached;
    inflight ??= load()
      .then((fresh) => {
        const data = merge ? merge(fresh, cached?.data ?? null) : fresh;
        cached = { data, fetchedAt: Date.now() };
        return data;
      })
      .finally(() => {
        inflight = null;
      });
    try {
      await inflight;
      return cached as Cached<T>;
    } catch (error) {
      if (cached) return cached;
      throw error;
    }
  };

  return { get };
};
