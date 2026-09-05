import { describe, expect, it } from "vitest";
import { descriptionToExcerpt } from "./queries";

describe("descriptionToExcerpt", () => {
  it("strips HTML tags", () => {
    expect(
      descriptionToExcerpt("<h2><span>Chuột HyperX</span></h2><p>Mô tả</p>"),
    ).toBe("Chuột HyperX Mô tả");
  });

  it("collapses whitespace", () => {
    expect(descriptionToExcerpt("  A\n\n  B\t\tC  ")).toBe("A B C");
  });

  it("returns empty string for empty input", () => {
    expect(descriptionToExcerpt("")).toBe("");
    expect(descriptionToExcerpt("<p>  </p>")).toBe("");
  });

  it("truncates long text with ellipsis", () => {
    const long = "x".repeat(200);
    const excerpt = descriptionToExcerpt(`<p>${long}</p>`);
    expect(excerpt.length).toBeLessThanOrEqual(161);
    expect(excerpt.endsWith("…")).toBe(true);
  });

  it("keeps short text intact without ellipsis", () => {
    expect(descriptionToExcerpt("Short description")).toBe("Short description");
  });

  it("supports a custom max length", () => {
    const excerpt = descriptionToExcerpt("abcdefghij", 5);
    expect(excerpt).toBe("abcde…");
  });
});
