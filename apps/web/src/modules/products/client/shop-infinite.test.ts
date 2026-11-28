import { describe, expect, it } from "vitest";
import { buildShopFilters, buildShopUrl, shopFiltersKey } from "./shop-infinite";

describe("shop multi-select filters", () => {
  it("round-trips repeated values and deduplicates them", () => {
    const filters = buildShopFilters(new URLSearchParams("category=keyboards&category=switches&brand=A&brand=B&brand=A"));
    expect(filters.category).toEqual(["keyboards", "switches"]);
    expect(filters.brand).toEqual(["A", "B"]);
    const url = new URL(buildShopUrl(0, filters), "https://example.test");
    expect(url.searchParams.getAll("category")).toEqual(["keyboards", "switches"]);
    expect(url.searchParams.getAll("brand")).toEqual(["A", "B"]);
  });

  it("keeps legacy single-value URLs and normalizes equivalent key order", () => {
    const legacy = buildShopFilters(new URLSearchParams("category=keyboards&brand=A"));
    expect(legacy.category).toEqual(["keyboards"]);
    expect(legacy.brand).toEqual(["A"]);
    expect(shopFiltersKey({ ...legacy, category: ["switches", "keyboards"] })).toBe(
      shopFiltersKey({ ...legacy, category: ["keyboards", "switches"] }),
    );
  });
});
