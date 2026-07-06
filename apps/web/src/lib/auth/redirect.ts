/**
 * Validate a redirect URL is safe — same-origin only.
 * Server-side: pass `baseUrl` from request.url or request.nextUrl.origin.
 * Client-side: omit `baseUrl` (uses window.location.origin).
 */
export function safeRedirect(
  url: string | null | undefined,
  baseUrl?: string,
  defaultPath = "/"
): string {
  if (!url) return defaultPath;

  const origin =
    baseUrl ??
    (typeof window !== "undefined" ? window.location.origin : undefined);

  if (!origin) {
    // Fallback: only allow relative paths
    return url.startsWith("/") ? url : defaultPath;
  }

  try {
    const dest = new URL(url, origin);
    const destOrigin = dest.origin;
    const baseOrigin = new URL(origin).origin;
    if (destOrigin !== baseOrigin) return defaultPath;
    return dest.pathname + dest.search + dest.hash;
  } catch {
    return defaultPath;
  }
}
