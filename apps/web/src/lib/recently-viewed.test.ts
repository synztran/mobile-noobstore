import { describe, expect, it } from "vitest";
import {
  MAX_RECORDED,
  mergeViewed,
  type RecentlyViewedEntry,
} from "@/lib/recently-viewed";

function entry(id: string, viewedAt: number): RecentlyViewedEntry {
  return { id, slug: id, name: `Product ${id}`, thumbnail: null, viewedAt };
}

describe("mergeViewed", () => {
  it("prepends a new entry (most recent first)", () => {
    const result = mergeViewed([entry("a", 1)], entry("b", 2));
    expect(result.map((e) => e.id)).toEqual(["b", "a"]);
  });

  it("moves an existing entry to the front without duplicating", () => {
    const current = [entry("a", 1), entry("b", 2), entry("c", 3)];
    const result = mergeViewed(current, entry("b", 4));
    expect(result.map((e) => e.id)).toEqual(["b", "a", "c"]);
  });

  it("caps the list at MAX_RECORDED, evicting the oldest-position entry", () => {
    const current = Array.from({ length: MAX_RECORDED }, (_, i) =>
      entry(`p${i}`, i)
    );
    const result = mergeViewed(current, entry("new", MAX_RECORDED));
    expect(result).toHaveLength(MAX_RECORDED);
    expect(result[0].id).toBe("new");
    // The previously last-position (oldest) entry is evicted.
    expect(result[result.length - 1].id).toBe(`p${MAX_RECORDED - 2}`);
    expect(result.some((e) => e.id === `p${MAX_RECORDED - 1}`)).toBe(false);
  });

  it("re-viewing at the cap moves to front without evicting anything", () => {
    const current = Array.from({ length: MAX_RECORDED }, (_, i) =>
      entry(`p${i}`, i)
    );
    const result = mergeViewed(current, entry("p5", 999));
    expect(result).toHaveLength(MAX_RECORDED);
    expect(result.map((e) => e.id).indexOf("p5")).toBe(0);
    expect(result.map((e) => e.id).sort()).toEqual(
      current.map((e) => e.id).sort()
    );
  });

  it("preserves newest-first ordering when de-duplicating", () => {
    const current = [entry("a", 1), entry("b", 2), entry("c", 3), entry("d", 4)];
    const result = mergeViewed(current, entry("c", 5));
    expect(result.map((e) => e.id)).toEqual(["c", "a", "b", "d"]);
  });

  it("does not mutate the input array", () => {
    const current = [entry("a", 1)];
    const snapshot = [...current];
    mergeViewed(current, entry("b", 2));
    expect(current).toEqual(snapshot);
  });
});
