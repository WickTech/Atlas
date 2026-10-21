// Upstream APIs (GDELT in particular) occasionally hang with no response at
// all instead of erroring — plain `fetch` has no default timeout, so a single
// stuck connection can block the whole metrics pipeline indefinitely. Every
// outbound call in src/server should go through this instead of raw `fetch`.
export const fetchWithTimeout = (
  url: string,
  options: RequestInit = {},
  timeoutMs = 7000
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
};

export const USER_AGENT = "Atlas/2.0 (+https://github.com/WickTech/Atlas)";

export const asNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};
