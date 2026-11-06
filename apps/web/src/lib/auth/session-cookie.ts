/**
 * Edge-safe reader for the Supabase auth cookie.
 *
 * Middleware runs on the Edge runtime and must not pull in the Supabase SDK
 * (~87 kB) just to decide whether a request should be routed to /login. It also
 * cannot refresh an expired token — that happens in API routes and server
 * components via `supabase.auth.getUser()`, which is the only real
 * authorization check in the system.
 *
 * So this module answers exactly one question: *does this request carry a
 * structurally valid Supabase session cookie?* It is a routing hint, never an
 * authorization decision.
 *
 * ## Why this is more than a `JSON.parse`
 *
 * `@supabase/ssr` (0.5+, default `cookieEncoding: "base64url"`) stores the
 * session under `sb-<ref>-auth-token` as `base64-<base64url(JSON)>`, and splits
 * any value over 3180 bytes into `sb-<ref>-auth-token.0`, `.1`, … where *no
 * single chunk is parseable on its own*.
 *
 * The previous implementation here looked only at `-auth-token` /
 * `-auth-token.0` and ran a plain `JSON.parse`, so every real cookie fell
 * through to its `catch` block and the function returned `true` for any request
 * that carried a `sb-*` cookie at all — expired, corrupt or truncated alike.
 * This module fails closed instead. See `session-cookie.test.ts`.
 *
 * The flip side is that a false negative here now costs real money: a visitor
 * who cannot be recognised is bounced out of /checkout. So the shape check is
 * deliberately loose — any payload carrying an `access_token` or
 * `refresh_token` counts — and the tests pin the exact payload auth-js writes.
 */

/** Shape of a cookie as `request.cookies.getAll()` returns it. */
export interface AuthCookie {
  name: string;
  value: string;
}

/** `sb-<project-ref>-auth-token` — the whole (unsplit) value. */
const AUTH_TOKEN_COOKIE = /^sb-.+-auth-token$/;
/** `sb-<project-ref>-auth-token.<n>` — one chunk of a value over 3180 bytes. */
const AUTH_TOKEN_CHUNK = /^sb-(.+)-auth-token\.(\d+)$/;
/** Prefix `@supabase/ssr` writes ahead of every base64url-encoded value. */
const BASE64_PREFIX = "base64-";

/**
 * Decode base64url (RFC 4648 §5) to a UTF-8 string. Uses `atob` +
 * `TextDecoder` rather than `Buffer`, which the Edge runtime does not expose.
 */
