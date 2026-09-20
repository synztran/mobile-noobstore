import { safeRedirect } from "@/modules/user/redirect";
import {
  DEVICE_OVERRIDE_COOKIE,
  resolveDeviceRouting,
} from "@/modules/desktop/device";
import { type NextRequest, NextResponse } from "next/server";
import { getAlertLimiter, getApiLimiter, getRateLimitKey } from "@/lib/redis/ratelimit";
import { notifyRateLimitHit } from "@/lib/telegram/telegram.service";
import { hasUsableSessionCookie } from "@/lib/auth/session-cookie";

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
 * Rate limit alert to Telegram (max 100 per minute, whole-system).
 * Awaited so the notification isn't dropped when the response completes.
 */
async function fireRateLimitAlert(ip: string, path: string, isAuthenticated: boolean): Promise<void> {
  try {
    const { success } = await getAlertLimiter().limit("ratelimit-alert");
    if (success) {
      await notifyRateLimitHit(ip, path, isAuthenticated);
    }
  } catch {
    // alert failure is non-critical, silently ignore
  }
}

export async function middleware(request: NextRequest) {
  // Forwarded to server components; the device gate sets x-device-class in
  // the try block below (unmanaged-host/error paths keep the original headers).
  const requestHeaders = new Headers(request.headers);

  try {
    const { pathname, hostname } = request.nextUrl;

    // ── Device gate (modules/desktop) ──────────────────────────────────
    // Routes phones to m.noobstore.xyz and desktop/tablets to www. Pure
    // decision logic lives in modules/desktop/device.ts; this only executes
    // the action. Unmanaged hosts (localhost, previews) always serve.
    const resolution = resolveDeviceRouting({
      hostname,
      userAgent: request.headers.get("user-agent"),
      overrideCookie: request.cookies.get(DEVICE_OVERRIDE_COOKIE)?.value,
      // Off until m.noobstore.xyz DNS is live — everyone keeps serving on the
      // current host, only the x-device-class header routing between shells
      // stays active.
      mobileSubdomainEnabled: process.env.MOBILE_SUBDOMAIN_ENABLED === "true",
    });
    const deviceClass = resolution.action.deviceClass;

    // APIs never redirect (no HTML), and ?noredirect=1 is a one-request
    // escape hatch (email links, testing). The sticky override is the
    // /api/device/switch route, which sets the cookie properly.
    const skipDeviceRedirect =
      pathname.startsWith("/api/") ||
      request.nextUrl.searchParams.has("noredirect");

    if (resolution.action.kind === "redirect" && !skipDeviceRedirect) {
      const url = request.nextUrl.clone();
      url.hostname = resolution.action.targetHost;
      url.port = "";
      return NextResponse.redirect(url, 307);
    }

    // Forward the resolved class to server components (shell selection,
    // canonical links) without any client-side flash.
    requestHeaders.set("x-device-class", deviceClass);

    // Subdomain rewrite — keep visitor on subdomain but serve target page
    const subdomain = hostname.split(".")[0];
    const SUBDOMAIN_ROUTES: Record<string, string> = {
      gacha: "/gacha",
      support: "/profile/support",
      blog: "/blogs",
    };
    if (subdomain in SUBDOMAIN_ROUTES && pathname === "/") {
      request.nextUrl.pathname = SUBDOMAIN_ROUTES[subdomain];
      return NextResponse.rewrite(request.nextUrl, {
        request: { headers: requestHeaders },
      });
    }

    // Routing-only hint (see lib/auth/session-cookie.ts): every API route and
    // server component still verifies the JWT via supabase.auth.getUser().
    const isLoggedIn = hasUsableSessionCookie(request.cookies.getAll());

    // NOTE: there is no auth rate limiting here. Credential endpoints are
    // rate-limited where they actually live — /api/auth/signin and
    // /api/auth/signup call getAuthLimiter() themselves (30 req/min per IP, see
    // lib/redis/ratelimit.ts), and those routes are additionally covered by the
    // generic /api/* limiter below. An earlier branch here matched
    // '/signin' and '/signup', which are not routes in this app (the pages are
    // /login and /register), so it never fired.

    // Rate limit all /api/* routes — 60 req/min per IP (see lib/redis/ratelimit.ts)
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
          await fireRateLimitAlert(getRateLimitKey(request), pathname, isLoggedIn);
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

  return NextResponse.next({ request: { headers: requestHeaders } });
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
