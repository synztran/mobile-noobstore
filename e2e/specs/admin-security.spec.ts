import { test, expect } from "@playwright/test";

/**
 * Admin API authorization tests (apps/admin, port :3001).
 *
 * `apps/admin/src/middleware.ts` is the single authority for admin API
 * authorization: every `/api/*` route (except /api/crawling/webhook, which
 * uses its own HMAC secret) is gated on a valid session + `users.role ===
 * "admin"`. Unauthenticated API calls must receive a JSON 401 — not a
 * redirect, so API clients get a parseable error.
 *
 * Verify with: node scripts/verify-admin-auth.mjs
 * Requires the admin app to be running (yarn dev:admin).
 */
test.describe("Admin API authorization (middleware)", () => {
  test("unauthenticated POST to /api/users is rejected", async ({
    request,
  }) => {
    const res = await request.post("/api/users", { data: {} });
    expect(res.status()).toBe(401);
  });

  test("unauthenticated role-escalation PATCH is rejected", async ({
    request,
  }) => {
    const res = await request.patch("/api/users/some-user-id", {
      data: { role: "admin" },
    });
    expect(res.status()).toBe(401);
  });

  test("unauthenticated upload is rejected", async ({ request }) => {
    const res = await request.post("/api/upload", { data: {} });
    expect(res.status()).toBe(401);
  });

  test("unauthenticated order bulk-status is rejected", async ({ request }) => {
    const res = await request.post("/api/orders/bulk-status", {
      data: { orderIds: [], status: "confirmed" },
    });
    expect(res.status()).toBe(401);
  });
});