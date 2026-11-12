import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./client";

/**
 * Best-effort client IP for rate-limit keys.
 *
 * Header preference matters, and it is not arbitrary:
 *
 * - `x-vercel-forwarded-for` is set by Vercel and is NOT overridable by a
 *   proxy placed in front of the deployment, so it is the most trustworthy
 *   source when present.
 * - `x-forwarded-for` is also written by Vercel (which overwrites any
 *   client-supplied value, specifically to prevent IP spoofing), but Vercel
 *   documents that it CAN be overwritten by an additional proxy sitting in
 *   front of Vercel. Kept as a fallback for non-Vercel/local environments.
 * - `x-real-ip` mirrors `x-forwarded-for`.
 *
 * See https://vercel.com/docs/headers/request-headers
 *
 * Each value is split on "," and reduced to its first non-empty entry, and an
 * empty header must never win: falling through to "" would put every such
 * request in one shared bucket, so one caller could exhaust the limit for
 * everyone.
 */
function getIp(request: Request): string {
  const candidates = [
    request.headers.get("x-vercel-forwarded-for"),
    request.headers.get("x-forwarded-for"),
    request.headers.get("x-real-ip"),
  ];

  for (const header of candidates) {
    if (!header) continue;
    const first = header.split(",")[0]?.trim();
    if (first) return first;
  }

  return "127.0.0.1";
}

export function getRateLimitKey(request: Request, userId?: string): string {
  return userId || getIp(request);
}

const LIMITER_CONFIGS = {
  auth: {
    limiter: Ratelimit.fixedWindow(30, "1 m"),
    prefix: "ratelimit:auth",
  },
  apiAuth: {
    limiter: Ratelimit.fixedWindow(30, "1 m"),
    prefix: "ratelimit:api:auth",
  },
  checkout: {
    limiter: Ratelimit.fixedWindow(40, "1 m"),
    prefix: "ratelimit:checkout",
  },
  api: {
    limiter: Ratelimit.fixedWindow(60, "1 m"),
    prefix: "ratelimit:api",
  },
  checkin: {
    limiter: Ratelimit.fixedWindow(20, "1 m"),
    prefix: "ratelimit:checkin",
  },
  alert: {
    limiter: Ratelimit.fixedWindow(100, "1 m"),
    prefix: "ratelimit:alert",
  },
  alertIp: {
    limiter: Ratelimit.slidingWindow(1, "10 m"),
    prefix: "ratelimit:alert:ip",
  },
} as const;

type LimiterKey = keyof typeof LIMITER_CONFIGS;

// Lazily constructed — instantiating Ratelimit at module scope would call
// getRedis() during `next build`'s page-data collection and crash when the
// Upstash env vars are absent from the build environment.
const instances = new Map<LimiterKey, Ratelimit>();

function getLimiter(key: LimiterKey): Ratelimit {
  let instance = instances.get(key);
  if (!instance) {
    const config = LIMITER_CONFIGS[key];
    instance = new Ratelimit({
      redis: getRedis(),
      limiter: config.limiter,
      prefix: config.prefix,
    });
    instances.set(key, instance);
  }
  return instance;
}

export function getAuthLimiter() {
  return getLimiter("auth");
}

export function getApiAuthLimiter() {
  return getLimiter("apiAuth");
}

export function getCheckoutLimiter() {
  return getLimiter("checkout");
}

export function getApiLimiter() {
  return getLimiter("api");
}

export function getCheckinLimiter() {
  return getLimiter("checkin");
}

export function getAlertLimiter() {
  return getLimiter("alert");
}

export function getAlertIpLimiter() {
  return getLimiter("alertIp");
}

export async function tryRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ allowed: boolean; reset: number }> {
  const { success, reset } = await limiter.limit(identifier);
  return { allowed: success, reset };
}
