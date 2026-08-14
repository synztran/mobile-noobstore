import { safeRedirect } from "@/lib/auth/redirect";
import { type NextRequest, NextResponse } from "next/server";
import { getAlertLimiter, getApiLimiter, getAuthLimiter, getRateLimitKey } from "@/lib/redis/ratelimit";
import { notifyRateLimitHit } from "@/lib/telegram/telegram.service";

/**
 * Lightweight session check — reads the Supabase auth cookie directly without
 * importing the full @supabase/supabase-js SDK. This keeps middleware on the
 * Edge runtime tiny (< 2 kB vs 87 kB with the SDK).
 *
 * Security note: this only checks cookie presence/expiry for routing decisions.
 * Actual JWT verification still happens in every API route and server component
 * via supabase.auth.getUser() from the server client.
 */
function hasValidSession(request: NextRequest): boolean {
  try {
    const cookies = request.cookies.getAll();

    // @supabase/ssr stores session in sb-*-auth-token (or chunked as .0, .1 …)
    const sessionCookie = cookies.find(
      ({ name }) =>
        name.startsWith("sb-") &&
        (name.endsWith("-auth-token") || name.endsWith("-auth-token.0"))
    );

    if (!sessionCookie?.value) return false;

    let raw = sessionCookie.value;

    // Base64url-decode if the value looks base64url-encoded (no manual Buffer
    // calls — Edge runtime may not support Buffer.from with base64url encoding)
    if (/^[A-Za-z0-9_-]+$/.test(raw) && raw.includes(".")) {
      try {
        const decoded = atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
        if (decoded.startsWith("{")) raw = decoded;
      } catch {
        // not base64 — use raw value
      }
    }

    const session = JSON.parse(raw) as { expires_at?: number };
    if (typeof session.expires_at !== "number") return true;
    return session.expires_at > Math.floor(Date.now() / 1000);
  } catch {
    // Cookie exists but can't be parsed (e.g. chunked, unusual encoding).
    // Let it through — server-side auth.getUser() does the real JWT validation.
    return true;
  }
}

/**
 * Public read endpoints whose responses are cached (Redis + CDN). Rate
 * limiting them adds an Upstash round-trip (~100-190ms) to every request
 * without meaningful abuse protection — the data is global and cached.
 * Only GET requests are exempt; mutations and user-scoped routes stay
 * rate-limited.
 */
const PUBLIC_CACHED_READ_PREFIXES = [
	"/api/home/",
	"/api/products",
	"/api/services",
	"/api/shipping-methods",
	"/api/fees",
	"/api/payment-information",
	"/api/community/posts",
	"/api/reviews/recent",
	"/api/blog",
	"/api/gacha/recent-winners",
	"/api/location/wards",
];

function isPublicCachedRead(method: string, pathname: string): boolean {
	if (method !== "GET") return false;
	return PUBLIC_CACHED_READ_PREFIXES.some((prefix) =>
		pathname.startsWith(prefix),
	);
}

/**
 * Fire-and-forget rate limit alert to Telegram (max 1 per 5 min).
 */
function fireRateLimitAlert(ip: string, path: string, isAuthenticated: boolean): void {
  getAlertLimiter()
    .limit("ratelimit-alert")
    .then(({ success }) => {
      if (success) {
        notifyRateLimitHit(ip, path, isAuthenticated);
      }
    })
    .catch(() => {
      // alert failure is non-critical, silently ignore
    });
}

export async function middleware(request: NextRequest) {
  try {
    const { pathname, hostname } = request.nextUrl;

    // Subdomain rewrite — keep visitor on subdomain but serve target page
    const subdomain = hostname.split(".")[0];
    const SUBDOMAIN_ROUTES: Record<string, string> = {
      gacha: "/gacha",
      support: "/profile/support",
      blog: "/blogs",
    };
    if (subdomain in SUBDOMAIN_ROUTES && pathname === "/") {
      request.nextUrl.pathname = SUBDOMAIN_ROUTES[subdomain];
      return NextResponse.rewrite(request.nextUrl);
    }

    const pathNames = ['/signin', '/signup']
    const isLoggedIn = hasValidSession(request);

    // Rate limit auth endpoints (login, register) — 10 req/min per IP
    if (pathNames.includes(pathname)) {
      try {
        const { success, reset } = await getAuthLimiter().limit(
          getRateLimitKey(request)
        );
        if (!success) {
          fireRateLimitAlert(getRateLimitKey(request), pathname, false);
          return NextResponse.json(
            { error: "Quá nhiều lần thử. Vui lòng chờ vài giây." },
            {
              status: 429,
              headers: {
                "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
              },
            }
          );
        }
      } catch (rateLimitError) {
        console.warn(
          "[middleware] auth rate limiter unavailable:",
          rateLimitError
        );
      }
    }

    // Rate limit all /api/* routes — 100 req/min per IP
    if (
      pathname.startsWith("/api/") &&
      !isPublicCachedRead(request.method, pathname) &&
      !pathname.startsWith("/api/health") &&
      !pathname.startsWith("/api/analytics/") &&
      !pathname.startsWith("/api/cron/") &&
      !pathname.startsWith("/api/jobs/")
    ) {
      try {
        const { success, reset } = await getApiLimiter().limit(
          getRateLimitKey(request),
        );
        if (!success) {
          fireRateLimitAlert(getRateLimitKey(request), pathname, isLoggedIn);
          return NextResponse.json(
            { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
            {
              status: 429,
              headers: {
                "Retry-After": String(
                  Math.ceil((reset - Date.now()) / 1000),
                ),
              },
            },
          );
        }
      } catch (err) {
        console.warn("[middleware] API rate limiter unavailable:", err);
      }
    }

    // Redirect unauthenticated users away from protected routes
    if (pathname.startsWith("/checkout") && !isLoggedIn) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Redirect authenticated users away from auth pages
    if ((pathname === "/login" || pathname === "/register") && isLoggedIn) {
      const nextParam = safeRedirect(
        request.nextUrl.searchParams.get("next"),
        request.url
      );
      return NextResponse.redirect(new URL(nextParam, request.url));
    }
  } catch (err) {
    console.error("[middleware] unexpected error:", err);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
