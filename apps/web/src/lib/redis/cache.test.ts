import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  invalidateCacheByPattern,
  invalidateProductCaches,
} from "./cache";

// The cache module calls getRedis() lazily inside each helper. Provide a fake
// Upstash-like Redis so we can assert the exact invalidation patterns/dels
// that ship to the shared Redis — without any real network.
const del = vi.fn(async () => 0);
const keys = vi.fn(async (pattern: string) => ["k:" + pattern]);

vi.mock("./client", () => ({
  getRedis: () => ({ del, keys, get: vi.fn(), set: vi.fn() }),
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

describe("invalidateProductCaches", () => {
  beforeEach(() => {
    del.mockClear();
    keys.mockClear();
  });

  it("invalidates the exact shared keys", async () => {
    await invalidateProductCaches();
    // Exact keys (DEL): brands, categories, product-seo-data (v2!)
    expect(del).toHaveBeenCalledWith(
      "brands",
      "categories",
      "v2:product-seo-data",
    );
  });

  it("scans the expected v2-prefixed patterns (no stale v1 prefixes)", async () => {
    await invalidateProductCaches();

    const scanned = keys.mock.calls.map(([p]) => p);
    for (const expected of [
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
        expected,
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