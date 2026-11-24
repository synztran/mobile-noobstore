import { describe, expect, it } from "vitest";
import { parseAuctionProductDetails } from "./auction-product-details";

describe("parseAuctionProductDetails", () => {
  it("normalizes valid content", () => {
    expect(parseAuctionProductDetails({
      specs: [{ label: " Layout ", value: "65%" }],
      condition: { grade: "A", summary: ["Clean"], attributes: [] },
      accessories: ["Cable"],
    })).toEqual({
      specs: [{ label: "Layout", value: "65%" }],
      condition: { grade: "A", summary: ["Clean"], attributes: [], images: [], image_captions: [] },
      accessories: ["Cable"],
    });
  });

  it("rejects malformed, blank and oversized values", () => {
    expect(parseAuctionProductDetails(null)).toBeNull();
    expect(parseAuctionProductDetails({ specs: [], condition: { grade: "", summary: [], attributes: [] }, accessories: [] })).toBeNull();
    expect(parseAuctionProductDetails({ specs: Array(21).fill({ label: "x", value: "y" }), condition: { grade: "A", summary: [], attributes: [] }, accessories: [] })).toBeNull();
  });

  it("accepts predefined grades and HTTP(S) inspection images", () => {
    for (const grade of ["S", "A", "B", "C", "D"]) {
      expect(parseAuctionProductDetails({ specs: [], condition: { grade, summary: [], attributes: [], images: ["https://example.com/a.jpg", "http://example.com/b.jpg"] }, accessories: [] })?.condition.grade).toBe(grade);
    }
  });

  it("normalizes legacy and parallel inspection captions", () => {
    const legacy = parseAuctionProductDetails({ specs: [], condition: { grade: "A", summary: [], attributes: [], images: ["https://example.com/a.jpg"] }, accessories: [] });
    expect(legacy?.condition.image_captions).toEqual([""]);
    const captioned = parseAuctionProductDetails({ specs: [], condition: { grade: "A", summary: [], attributes: [], images: ["https://example.com/a.jpg", "https://example.com/b.jpg"], image_captions: ["  Case  "] }, accessories: [] });
    expect(captioned?.condition.image_captions).toEqual(["Case", ""]);
    expect(parseAuctionProductDetails({ specs: [], condition: { grade: "A", summary: [], attributes: [], images: ["https://example.com/a.jpg"], image_captions: ["x".repeat(501)] }, accessories: [] })).toBeNull();
    expect(parseAuctionProductDetails({ specs: [], condition: { grade: "A", summary: [], attributes: [], images: [], image_captions: ["extra"] }, accessories: [] })).toBeNull();
  });

  it("rejects unknown grades and non-HTTP inspection images", () => {
    expect(parseAuctionProductDetails({ specs: [], condition: { grade: "F", summary: [], attributes: [] }, accessories: [] })).toBeNull();
    expect(parseAuctionProductDetails({ specs: [], condition: { grade: "A", summary: [], attributes: [], images: ["javascript:alert(1)"] }, accessories: [] })).toBeNull();
  });
});
