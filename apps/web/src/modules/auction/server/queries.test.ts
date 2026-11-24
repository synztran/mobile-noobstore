import { describe, expect, it } from "vitest";
import { calculateMinNextBid, maskBidderName } from "./queries";

describe("Auction Server Helpers", () => {
  describe("maskBidderName", () => {
    it("handles null or undefined", () => {
      expect(maskBidderName(null)).toBe("Người ẩn danh");
      expect(maskBidderName("")).toBe("Người ẩn danh");
    });

    it("masks email address", () => {
      expect(maskBidderName("hari@example.com")).toBe("h***i@***");
      expect(maskBidderName("ab@test.com")).toBe("a***@***");
    });

    it("masks full name", () => {
      expect(maskBidderName("Tran Van Hai")).toBe("T*** V*** H***");
      expect(maskBidderName("Noob")).toBe("N***");
    });
  });

  describe("calculateMinNextBid", () => {
    it("returns starting price if no bids placed yet", () => {
      const minBid = calculateMinNextBid(100000, 100000, false, "fixed", 10000);
      expect(minBid).toBe(100000);
    });

    it("adds fixed increment when bids exist", () => {
      const minBid = calculateMinNextBid(150000, 100000, true, "fixed", 20000);
      expect(minBid).toBe(170000);
    });

    it("calculates percentage increment correctly", () => {
      const minBid = calculateMinNextBid(1000000, 100000, true, "percentage", 5);
      // 5% of 1,000,000 is 50,000 => next is 1,050,000
      expect(minBid).toBe(1050000);
    });

    it("enforces minimum percentage floor of 1000 VND", () => {
      const minBid = calculateMinNextBid(10000, 10000, true, "percentage", 1);
      // 1% of 10,000 is 100, clamped to 1,000 => next is 11,000
      expect(minBid).toBe(11000);
    });
  });
});
