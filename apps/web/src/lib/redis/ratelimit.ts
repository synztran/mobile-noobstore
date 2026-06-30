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
    limiter: Ratelimit.fixedWindow(10, "1 m"),
    prefix: "ratelimit:auth",
  }),
  apiAuth: new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.fixedWindow(20, "1 m"),
    prefix: "ratelimit:api:auth",
  }),
  checkout: new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.fixedWindow(5, "1 m"),
    prefix: "ratelimit:checkout",
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

export async function tryRateLimit(
  limiter: Ratelimit,
  identifier: string,
): Promise<{ allowed: boolean; reset: number }> {
  const { success, reset } = await limiter.limit(identifier);
  return { allowed: success, reset };
}
