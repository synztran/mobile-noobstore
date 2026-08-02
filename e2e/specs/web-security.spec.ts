import { test, expect } from "@playwright/test";

/**
 * Security guards on the web storefront API (apps/web, port :3000).
 *
 * These cover the Phase 2/3 hardening:
 *   - checkout/submit now requires an authenticated user (401).
 *   - /api/auth/signin no longer echoes the full session (no token leak).
 *   - cron/job routes are FAIL-CLOSED (never 200 without a valid secret).
 *
 * They exercise the HTTP layer directly (via Playwright's request fixture),
 * so they do NOT need a browser UI. A running dev server is required.
 */
test.describe("Web API security guards", () => {
  test("checkout submit requires authentication (401)", async ({ request }) => {
    const res = await request.post("/api/checkout/submit", {
      data: {
        cart_id: "00000000-0000-4000-8000-000000000000",
        items: [],
        shipping_cost: 0,
      },
    });
    expect(res.status()).toBe(401);
  });

  test("sign-in rejects missing credentials (400)", async ({ request }) => {
    const res = await request.post("/api/auth/signin", { data: {} });
    expect(res.status()).toBe(400);
  });

  test("sign-in success does NOT echo a session", async ({ request }) => {
    const email = process.env.E2E_TEST_EMAIL ?? "e2e-test@noobstore.xyz";
    const password = process.env.E2E_TEST_PASSWORD ?? "Test@123456";

    const res = await request.post("/api/auth/signin", {
      data: { email, password },
    });

    // Security property: on SUCCESS the response must not serialize the
    // session (access/refresh token) back to the client.
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).not.toHaveProperty("session");
      expect((body as Record<string, unknown>).session).toBeUndefined();
    }
  });

  test("cron job endpoint is fail-closed with a bad secret", async ({
    request,
  }) => {
    const res = await request.post("/api/jobs/cancel-expired-orders", {
      headers: { Authorization: "Bearer definitely-wrong" },
      data: {},
    });
    // 401 (configured + mismatch) or 503 (CRON_SECRET unset) — never 200.
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("compute-ranks cron is fail-closed without a secret", async ({
    request,
  }) => {
    const res = await request.post("/api/cron/compute-ranks", { data: {} });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});