import {
  ShippingMethod,
  normalizeShippingMethodId,
  type ShippingMethodLike,
} from "@/lib/shipping-method";

export interface CarrierShippingTier {
  /** Promise window in hours, used for `orders.expected_delivery_at`. */
  slaHours: number;
}

/**
 * In-city courier tier. The customer picks a delivery window here; staff pick
 * the actual carrier (`orders.tracking_carrier_id`) when fulfilling, and the
 * customer's tracking link is built from `carriers.tracking_url_template`.
 *
 * Unpriced by design. The courier rate depends on the parcel and is not known at
 * checkout, so these quote "Cập nhật sau" exactly like the inter-city tier and
 * the amount is set later from admin /orders. What this tier does add over the
 * inter-city option is a speed commitment plus a tracking link the customer can
 * follow without waiting for the store to relay it.
 */
export const CARRIER_SHIPPING_TIERS: Readonly<
  Record<string, CarrierShippingTier>
> = {
  [ShippingMethod.Carrier4h]: {
    slaHours: 4,
  },
};

export function getCarrierShippingTier(
  id?: ShippingMethodLike
): CarrierShippingTier | null {
  const normalized = normalizeShippingMethodId(id);
  if (normalized === null) return null;
  return CARRIER_SHIPPING_TIERS[normalized] ?? null;
}

/** True for the in-city courier tier (not the inter-city `delivery_service`). */
export function isCarrierTier(id?: ShippingMethodLike): boolean {
  return getCarrierShippingTier(id) !== null;
}
