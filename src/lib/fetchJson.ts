import { useConsole } from "@/state/store";

/**
 * Browser fetch with a hard timeout and telemetry: every call (ok or not)
 * lands in the store's ring buffer, which drives the status rail.
 */
/** Default record count for telemetry: common collection shapes, else 1. */
const defaultCount = (d: unknown): number => {
  if (Array.isArray(d)) return d.length;
  const o = d as { items?: unknown[]; features?: unknown[] } | null;
  return o?.items?.length ?? o?.features?.length ?? 1;
};

export const fetchJson = async <T>(
  url: string,
  source: string,
  signal?: AbortSignal,
  timeoutMs = 15_000,
  count: (data: T) => number = defaultCount
): Promise<T> => {
  const started = performance.now();
  const push = (ok: boolean, count: number) =>
    useConsole.getState().pushTelemetry({ source, fetchedAt: new Date().toISOString(), latencyMs: Math.round(performance.now() - started), count, ok });
  const timeout = AbortSignal.timeout(timeoutMs);
  try {
    const res = await fetch(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
    if (!res.ok) throw new Error(`${source} ${res.status}`);
    const data = (await res.json()) as T;
    push(true, count(data));
    return data;
  } catch (e) {
    if (!signal?.aborted) push(false, 0);
    throw e;
  }
};
