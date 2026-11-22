import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildProductListCacheKey,
  invalidateCacheByPattern,
  invalidateCacheByPatternStrict,
  invalidateProductCaches,
  logRedisDegradation,
  PRODUCT_DETAIL_CACHE_TTL,
  PRODUCT_LIST_CACHE_TTL,
  setCacheStrict,
} from "./cache";

// The cache module calls getRedis() lazily inside each helper. Provide a fake
// Upstash-like Redis so we can assert the exact invalidation patterns/dels
// that ship to the shared Redis — without any real network.
const del = vi.fn(async () => 0);
const keys = vi.fn(async (pattern: string) => ["k:" + pattern]);
const set = vi.fn(async () => "OK");

vi.mock("./client", () => ({
  getRedis: () => ({ del, keys, get: vi.fn(), set }),
}));

describe("setCacheStrict", () => {
  it("writes with a TTL and propagates Redis failures", async () => {
    await setCacheStrict("fees", { enabled: true }, 3600);
    expect(set).toHaveBeenCalledWith("fees", { enabled: true }, { ex: 3600 });

    set.mockRejectedValueOnce(new Error("redis unavailable"));
    await expect(setCacheStrict("fees", {}, 3600)).rejects.toThrow("redis unavailable");
  });
});

// invalidateProductCaches() also revalidateTag("products") to purge Next's
// Data Cache / ISR entries — that needs a static generation store, which only
// exists inside a real request. Assert the tag call through this mock instead.
const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({
  revalidateTag: (tag: string) => revalidateTag(tag),
}));

describe("invalidateCacheByPattern", () => {
  beforeEach(() => {
    del.mockClear();
    keys.mockClear();
  });

  it("scans matching keys and deletes them", async () => {
    await invalidateCacheByPattern("products:*");
    expect(keys).toHaveBeenCalledWith("products:*");
    expect(del).toHaveBeenCalledWith("k:products:*");
  });

  it("does not call del when no keys match", async () => {
    keys.mockResolvedValueOnce([]);
    await invalidateCacheByPattern("nope:*");
    expect(del).not.toHaveBeenCalled();
  });
});

describe("invalidateCacheByPatternStrict", () => {
  it("propagates Redis scan failures", async () => {
    keys.mockRejectedValueOnce(new Error("redis unavailable"));
    await expect(
      invalidateCacheByPatternStrict("v2:noteworthy:*"),
    ).rejects.toThrow("redis unavailable");
  });
});

describe("invalidateProductCaches", () => {
  beforeEach(() => {
    del.mockClear();
    keys.mockClear();
    revalidateTag.mockClear();
  });

  it("invalidates the exact shared keys", async () => {
    await invalidateProductCaches();
    // Exact keys (DEL): brands, categories.
    expect(del).toHaveBeenCalledWith("brands", "categories");
    // …and purges the Next.js tagged cache in the same call.
    expect(revalidateTag).toHaveBeenCalledWith("products");
  });

  it("scans product-seo-data as a PATTERN, not an exact key", async () => {
    // Regression guard. The key now carries a ":<limit>" suffix because the
    // cron asks for 24 items and /shop asks for 48. When it was still an exact
    // DEL on "v2:product-seo-data" the invalidation silently stopped matching
    // and the SEO data would have stayed stale indefinitely.
    await invalidateProductCaches();

    const scanned = keys.mock.calls.map(([p]) => p);
    expect(scanned).toContain("v2:product-seo-data:*");
    // It must NOT be deleted by literal name any more — that path cannot match.
    expect(del).not.toHaveBeenCalledWith(
      "brands",
      "categories",
      expect.anything()
    );
    const delArgs = del.mock.calls.flat();
    expect(delArgs).not.toContain("v2:product-seo-data");
  });

  it("scans the expected v2-prefixed patterns (no stale v1 prefixes)", async () => {
    await invalidateProductCaches();

    const scanned = keys.mock.calls.map(([p]) => p);
    for (const expected of [
      "v2:product-seo-data:*",
      "products:*",
      "v2:product:slug:*",
      "v2:product-detail:*",
      "v2:related-products:*",
      "v2:fbt:*",
      "v2:purchase-count:*",
      "v2:noteworthy:*",
      "v2:sale-products:*",
      "v2:newest-products:*",
      "v2:search:suggestions:*",
      "v2:component-rules:*",
      "quick-pick:*",
      "v2:quick-pick:*",
    ]) {
      expect(scanned, `pattern ${expected} should be scanned`).toContain(
        expected
      );
    }

    // Regression guard: never reintroduce the broken v1 product keys.
    expect(scanned.some((p) => p.startsWith("v1:product"))).toBe(false);
    expect(scanned.some((p) => p.startsWith("v1:newest"))).toBe(false);
    expect(scanned.some((p) => p.startsWith("v1:sale"))).toBe(false);
    expect(scanned).not.toContain("v1:product-seo-data");
  });

  it("writes to every scanned key's matching prefix via del", async () => {
    await invalidateProductCaches();
    // Each fake scan returns ["k:<pattern>"], so every pattern is also deleted.
    const delKeys = del.mock.calls.flat();
    for (const scanned of keys.mock.calls.map(([p]) => "k:" + p)) {
      expect(delKeys).toContain(scanned);
    }
  });
});

