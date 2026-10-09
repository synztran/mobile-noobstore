import { describe, expect, it } from "vitest";
import {
  ShippingMethod,
  hasUnquotedShippingFee,
  isCarrierShippingMethod,
  isFeePendingShippingMethod,
  isPickupShippingMethod,
  normalizeShippingMethodId,
  sameShippingMethod,
} from "./shipping-method";
import {
  CARRIER_SHIPPING_TIERS,
  getCarrierShippingTier,
  isCarrierTier,
} from "./carrier-shipping";

const ALL_METHODS = [
  ShippingMethod.Standard,
  ShippingMethod.Express,
  ShippingMethod.Shipment,
  ShippingMethod.DeliveryService,
  ShippingMethod.Pickup,
  ShippingMethod.Carrier4h,
];

describe("normalizeShippingMethodId", () => {
  it("collapses the legacy shipment alias onto delivery_service", () => {
    expect(normalizeShippingMethodId(ShippingMethod.Shipment)).toBe(
      ShippingMethod.DeliveryService
    );
  });

  it("passes every other id through unchanged", () => {
    for (const id of ALL_METHODS) {
      if (id === ShippingMethod.Shipment) continue;
      expect(normalizeShippingMethodId(id)).toBe(id);
    }
  });

  it("returns null for missing ids", () => {
    expect(normalizeShippingMethodId(null)).toBeNull();
    expect(normalizeShippingMethodId(undefined)).toBeNull();
  });
});

describe("isCarrierShippingMethod", () => {
  it("covers every courier-fulfilled method", () => {
    expect(isCarrierShippingMethod(ShippingMethod.DeliveryService)).toBe(true);
    expect(isCarrierShippingMethod(ShippingMethod.Shipment)).toBe(true);
    expect(isCarrierShippingMethod(ShippingMethod.Carrier4h)).toBe(true);
  });

  it("excludes own-rider delivery and pickup", () => {
    expect(isCarrierShippingMethod(ShippingMethod.Standard)).toBe(false);
    expect(isCarrierShippingMethod(ShippingMethod.Express)).toBe(false);
    expect(isCarrierShippingMethod(ShippingMethod.Pickup)).toBe(false);
    expect(isCarrierShippingMethod(ShippingMethod.Preorder)).toBe(false);
    expect(isCarrierShippingMethod(null)).toBe(false);
    expect(isCarrierShippingMethod(undefined)).toBe(false);
  });
});

describe("isFeePendingShippingMethod", () => {
  it("is true for the inter-city courier tier", () => {
    expect(isFeePendingShippingMethod(ShippingMethod.DeliveryService)).toBe(
      true
    );
    expect(isFeePendingShippingMethod(ShippingMethod.Shipment)).toBe(true);
  });

  it("is true for the in-city carrier tier", () => {
    // They are courier-fulfilled, so the rate is not knowable at checkout and
    // the amount is set per order from admin /orders.
    expect(isFeePendingShippingMethod(ShippingMethod.Carrier4h)).toBe(true);
  });

  it("is false for own-rider delivery and pickup", () => {
    expect(isFeePendingShippingMethod(ShippingMethod.Standard)).toBe(false);
    expect(isFeePendingShippingMethod(ShippingMethod.Express)).toBe(false);
    expect(isFeePendingShippingMethod(ShippingMethod.Pickup)).toBe(false);
    expect(isFeePendingShippingMethod(null)).toBe(false);
  });

  it("is a strict subset of the carrier methods", () => {
    for (const id of ALL_METHODS) {
      if (isFeePendingShippingMethod(id)) {
        expect(isCarrierShippingMethod(id)).toBe(true);
      }
    }
  });
});

describe("isPickupShippingMethod", () => {
  it("matches only pickup", () => {
    for (const id of ALL_METHODS) {
      expect(isPickupShippingMethod(id)).toBe(id === ShippingMethod.Pickup);
    }
    expect(isPickupShippingMethod(null)).toBe(false);
  });
});

