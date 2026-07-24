// Upstream APIs (GDELT in particular) occasionally hang with no response at
// all instead of erroring — plain `fetch` has no default timeout, so a single
// stuck connection can block the whole metrics pipeline indefinitely. Every
// outbound call in shared/ should go through this instead of raw `fetch`.
const fetchWithTimeout = (url, options = {}, timeoutMs = 7000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
};

module.exports = { fetchWithTimeout };
