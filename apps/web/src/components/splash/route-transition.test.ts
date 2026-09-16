import { describe, expect, it } from "vitest";

import { classifyRouteTransition, firstSegment } from "./route-transition";

describe("firstSegment", () => {
  it("returns the first segment of a nested path", () => {
    expect(firstSegment("/shop")).toBe("shop");
    expect(firstSegment("/shop/keychron-q1")).toBe("shop");
    expect(firstSegment("/profile/orders")).toBe("profile");
  });

  it("returns an empty string for the root path", () => {
    expect(firstSegment("/")).toBe("");
  });

  it("ignores trailing slashes", () => {
    expect(firstSegment("/shop/")).toBe("shop");
    expect(firstSegment("/shop///")).toBe("shop");
  });

  it("ignores the query string and hash", () => {
    expect(firstSegment("/shop?page=2")).toBe("shop");
    expect(firstSegment("/shop/keychron-q1#specs")).toBe("shop");
  });

  it("is case-sensitive, matching Next.js route semantics", () => {
    expect(firstSegment("/Shop")).toBe("Shop");
    expect(firstSegment("/shop")).not.toBe(firstSegment("/Shop"));
  });

  it("keeps hyphenated segments intact", () => {
    expect(firstSegment("/gacha-mega")).toBe("gacha-mega");
  });
});

describe("classifyRouteTransition", () => {
  it("classifies a cold load as initial", () => {
    expect(classifyRouteTransition(null, "/")).toBe("initial");
    expect(classifyRouteTransition(null, "/shop/keychron-q1")).toBe("initial");
  });

  it("classifies an unchanged path as same", () => {
    expect(classifyRouteTransition("/shop", "/shop")).toBe("same");
    expect(classifyRouteTransition("/shop/", "/shop")).toBe("same");
    expect(classifyRouteTransition("/", "/")).toBe("same");
  });

  it("classifies /x -> /x/{id} as nested", () => {
    expect(classifyRouteTransition("/shop", "/shop/keychron-q1")).toBe("nested");
    expect(classifyRouteTransition("/profile", "/profile/orders")).toBe("nested");
    expect(classifyRouteTransition("/x", "/x/y/z")).toBe("nested");
  });

  it("classifies a sibling swap inside a section as nested", () => {
    expect(classifyRouteTransition("/shop/a", "/shop/b")).toBe("nested");
    expect(classifyRouteTransition("/shop/a", "/shop/a/reviews")).toBe("nested");
  });

  it("classifies different sections as isolated", () => {
    expect(classifyRouteTransition("/shop", "/cart")).toBe("isolated");
    expect(classifyRouteTransition("/profile", "/gacha")).toBe("isolated");
    expect(classifyRouteTransition("/shop/a", "/cart")).toBe("isolated");
  });

  it("classifies root -> section as isolated, since the whole page swaps", () => {
    expect(classifyRouteTransition("/", "/shop")).toBe("isolated");
    expect(classifyRouteTransition("/shop", "/")).toBe("isolated");
  });

  it("treats /gacha and /gacha-mega as different sections", () => {
    expect(classifyRouteTransition("/gacha", "/gacha-mega")).toBe("isolated");
  });

  it("ignores trailing slashes and query/hash when comparing", () => {
    expect(classifyRouteTransition("/shop/", "/shop/keychron-q1")).toBe(
      "nested"
    );
    expect(classifyRouteTransition("/shop?page=2", "/shop")).toBe("same");
    expect(classifyRouteTransition("/shop#top", "/cart")).toBe("isolated");
  });

  it("treats a case difference as a page swap, not a nested mount", () => {
    expect(classifyRouteTransition("/shop", "/Shop")).toBe("isolated");
  });
});
