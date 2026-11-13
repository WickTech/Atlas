// Shared guard for third-party URLs that end up in href / img src.
/**
 * External article/image URLs (GDELT, RSS, Alpha Vantage, GDACS) are third-party data that end up in `href`s. Accept only
 * absolute http(s) URLs so `javascript:`, `data:` etc. never reach the UI.
 */
export const safeHttpUrl = (raw: unknown): string | null => {
  if (typeof raw !== "string") return null;
  try {
    const u = new URL(raw.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
};
