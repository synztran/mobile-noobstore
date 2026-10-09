import { describe, expect, it } from "vitest";
import { resolveDeliveryOptions } from "./delivery-options";

interface Option {
  id: string;
  price: number | null;
}

const OPTIONS: Option[] = [
  { id: "standard", price: 0 },
  { id: "express", price: null },
  { id: "carrier_4h", price: null },
  { id: "shipment", price: null },
  { id: "pickup", price: 0 },
];

const FEES = {
  distance: { express: 52_000, standard: 33_000 },
};

function visibleIds(isHCM: boolean): string[] {
  return resolveDeliveryOptions({
    options: OPTIONS,
    isHCM,
    distanceFees: FEES.distance,
  })
    .filter((r) => !r.isHidden)
    .map((r) => r.option.id);
}

function priceOf(id: string, isHCM: boolean): number | null {
  const resolved = resolveDeliveryOptions({
    options: OPTIONS,
    isHCM,
    distanceFees: FEES.distance,
  });
  return resolved.find((r) => r.option.id === id)?.price ?? null;
}

describe("resolveDeliveryOptions — HCMC", () => {
  it("offers the own-rider options, the in-city carrier tier and pickup", () => {
    expect(visibleIds(true)).toEqual([
      "standard",
      "express",
      "carrier_4h",
      "pickup",
    ]);
  });

  it("hides the inter-city courier", () => {
    expect(visibleIds(true)).not.toContain("shipment");
  });
});

describe("resolveDeliveryOptions — outside HCMC", () => {
  it("offers only the inter-city courier and pickup", () => {
    expect(visibleIds(false)).toEqual(["shipment", "pickup"]);
  });

  it("hides the in-city carrier tier and the own-rider options", () => {
    const visible = visibleIds(false);
    for (const id of ["carrier_4h", "standard", "express"]) {
      expect(visible).not.toContain(id);
    }
  });
});

describe("resolveDeliveryOptions — pricing", () => {
  it("prices the own-rider options from the distance fees", () => {
    expect(priceOf("standard", true)).toBe(33_000);
    expect(priceOf("express", true)).toBe(52_000);
  });

  it("leaves the in-city carrier tier unquoted", () => {
    // The BE / Grab / Green SM rate depends on the parcel, so checkout quotes
    // "Cập nhật sau" and staff set the amount per order from admin /orders.
    expect(priceOf("carrier_4h", true)).toBeNull();
  });

  it("leaves the inter-city courier price unquoted", () => {
    expect(priceOf("shipment", false)).toBeNull();
  });

  it("does not surcharge the in-city carrier tier by distance", () => {
    const near = priceOf("carrier_4h", true);
    const withHugeDistanceFee = resolveDeliveryOptions({
      options: OPTIONS,
      isHCM: true,
      distanceFees: { express: 500_000, standard: 400_000 },
    }).find((r) => r.option.id === "carrier_4h")?.price;
    expect(withHugeDistanceFee).toBe(near);
  });
});

describe("resolveDeliveryOptions — carrier tiers are never price-gated", () => {
  // Migration 138 used a 0 price to switch a tier off, which meant a 0-fee tier
  // was silently invisible and a misconfigured column could hide delivery
  // entirely. Visibility is now purely geographic.
  it("offers the in-city carrier tier in HCMC regardless of any fee config", () => {
    expect(visibleIds(true)).toContain("carrier_4h");
  });

  it("never resolves a carrier tier to a numeric price", () => {
    const resolved = resolveDeliveryOptions({
      options: OPTIONS,
      isHCM: true,
      distanceFees: FEES.distance,
    });
    const tier = resolved.find((r) => r.option.id === "carrier_4h");
    expect(tier?.price).toBeNull();
    expect(tier?.isHidden).toBe(false);
  });

  it("cannot offer a carrier tier as free", () => {
    // The old failure mode was a 0-fee tier rendering as "Miễn phí", which
    // would ship parcels for nothing.
    const resolved = resolveDeliveryOptions({
      options: OPTIONS,
      isHCM: true,
      distanceFees: FEES.distance,
    });
    expect(resolved.find((r) => r.option.id === "carrier_4h")?.price).not.toBe(
      0
    );
  });
});
