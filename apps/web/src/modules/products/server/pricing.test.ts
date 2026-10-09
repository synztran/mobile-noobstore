import { describe, expect, it } from "vitest";
import { resolveProductPricing } from "./pricing";

/** Quantity-tier products model each pack as a variant on a zero base. */
function tiers(...prices: number[]) {
  return prices.map((p) => ({ effective_price: p }));
}

describe("resolveProductPricing", () => {
  it("uses base_price when there are no variants", () => {
    const r = resolveProductPricing({ basePrice: 500_000, variants: [] });
    expect(r.min_price).toBe(500_000);
    expect(r.from_price).toBe(500_000);
    expect(r.discount_price).toBe(0);
    expect(r.discount_percentage).toBe(0);
    expect(r.unpriced).toBe(false);
  });

  it("reports the cheapest tier as the from-price", () => {
    const r = resolveProductPricing({
      basePrice: 0,
      variants: tiers(1_500_000, 1_200_000, 1_800_000),
    });
    expect(r.min_price).toBe(1_200_000);
    expect(r.from_price).toBe(1_200_000);
    expect(r.unpriced).toBe(false);
  });

  it("prices tiers off base_price + price_adjustment", () => {
    // 70 / 90 / 110 packs: base 1_000_000, adjustments 0 / +200_000 / +500_000
    const basePrice = 1_000_000;
    const adjustments = [0, 200_000, 500_000];
    const r = resolveProductPricing({
      basePrice,
      variants: tiers(...adjustments.map((a) => basePrice + a)),
    });
    expect(r.min_price).toBe(1_000_000);
    expect(r.from_price).toBe(1_000_000);
    // No tier is below base, so nothing is advertised as a discount.
    expect(r.discount_price).toBe(0);
    expect(r.discount_percentage).toBe(0);
  });

  it("never returns Infinity when every variant is unpriced", () => {
    // base 0 + adjustment-only pricing that was never filled in
    const r = resolveProductPricing({ basePrice: 0, variants: tiers(0, 0) });
    expect(r.min_price).toBe(0);
    expect(r.from_price).toBe(0);
    expect(r.unpriced).toBe(true);
  });

  it("ignores unpriced variants when at least one tier has a price", () => {
    const r = resolveProductPricing({
      basePrice: 0,
      variants: tiers(0, 1_200_000, 0),
    });
    expect(r.min_price).toBe(1_200_000);
    expect(r.unpriced).toBe(false);
  });

  it("flags a discount only when a variant is cheaper than base", () => {
    const r = resolveProductPricing({
      basePrice: 1_000_000,
      variants: tiers(1_400_000, 800_000),
    });
    expect(r.discount_price).toBe(800_000);
    expect(r.discount_percentage).toBe(20);
  });

  it("does not flag a discount when every variant costs more than base", () => {
    const r = resolveProductPricing({
      basePrice: 1_000_000,
      variants: tiers(1_200_000, 1_500_000),
    });
    expect(r.discount_price).toBe(0);
    expect(r.discount_percentage).toBe(0);
  });

  it("lets a kit from-price override the variant minimum", () => {
    const r = resolveProductPricing({
      basePrice: 1_000_000,
      variants: tiers(1_000_000),
      kitFromPrice: 1_450_000,
    });
    // min_price stays the cheapest single variant…
    expect(r.min_price).toBe(1_000_000);
    // …while from_price is base + cheapest REQUIRED component variants.
    expect(r.from_price).toBe(1_450_000);
  });

  it("ignores a non-positive kit from-price", () => {
    const r = resolveProductPricing({
      basePrice: 1_000_000,
      variants: tiers(1_200_000),
      kitFromPrice: 0,
    });
    expect(r.from_price).toBe(1_200_000);
  });
});
