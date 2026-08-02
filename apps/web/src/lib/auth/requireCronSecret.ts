import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

/**
 * Fail-closed guard for cron / scheduled-job routes.
 *
 * These routes mutate data through the service-role client (RLS bypass), so an
 * unauthenticated call is unacceptable. Previously the pattern was
 * `if (CRON_SECRET && header !== ...) return 401` — which silently SKIPPED the
 * check when CRON_SECRET was unset (fail-open). This helper instead returns a
 * 503 when the secret is missing, so a misconfigured env can never expose a
 * destructive endpoint.
 *
 * Returns `null` when authorized, otherwise a `NextResponse` to return.
 */
export function requireCronSecret(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error(
      "[requireCronSecret] CRON_SECRET is not configured — failing closed.",
    );
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 503 },
    );
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const provided = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  if (!provided) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(secret).digest();
  const ok = timingSafeEqual(a, b);

  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
