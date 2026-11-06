import type { NextRequest, NextResponse } from "next/server";

/**
 * Edge-safe helpers that remove *host-only* Supabase auth cookies when the app
 * stores sessions on the shared `.noobstore.xyz` domain.
 *
 * When both a host-only `www.noobstore.xyz` cookie and a domain-scoped
 * `.noobstore.xyz` cookie exist, the browser sends both under the same name and
 * every prefix lookup has to guess which one is current. Removing the host-only
 * copy leaves exactly one canonical session.
 *
 * These helpers only run when `NEXT_PUBLIC_COOKIE_DOMAIN` is
 * `.noobstore.xyz` **and** the request targets that domain or a subdomain.
 * Localhost, previews and unrelated hosts keep their host-scoped session.
 */

const AUTH_COOKIE_NAME = /^(sb-.+-auth-token)(?:\.(\d+))?$/;

function sharedDomain(request: NextRequest): string | null {
  const configured = process.env.NEXT_PUBLIC_COOKIE_DOMAIN?.replace(
    /^\./,
    ""
  ).toLowerCase();
  const host = request.nextUrl.hostname.toLowerCase();

  if (
    configured !== "noobstore.xyz" ||
    (host !== "noobstore.xyz" && !host.endsWith(".noobstore.xyz"))
  ) {
    return null;
  }

  return configured;
}

function expireOptions(request: NextRequest) {
  return {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax" as const,
  };
}

function authCookieBase(name: string): string | null {
  return name.match(AUTH_COOKIE_NAME)?.[1] ?? null;
}

/**
 * Expire the host-only predecessor of every auth cookie name present in the
 * request, just before a fresh domain-scoped session is written.
 *
 * Used by password sign-in: the request only carries the legacy host-only
 * cookie, so there is no duplicate to detect yet. Names the response already
 * writes (the fresh Supabase session) are skipped.
 */
export function clearLegacyAuthCookie(
  response: NextResponse,
  request: NextRequest
) {
  if (!sharedDomain(request)) return;

  const cookieNames = new Set(
    request.cookies
      .getAll()
      .map(({ name }) => name)
      .filter((name) => authCookieBase(name) !== null)
  );
  const freshCookieNames = new Set(
    response.cookies.getAll().map(({ name }) => name)
  );

  for (const name of cookieNames) {
    if (freshCookieNames.has(name)) continue;
    response.cookies.set(name, "", expireOptions(request));
  }
}

/**
 * Expire host-only auth cookies **only when the raw `Cookie` header proves a
 * duplicate exists** (the same auth cookie name twice).
 *
 * Next.js collapses duplicate names before `request.cookies` is exposed, so the
 * raw header is the only place the ambiguity is still visible. Waiting for
 * proof means a deployment that flips `NEXT_PUBLIC_COOKIE_DOMAIN` on never
 * deletes a lone host-only session and silently logs everyone out; it only
 * removes the stale copy once both scopes are actually present.
 */
export function expireDuplicateAuthCookies(
  response: NextResponse,
  request: NextRequest
) {
  if (!sharedDomain(request)) return;

  const header = request.headers.get("cookie");
  if (!header) return;

  const occurrences = new Map<string, number>();
  const baseByCookie = new Map<string, string>();

  for (const part of header.split(";")) {
    const name = part.split("=", 1)[0]?.trim();
    if (!name) continue;

    const base = authCookieBase(name);
    if (!base) continue;

    occurrences.set(name, (occurrences.get(name) ?? 0) + 1);
    baseByCookie.set(name, base);
  }

  const duplicatedBases = new Set<string>();
  for (const [name, count] of occurrences) {
    if (count > 1) duplicatedBases.add(baseByCookie.get(name) as string);
  }
  if (duplicatedBases.size === 0) return;

  for (const [name, base] of baseByCookie) {
    // Expiring a name without a Domain attribute only matches the host-only
    // copy; the domain-scoped session of the same name is left untouched.
    if (!duplicatedBases.has(base) || response.cookies.has(name)) continue;
    response.cookies.set(name, "", expireOptions(request));
  }
}
