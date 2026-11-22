import { safeRedirect } from "@/modules/user/redirect";
import {
  DEVICE_OVERRIDE_COOKIE,
  resolveDeviceRouting,
} from "@/modules/desktop/device";
import { NextRequest, NextResponse } from "next/server";
import { getApiLimiter, getRateLimitKey } from "@/lib/redis/ratelimit";
import {
  fireRateLimitAlert,
  isCspReportPath,
} from "@/lib/redis/rate-limit-alert";
import {
  hasLiveSessionCookie,
  hasUsableSessionCookie,
} from "@/lib/auth/session-cookie";
import { expireDuplicateAuthCookies } from "@/lib/auth/legacy-auth-cookie";

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
    pathname.startsWith(prefix)
  );
}

/**
 * Cap the time the rate limiter may take. The limiter is advisory (its whole
 * purpose is to shed load, not gate correctness), so a slow or stalled Upstash
 * must never be able to hold a request hostage — notably the `/api/cart` GET
 * that every page load depends on to draw the cart icon. On timeout the
 * request proceeds unlocked rather than dying or hanging.
 */
function withRateLimitTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`rate limiter timed out after ${ms}ms`)),
      ms
    )
  );
  return Promise.race([promise, timeout]);
}

/**
 * Requests that gate page-first-paint and must never wait on Upstash: the
 * cart is the first thing the cart icon (and the splash loader) renders.
 * It is a per-visitor read with no abuse value worth a rate-limit round-trip.
 */
function isUiCriticalRead(method: string, pathname: string): boolean {
  if (method !== "GET") return false;
  return pathname.startsWith("/api/cart");
}

export async function middleware(request: NextRequest) {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const csp = `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https:; style-src 'self' 'nonce-${nonce}' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https: wss:; frame-src 'self' https://www.google.com https://*.hcaptcha.com; report-uri /api/security/csp-report`;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy-Report-Only", csp);
  const requestWithNonce = new NextRequest(request, { headers: requestHeaders });
  const response = await handleRequest(requestWithNonce);
  expireDuplicateAuthCookies(response, request);
  if (
    !request.nextUrl.pathname.startsWith("/api/") &&
    response.status >= 200 &&
    response.status < 300
  ) {
    response.headers.set("Content-Security-Policy-Report-Only", csp);
  }
  return response;
}

async function handleRequest(request: NextRequest) {
  // Forwarded to server components; the device gate sets x-device-class in
  // the try block below (unmanaged-host/error paths keep the original headers).
  const requestHeaders = new Headers(request.headers);
  const csp = request.headers.get("Content-Security-Policy");

  try {
    const { pathname, hostname } = request.nextUrl;
    requestHeaders.set("x-nonce", request.headers.get("x-nonce") ?? "");
    requestHeaders.set(
      "Content-Security-Policy-Report-Only",
      request.headers.get("Content-Security-Policy-Report-Only") ?? "",
    );

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
      const url = new URL(request.url);
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
      const response = NextResponse.rewrite(request.nextUrl, {
        request: { headers: requestHeaders },
      });
      if (csp) response.headers.set("Content-Security-Policy-Report-Only", csp);
      return response;
    }

    // Routing-only hint (see lib/auth/session-cookie.ts): every API route and
    // server component still verifies the JWT via supabase.auth.getUser().
    const isLoggedIn = hasUsableSessionCookie(request.cookies.getAll());
    // Strict variant for the auth-page bounce only: a stale cookie (expired
    // access token, refresh token gone) must not bounce /login or /register
    // to `next`/home or into a /login ↔ next loop. Auth pages fail open —
    // serving the form is always recoverable.
    const hasLiveSession = hasLiveSessionCookie(request.cookies.getAll());

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
      // Browser telemetry has its own bounded limiter; never spend user quota.
      !isCspReportPath(pathname) &&
      !isPublicCachedRead(request.method, pathname) &&
      !isUiCriticalRead(request.method, pathname) &&
      !pathname.startsWith("/api/health") &&
      !pathname.startsWith("/api/analytics/") &&
      !pathname.startsWith("/api/cron/") &&
      !pathname.startsWith("/api/jobs/")
    ) {
      try {
        const { success, reset } = await withRateLimitTimeout(
          getApiLimiter().limit(getRateLimitKey(request)),
          2000
        );
        if (!success) {
          await fireRateLimitAlert(
            getRateLimitKey(request),
            pathname,
            isLoggedIn
          );
          return NextResponse.json(
            { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
            {
              status: 429,
              headers: {
                "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
              },
            }
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
    if ((pathname === "/login" || pathname === "/register") && hasLiveSession) {
      const nextParam = safeRedirect(
        request.nextUrl.searchParams.get("next"),
        request.url
      );
      return NextResponse.redirect(new URL(safeRedirect(nextParam, request.url), request.url));
    }
  } catch (err) {
    console.error("[middleware] unexpected error:", err);
  }

  requestHeaders.set("x-nonce", request.headers.get("x-nonce") ?? "");
  requestHeaders.set("Content-Security-Policy-Report-Only", csp ?? "");
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
