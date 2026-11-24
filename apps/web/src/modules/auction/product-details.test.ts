import { describe, expect, it } from "vitest";
import { parseAuctionProductDetails } from "./product-details";

describe("parseAuctionProductDetails", () => {
  const base = { specs: [], condition: { grade: "A", summary: [], attributes: [] }, accessories: [] };

  it("normalizes legacy condition metadata to no inspection images", () => {
    expect(parseAuctionProductDetails(base)?.condition.images).toEqual([]);
    expect(parseAuctionProductDetails({ ...base, condition: { ...base.condition, images: ["https://example.com/a.jpg"] } })?.condition.image_captions).toEqual([""]);
  });

  it("trims and index-aligns optional captions, rejecting invalid captions", () => {
    const result = parseAuctionProductDetails({ ...base, condition: { ...base.condition, images: ["https://example.com/a.jpg", "https://example.com/b.jpg"], image_captions: [" Case "] } });
    expect(result?.condition.image_captions).toEqual(["Case", ""]);
    expect(parseAuctionProductDetails({ ...base, condition: { ...base.condition, images: ["https://example.com/a.jpg"], image_captions: ["x".repeat(501)] } })).toBeNull();
    expect(parseAuctionProductDetails({ ...base, condition: { ...base.condition, image_captions: ["orphan"] } })).toBeNull();
  });

  it("accepts S-D grades and HTTP(S) images", () => {
    for (const grade of ["S", "A", "B", "C", "D"]) {
      expect(parseAuctionProductDetails({ ...base, condition: { ...base.condition, grade, images: ["https://example.com/a.jpg", "http://example.com/b.jpg"] } })?.condition.grade).toBe(grade);
    }
  });

  it("rejects unknown grades and invalid or oversized image lists", () => {
    expect(parseAuctionProductDetails({ ...base, condition: { ...base.condition, grade: "F" } })).toBeNull();
    expect(parseAuctionProductDetails({ ...base, condition: { ...base.condition, images: ["ftp://example.com/a.jpg"] } })).toBeNull();
    expect(parseAuctionProductDetails({ ...base, condition: { ...base.condition, images: Array(21).fill("https://example.com/a.jpg") } })).toBeNull();
  });
});
