/**
 * Notification links are internal application paths only.
 * Never allow Push or in-app notifications to open external URLs or schemes.
 */
export function normalizeInternalNotificationPath(
  value: unknown,
  fallback = "/notifications"
): string {
  if (typeof value !== "string" || value.length > 2048) return fallback;
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") ||
      path.includes("\\") || /[\u0000-\u001F\u007F]/.test(path)) return fallback;
  try {
    const base = "https://woffu.invalid";
    const parsed = new URL(path, base);
    if (parsed.origin !== base || parsed.username || parsed.password) return fallback;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return fallback;
  }
}
