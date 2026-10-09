import { describe, expect, it } from "vitest";
import { resolveCardPricing } from "./card-pricing";

describe("resolveCardPricing", () => {
  it("renders base_price plainly when there is nothing cheaper", () => {
    const r = resolveCardPricing({
      base_price: 1_000_000,
      min_price: 1_000_000,
      from_price: 1_000_000,
      variants: [{ effective_price: 1_000_000 }],
    });
    expect(r.amount).toBe(1_000_000);
    expect(r.showFrom).toBe(false);
    expect(r.showDiscount).toBe(false);
    expect(r.unpriced).toBe(false);
  });

  it("advertises the cheapest pack and qualifies it for a tiered product", () => {
    // 70 / 90 / 110 packs priced off a zero base
    const r = resolveCardPricing({
      base_price: 0,
      min_price: 1_200_000,
      variants: [
        { effective_price: 1_200_000 },
        { effective_price: 1_500_000 },
        { effective_price: 1_800_000 },
      ],
    });
    expect(r.amount).toBe(1_200_000);
    expect(r.showFrom).toBe(true);
    expect(r.unpriced).toBe(false);
  });

  it("qualifies tier prices even when base_price is set above them", () => {
    // base is the list price; every pack costs more than it
    const r = resolveCardPricing({
      base_price: 1_000_000,
      min_price: 1_000_000,
      variants: [
        { effective_price: 1_000_000 },
        { effective_price: 1_200_000 },
        { effective_price: 1_500_000 },
      ],
    });
    expect(r.amount).toBe(1_000_000);
    expect(r.showFrom).toBe(true);
  });

  it("does not qualify when every variant shares one price", () => {
    const r = resolveCardPricing({
      base_price: 1_000_000,
      min_price: 1_000_000,
      variants: [
        { effective_price: 1_000_000 },
        { effective_price: 1_000_000 },
      ],
    });
    expect(r.showFrom).toBe(false);
  });

  it("always qualifies a kit from_price", () => {
    const r = resolveCardPricing({
      base_price: 1_000_000,
      min_price: 1_000_000,
      from_price: 1_450_000,
      product_type: "kit",
      variants: [{ effective_price: 1_000_000 }],
    });
    expect(r.amount).toBe(1_450_000);
    expect(r.showFrom).toBe(true);
  });

  it("ignores from_price on a non-kit product", () => {
    // The list loader collapses from_price onto min_price for standard
    // products, so keying the qualifier off its presence would label
    // every card in the shop grid.
    const r = resolveCardPricing({
      base_price: 1_000_000,
      min_price: 1_000_000,
      from_price: 1_000_000,
      product_type: "standard",
      variants: [{ effective_price: 1_000_000 }],
    });
    expect(r.amount).toBe(1_000_000);
    expect(r.showFrom).toBe(false);
  });

  it("qualifies when the cheapest variant is under base_price", () => {
    const r = resolveCardPricing({
      base_price: 1_000_000,
      min_price: 800_000,
      discount_price: 800_000,
      variants: [{ effective_price: 800_000 }],
    });
    expect(r.showDiscount).toBe(true);
    expect(r.amount).toBe(800_000);
    expect(r.showFrom).toBe(true);
  });

  it("flags nothing priced yet", () => {
    const r = resolveCardPricing({ base_price: 0, variants: [] });
    expect(r.unpriced).toBe(true);
    expect(r.amount).toBe(0);
    expect(r.showFrom).toBe(false);
  });

  it("falls back to base_price when no variant price is known", () => {
    const r = resolveCardPricing({
      base_price: 750_000,
      variants: [{ effective_price: 0 }],
    });
    expect(r.amount).toBe(750_000);
    expect(r.unpriced).toBe(false);
    // A single unpriced variant is not a tier ladder.
    expect(r.showFrom).toBe(false);
  });

  it("ignores unpriced variants when counting tiers", () => {
    const r = resolveCardPricing({
      base_price: 0,
      min_price: 1_500_000,
      variants: [
        { effective_price: 0 },
        { effective_price: 1_500_000 },
        { effective_price: 2_000_000 },
      ],
    });
    expect(r.amount).toBe(1_500_000);
    expect(r.showFrom).toBe(true);
  });

  it("never advertises Infinity from a fully unpriced variant list", () => {
    const r = resolveCardPricing({
      base_price: 0,
      min_price: Number.POSITIVE_INFINITY,
      variants: [{ effective_price: 0 }, { effective_price: 0 }],
    });
    expect(r.amount).toBe(0);
    expect(r.unpriced).toBe(true);
  });
});
