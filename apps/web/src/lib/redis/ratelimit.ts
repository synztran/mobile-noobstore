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

const rateLimiters = {
  auth: new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.fixedWindow(30, "1 m"),
    prefix: "ratelimit:auth",
  }),
  apiAuth: new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.fixedWindow(30, "1 m"),
    prefix: "ratelimit:api:auth",
  }),
  checkout: new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.fixedWindow(40, "1 m"),
    prefix: "ratelimit:checkout",
  }),
  api: new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.fixedWindow(60, "1 m"),
    prefix: "ratelimit:api",
  }),
  alert: new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.fixedWindow(1, "5 m"),
    prefix: "ratelimit:alert",
  }),
};

export function getAuthLimiter() {
  return rateLimiters.auth;
}

export function getApiAuthLimiter() {
  return rateLimiters.apiAuth;
}

export function getCheckoutLimiter() {
  return rateLimiters.checkout;
}

export function getApiLimiter() {
  return rateLimiters.api;
}

export function getAlertLimiter() {
  return rateLimiters.alert;
}

export async function tryRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ allowed: boolean; reset: number }> {
  const { success, reset } = await limiter.limit(identifier);
  return { allowed: success, reset };
}
