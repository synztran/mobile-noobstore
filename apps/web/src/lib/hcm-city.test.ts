import { describe, expect, it } from "vitest";

import { HCM_CITY, isHcmCity } from "./hcm-city";

describe("isHcmCity", () => {
  describe("canonical spellings", () => {
    it("matches the exact picker label", () => {
      expect(isHcmCity(HCM_CITY)).toBe(true);
    });

    it("matches the label with no code supplied", () => {
      expect(isHcmCity(HCM_CITY, null)).toBe(true);
    });
  });

  describe("alternative spellings", () => {
    // Each of these is a real shape seen in stored addresses, and every one of
    // them compared false against the old `city === HCM_CITY` check, which hid
    // the in-city carrier tiers and zeroed the district surcharge.
    const variants = [
      "Hồ Chí Minh",
      "Ho Chi Minh",
      "TP. Hồ Chí Minh",
      "TP Hồ Chí Minh",
      "TP.Hồ Chí Minh",
      "Tỉnh Hồ Chí Minh",
      "thành phố hồ chí minh",
      "THÀNH PHỐ HỒ CHÍ MINH",
      "  Thành phố   Hồ  Chí  Minh  ",
      "Thành Phố Hồ Chí Minh",
    ];

    it.each(variants)("matches %j", (city) => {
      expect(isHcmCity(city)).toBe(true);
    });
  });

  describe("city code", () => {
    it("trusts an HCM code even when the name is unusable", () => {
      expect(isHcmCity("Hồ Chí Minh", "HCM")).toBe(true);
      expect(isHcmCity("", "HCM")).toBe(true);
      expect(isHcmCity("ghi chú sai", "HCM")).toBe(true);
    });

    it("is case and whitespace insensitive", () => {
      expect(isHcmCity(null, "hcm")).toBe(true);
      expect(isHcmCity(null, " Hcm ")).toBe(true);
    });

    it("does not let a non-HCM code override a matching name", () => {
      // The name is the only signal here, and it is unambiguous.
      expect(isHcmCity("Hồ Chí Minh", "")).toBe(true);
      expect(isHcmCity("Hồ Chí Minh", "TN")).toBe(true);
    });
  });

  describe("other cities", () => {
    const otherCities = [
      "Bình Dương",
      "Tây Ninh",
      "Đồng Nai",
      "Bà Rịa - Vũng Tàu",
      "Thành phố Vũng Tàu",
      "Hà Nội",
      "Thành phố Hà Nội",
    ];

    it.each(otherCities)("rejects %j", (city) => {
      expect(isHcmCity(city)).toBe(false);
    });

    it("rejects a non-HCM code", () => {
      expect(isHcmCity("Tây Ninh", "TN")).toBe(false);
    });
  });

  describe("empty input", () => {
    it.each([undefined, null, ""])("rejects %j", (city) => {
      expect(isHcmCity(city)).toBe(false);
    });

    it("rejects an empty city even with no code", () => {
      expect(isHcmCity("", "")).toBe(false);
    });
  });
});