// ─── buildProductListCacheKey ────────────────────────────────────────────────

describe("buildProductListCacheKey", () => {
  const base = {
    search: "",
    categorySlug: "",
    brand: "",
    priceMin: 0,
    priceMax: 0,
    sort: "newest",
    limit: 12,
    offset: 0,
  };

  it("distinguishes soldOutLast from the plain ordering", () => {
    // Same rows, different ORDER. Without this segment a flag-on /shop entry
    // would collide with a flag-off /api/products/sale entry for identical
    // filters and serve the wrong ordering.
    const off = buildProductListCacheKey({ ...base });
    const on = buildProductListCacheKey({ ...base, soldOutLast: true });
    expect(on).not.toBe(off);
  });

  it("treats an omitted flag as false", () => {
    expect(buildProductListCacheKey({ ...base })).toBe(
      buildProductListCacheKey({ ...base, soldOutLast: false }),
    );
  });

  it("keeps distinct offsets and limits distinct", () => {
    expect(buildProductListCacheKey({ ...base, offset: 12 })).not.toBe(
      buildProductListCacheKey({ ...base, offset: 0 }),
    );
    expect(buildProductListCacheKey({ ...base, limit: 24 })).not.toBe(
      buildProductListCacheKey({ ...base, limit: 12 }),
    );
  });

  it("keeps distinct filters distinct", () => {
    expect(buildProductListCacheKey({ ...base, search: "gmk" })).not.toBe(
      buildProductListCacheKey({ ...base }),
    );
    expect(buildProductListCacheKey({ ...base, slim: true })).not.toBe(
      buildProductListCacheKey({ ...base }),
    );
  });
});

// ── Warm-cache / reader key parity ───────────────────────────────────────────

describe("warm-cache cron warms the key the storefront reads", () => {
  // Regression guard. The cron writes this exact key, and /shop +
  // /api/products read it. When the `soldOutLast` segment was added to the key
  // and only the readers were updated, the cron began writing "…:nosol" — the
  // most expensive warm in the job, discarded on every run, while the key that
  // was actually read expired into a cold cascade every 300s.
  const CRON_PARAMS = {
    limit: 12,
    sort: "newest",
    slim: true,
    soldOutLast: true,
  } as const;

  it("matches the key the /shop reader builds", () => {
    // apps/web/src/app/(main)/shop/page.tsx:
    //   getProducts({ limit: 12, sort: "newest", slim: true, soldOutLast: true })
    const cronKey = buildProductListCacheKey(CRON_PARAMS);
    const shopKey = buildProductListCacheKey({
      limit: 12,
      sort: "newest",
      slim: true,
      soldOutLast: true,
    });
    expect(cronKey).toBe(shopKey);
    expect(cronKey.endsWith(":sol")).toBe(true);
  });

  it("does NOT warm a key that no reader can ever hit", () => {
    // The exact regression: omitting the flag yields ":nosol", and every
    // storefront reader now asks for ":sol".
    expect(buildProductListCacheKey(CRON_PARAMS)).not.toBe(
      buildProductListCacheKey({ limit: 12, sort: "newest", slim: true }),
    );
  });

  it("uses the same TTL the readers write", () => {
    // A warm TTL longer than PRODUCT_LIST_CACHE_TTL only delays the next miss.
    expect(PRODUCT_LIST_CACHE_TTL).toBe(300);
    expect(PRODUCT_LIST_CACHE_TTL).toBe(PRODUCT_DETAIL_CACHE_TTL);
  });
});

// ── Degradation logging ─────────────────────────────────────────────────────

describe("logRedisDegradation", () => {
  it("reports a key once per window, then goes quiet", () => {
    // An outage emits one line per request otherwise — the very traffic that
    // is burning the CPU budget.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    logRedisDegradation("getCache", "unit-test:dedupe", new Error("down"));
    logRedisDegradation("getCache", "unit-test:dedupe", new Error("down"));
    logRedisDegradation("getCache", "unit-test:dedupe", new Error("down"));

    const forThisKey = warn.mock.calls.filter((c) =>
      String(c[0]).includes("unit-test:dedupe"),
    );
    expect(forThisKey).toHaveLength(1);

    warn.mockRestore();
  });

  it("does not swallow a different key's first failure", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    logRedisDegradation("getCache", "unit-test:key-a", new Error("down"));
    logRedisDegradation("getCache", "unit-test:key-b", new Error("down"));

    const calls = warn.mock.calls.map((c) => String(c[0]));
    expect(calls.some((m) => m.includes("unit-test:key-a"))).toBe(true);
    expect(calls.some((m) => m.includes("unit-test:key-b"))).toBe(true);

    warn.mockRestore();
  });
});