export function base64UrlDecode(input: string): string | null {
  try {
    // The encoder emits no `=` padding; add it back for stricter `atob`s.
    const padded =
      input.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (input.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Expiry carried by a raw auth cookie value, or `-Infinity` when it cannot be
 * decoded. Used only to rank duplicate values, never to authorize.
 */
function sessionExpiry(raw: string): number {
  const expiresAt = decodeAuthTokenValue(raw)?.expires_at;
  return typeof expiresAt === "number" ? expiresAt : Number.NEGATIVE_INFINITY;
}

/**
 * Choose one value when the same auth cookie name appears more than once.
 *
 * A host-only `www.noobstore.xyz` cookie and a domain-scoped `.noobstore.xyz`
 * cookie are both sent under the same name, so a prefix lookup would otherwise
 * hand back two sessions with no way to tell which is current. The latest
 * `expires_at` wins; on a tie the later occurrence wins, which matches browser
 * ordering (cookies of equal path length are sent oldest first).
 */
function newestAuthToken(values: readonly string[]): string | null {
  let newest: string | null = null;
  let newestExpiry = Number.NEGATIVE_INFINITY;

  for (const value of values) {
    const expiry = sessionExpiry(value);
    if (newest === null || expiry >= newestExpiry) {
      newest = value;
      newestExpiry = expiry;
    }
  }

  return newest;
}

/**
 * Reassemble the raw session cookie value.
 *
 * Mirrors `combineChunks` in `@supabase/ssr`: the unsuffixed cookie wins when
 * present, otherwise `.0`, `.1`, … are concatenated in index order, stopping at
 * the first missing index — a gap means a partial write, not a longer value.
 *
 * Duplicate names (same name, different cookie scope) are resolved to the
 * newest session instead of whichever copy happened to come first.
 */
export function resolveAuthTokenValue(
  cookies: readonly AuthCookie[]
): string | null {
  const whole = cookies
    .filter(({ name, value }) => AUTH_TOKEN_COOKIE.test(name) && Boolean(value))
    .map(({ value }) => value);
  if (whole.length > 0) return newestAuthToken(whole);

  // Group by storage-key base. Cookies for two different project refs can
  // coexist after a config change, and splicing their chunks would fabricate a
  // value that was never a session.
  const groups = new Map<string, Map<number, string[]>>();

  for (const { name, value } of cookies) {
    const match = name.match(AUTH_TOKEN_CHUNK);
    if (!match || !value) continue;

    const base = `sb-${match[1]}-auth-token`;
    let chunks = groups.get(base);
    if (!chunks) {
      chunks = new Map<number, string[]>();
      groups.set(base, chunks);
    }

    const index = Number(match[2]);
    const values = chunks.get(index);
    if (values) values.push(value);
    else chunks.set(index, [value]);
  }

  const candidates: string[] = [];

  for (const chunks of groups.values()) {
    let chunkCount = 0;
    // Half-written sessions are normal; stop at the first gap rather than
    // skipping over it.
    while (chunks.has(chunkCount)) chunkCount += 1;
    if (chunkCount === 0) continue;

    // A duplicated chunk index means two complete sets were written (host-only
    // and domain-scoped). Pair occurrences by position so each candidate comes
    // from one set, never a splice of both.
    const sets = Math.min(
      ...Array.from(
        { length: chunkCount },
        (_, index) => chunks.get(index)?.length ?? 0
      )
    );

    for (let set = 0; set < sets; set += 1) {
      let joined = "";
      for (let index = 0; index < chunkCount; index += 1) {
        joined += (chunks.get(index) as string[])[set];
      }
      candidates.push(joined);
    }
  }

  if (candidates.length === 0) return null;

  const decodable = candidates.filter((value) => decodeAuthTokenValue(value));
  // A stale set from a previous ref decodes to nothing; prefer a candidate
  // that reassembles into an actual JSON payload.
  return decodable.length > 0 ? newestAuthToken(decodable) : candidates[0];
}

/**
 * Decode a raw cookie value into the session object it carries. Accepts both
 * encodings so switching `cookieEncoding` cannot silently drop the routing
 * hint. Returns `null` for anything that is not a JSON object.
 */
export function decodeAuthTokenValue(
  raw: string
): Record<string, unknown> | null {
  const payload = raw.startsWith(BASE64_PREFIX)
    ? base64UrlDecode(raw.slice(BASE64_PREFIX.length))
    : raw;

  if (!payload) return null;

  try {
    const parsed: unknown = JSON.parse(payload);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * Whether the request carries a Supabase session cookie that is usable.
 *
 * Fails **closed**: a cookie that cannot be decoded counts as no session, so a
 * corrupt or half-written cookie routes the visitor to /login (recoverable)
 * instead of past the routing gates (not recoverable).
 *
 * A session carrying a `refresh_token` counts as usable even when its access
 * token has expired: Supabase rotates it on the next request, and a past
 * `expires_at` is the *normal* state for any session idle longer than the
 * access-token TTL (~1 h). Only a session with no refresh token has to present
 * a live access token.
 *
 * Note the real payload: because `createServerClient` installs a `userStorage`
 * memory adapter, auth-js deletes `user` before writing the session, so the
 * cookie holds `{access_token, token_type, expires_in, expires_at,
 * refresh_token}` and nothing else. This function must not require `user`.
 */
export function hasUsableSessionCookie(
  cookies: readonly AuthCookie[],
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  const raw = resolveAuthTokenValue(cookies);
  if (!raw) return false;

  const session = decodeAuthTokenValue(raw);
  if (!session) return false;

  const refreshToken = session.refresh_token;
  const accessToken = session.access_token;

  // The whole point of the cookie is to carry a token; if neither is a string
  // this is not a session, whatever else it decodes to. Fail closed, and say so
  // loudly so an upstream format change surfaces in logs rather than as a
  // silent lockout from /checkout.
  if (!isNonEmptyString(refreshToken) && !isNonEmptyString(accessToken)) {
    console.warn(
      "[session-cookie] unrecognised Supabase auth cookie payload — treating request as signed out"
    );
    return false;
  }

  if (isNonEmptyString(refreshToken)) return true;

  // No refresh token, so the access token itself has to still be live. An
  // unparseable/missing expiry is treated as live: refusing here would lock a
  // signed-in visitor out of /checkout, which costs far more than letting a
  // forged cookie render a page whose own API calls 401 regardless.
  const expiresAt = session.expires_at;
  return typeof expiresAt !== "number" || expiresAt > nowSeconds;
}

/**
 * Whether the request carries a session cookie that is *currently valid* —
 * a present, unexpired access token.
 *
 * Strict counterpart to `hasUsableSessionCookie` for the auth-page bounce in
 * middleware. A `refresh_token`-bearing cookie that has already expired means
 * the middleware cannot trust it as a live session; treating it as signed in
 * bounced `/login` and `/register` requests to `safeRedirect(next)` (usually
 * the home page) or spun an infinite `/login?next=X` ↔ `X` loop with the
 * client-side `withAuthRedirect` guard. Auth pages must fail **open** in the
 * opposite direction: an expired or unmappable cookie renders the login form,
 * and real sessions are verified on the client/API anyway.
 *
 * Requires `expires_at` to be present (a live `expires_in`-only payload
 * written by a browser client always carries it; on the server the session is
 * unverified until the refresh returns anyway).
 */
export function hasLiveSessionCookie(
  cookies: readonly AuthCookie[],
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  const raw = resolveAuthTokenValue(cookies);
  if (!raw) return false;

  const session = decodeAuthTokenValue(raw);
  if (!session) return false;

  if (!isNonEmptyString(session.access_token)) return false;

  // Fail closed: a missing or unparseable expiry means "not provably live",
  // so the auth page is served rather than bouncing a stale cookie.
  const expiresAt = session.expires_at;
  return typeof expiresAt === "number" && expiresAt > nowSeconds;
}
