/**
 * Route-transition classification — the pure predicate that decides which
 * loading screen a navigation earns.
 *
 * The rule: a navigation that keeps the **same first path segment** only swaps
 * the child page under an already-rendered parent (`/shop` -> `/shop/{slug}`,
 * `/profile` -> `/profile/orders`, `/shop/a` -> `/shop/b`). Those keep the
 * parent page mounted and earn the lightweight blur + spinner overlay.
 * Anything else swaps the whole page (`/` -> `/shop`, `/shop` -> `/cart`).
 *
 * Callers decide which surface owns a classification: `SplashScreen` only
 * shows when the destination is the home route, while `PageTransitionLoader`
 * covers every other cold load / nested / isolated navigation.
 *
 * Zero React/Next imports so this runs in Vitest and in any client bundle.
 */

export type RouteTransition = "initial" | "same" | "nested" | "isolated";

/**
 * Normalize a pathname for comparison: drop the query string and hash (Next's
 * `usePathname` already omits them, but this keeps the helper honest for any
 * caller), then collapse trailing slashes so `/shop/` and `/shop` agree.
 */
function normalize(pathname: string): string {
  const path = pathname.split("?")[0].split("#")[0];
  if (path === "/") return "/";
  return path.replace(/\/+$/, "") || "/";
}

/**
 * The first path segment. The root path has no segment and yields `""`, so
 * `/` -> `/shop` classifies as `isolated` — landing on the home page is a real
 * page swap, not a nested child mount.
 *
 * Comparison is case-sensitive: Next.js routes are case-sensitive, so `/Shop`
 * and `/shop` are different parents and must not be treated as nested.
 */
export function firstSegment(pathname: string): string {
  return normalize(pathname).split("/")[1] ?? "";
}

/**
 * Classify a navigation from `prev` to `next`.
 *
 * - `initial`  — no previous route yet (cold load); the full splash owns it.
 * - `same`     — same normalized path; nothing to load.
 * - `nested`   — same first segment; only the child swaps -> light loader.
 * - `isolated` — different first segment; the whole page swaps -> full splash.
 */
export function classifyRouteTransition(
  prev: string | null,
  next: string
): RouteTransition {
  if (prev === null) return "initial";

  const from = normalize(prev);
  const to = normalize(next);

  if (from === to) return "same";
  if (firstSegment(from) === firstSegment(to)) return "nested";
  return "isolated";
}