describe("sameShippingMethod", () => {
  it("treats shipment and delivery_service as the same method", () => {
    expect(
      sameShippingMethod(
        ShippingMethod.Shipment,
        ShippingMethod.DeliveryService
      )
    ).toBe(true);
  });

  it("keeps courier IDs distinct", () => {
    expect(
      sameShippingMethod(
        ShippingMethod.Carrier4h,
        ShippingMethod.DeliveryService
      )
    ).toBe(false);
    expect(
      sameShippingMethod(ShippingMethod.Carrier4h, ShippingMethod.Carrier4h)
    ).toBe(true);
  });

  it("is false when either side is missing", () => {
    expect(sameShippingMethod(null, ShippingMethod.Standard)).toBe(false);
    expect(sameShippingMethod(ShippingMethod.Standard, null)).toBe(false);
  });
});

describe("getCarrierShippingTier", () => {
  it("maps the in-city tier to its SLA window", () => {
    expect(getCarrierShippingTier(ShippingMethod.Carrier4h)).toEqual({
      slaHours: 4,
    });
  });

  it("has no tier for the inter-city courier, own-rider or pickup methods", () => {
    expect(getCarrierShippingTier(ShippingMethod.DeliveryService)).toBeNull();
    expect(getCarrierShippingTier(ShippingMethod.Shipment)).toBeNull();
    expect(getCarrierShippingTier(ShippingMethod.Standard)).toBeNull();
    expect(getCarrierShippingTier(ShippingMethod.Express)).toBeNull();
    expect(getCarrierShippingTier(ShippingMethod.Pickup)).toBeNull();
    expect(getCarrierShippingTier(null)).toBeNull();
  });

  it("gives every tier a positive SLA window", () => {
    for (const tier of Object.values(CARRIER_SHIPPING_TIERS)) {
      expect(tier.slaHours).toBeGreaterThan(0);
    }
  });
});

describe("isCarrierTier", () => {
  it("is true only for the in-city tier", () => {
    expect(isCarrierTier(ShippingMethod.Carrier4h)).toBe(true);
    expect(isCarrierTier(ShippingMethod.DeliveryService)).toBe(false);
    expect(isCarrierTier(ShippingMethod.Pickup)).toBe(false);
    expect(isCarrierTier(null)).toBe(false);
  });
});

describe("hasUnquotedShippingFee", () => {
  // Courier orders are persisted with shipping_fee = 0, so "0" is ambiguous on
  // its own. The method is what disambiguates it.
  it("is true for a courier order that has not been quoted yet", () => {
    expect(hasUnquotedShippingFee(ShippingMethod.Carrier4h, 0)).toBe(true);
    expect(hasUnquotedShippingFee(ShippingMethod.DeliveryService, 0)).toBe(
      true
    );
  });

  it("clears once staff quote a rate", () => {
    expect(hasUnquotedShippingFee(ShippingMethod.Carrier4h, 35_000)).toBe(
      false
    );
  });

  it("treats a null fee as unquoted for a courier method", () => {
    expect(hasUnquotedShippingFee(ShippingMethod.Carrier4h, null)).toBe(true);
  });

  it("is false for own-rider free delivery, which is legitimately 0", () => {
    // Regression guard: the HCMC free-delivery promotion must not render
    // "Cập nhật sau" just because its fee is 0.
    expect(hasUnquotedShippingFee(ShippingMethod.Standard, 0)).toBe(false);
    expect(hasUnquotedShippingFee(ShippingMethod.Pickup, 0)).toBe(false);
    expect(hasUnquotedShippingFee(ShippingMethod.Express, 0)).toBe(false);
  });

  it("is false for a non-courier method regardless of the amount", () => {
    expect(hasUnquotedShippingFee(ShippingMethod.Standard, 33_000)).toBe(false);
  });

  it("is false when the method is missing or unknown", () => {
    expect(hasUnquotedShippingFee(null, 0)).toBe(false);
    expect(hasUnquotedShippingFee(undefined, null)).toBe(false);
    expect(hasUnquotedShippingFee("not_a_method", 0)).toBe(false);
  });
});
