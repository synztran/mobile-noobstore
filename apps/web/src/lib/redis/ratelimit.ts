import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./client";

function getIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
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
  alert: {
    limiter: Ratelimit.fixedWindow(100, "1 m"),
    prefix: "ratelimit:alert",
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

export function getAlertLimiter() {
  return getLimiter("alert");
}

export async function tryRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ allowed: boolean; reset: number }> {
  const { success, reset } = await limiter.limit(identifier);
  return { allowed: success, reset };
}
