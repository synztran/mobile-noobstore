import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./client";

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

export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(10, "1 m"),
  prefix: "ratelimit:auth",
});

export const apiAuthLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(20, "1 m"),
  prefix: "ratelimit:api:auth",
});

export const checkoutLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(5, "1 m"),
  prefix: "ratelimit:checkout",
});

export async function tryRateLimit(
  limiter: Ratelimit,
  identifier: string,
): Promise<{ allowed: boolean; reset: number }> {
  const { success, reset } = await limiter.limit(identifier);
  return { allowed: success, reset };
}
