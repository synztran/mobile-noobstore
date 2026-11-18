export const ShippingMethod = {
  Standard: "standard",
  Express: "express",
  Shipment: "shipment",
  DeliveryService: "delivery_service",
  Pickup: "pickup",
  Carrier4h: "carrier_4h",
} as const;

export type ShippingMethod =
  (typeof ShippingMethod)[keyof typeof ShippingMethod];

export const DELIVERY_SERVICE_ID: ShippingMethod = ShippingMethod.DeliveryService;
export const PICKUP_SHIPPING_ID: ShippingMethod = ShippingMethod.Pickup;

/**
 * Every method fulfilled by a third-party courier. Mirrors
 * apps/web/src/lib/shipping-method.ts — keep the two in sync.
 */
const CARRIER_METHOD_IDS: readonly ShippingMethod[] = [
  ShippingMethod.DeliveryService,
  ShippingMethod.Carrier4h,
];

export type ShippingMethodLike = string | null | undefined;

export function normalizeShippingMethodId(
  id?: ShippingMethodLike
): ShippingMethod | null {
  if (id === ShippingMethod.Shipment) return DELIVERY_SERVICE_ID;
  return (id as ShippingMethod | null) ?? null;
}

export function isPickupShippingMethod(id?: ShippingMethodLike): boolean {
  return normalizeShippingMethodId(id) === ShippingMethod.Pickup;
}

export function isCarrierShippingMethod(id?: ShippingMethodLike): boolean {
  const normalized = normalizeShippingMethodId(id);
  return normalized !== null && CARRIER_METHOD_IDS.includes(normalized);
}

/**
 * Methods whose delivery fee is not known at checkout ("Cập nhật sau"), so the
 * order carries a zero fee until staff set the real courier amount from admin
 * /orders. Mirrors apps/web/src/lib/shipping-method.ts — keep the two in sync.
 */
const FEE_PENDING_METHOD_IDS: readonly ShippingMethod[] = [
  ShippingMethod.DeliveryService,
  ShippingMethod.Carrier4h,
];

export function isFeePendingShippingMethod(id?: ShippingMethodLike): boolean {
  const normalized = normalizeShippingMethodId(id);
  return normalized !== null && FEE_PENDING_METHOD_IDS.includes(normalized);
}

/**
 * True while an order is still waiting for a courier rate to be quoted.
 *
 * Courier methods are deliberately created with `shipping_fee = 0`, because
 * the BE / Grab / Green SM rate depends on the parcel and is not knowable at
 * checkout. So `0` alone cannot mean "unquoted" — an own-rider order with free
 * delivery is legitimately 0. The method decides which of the two it is, and
 * any positive amount counts as quoted.
 *
 * Consequence: a genuinely free courier quote still reads as "Cập nhật sau"
 * until staff enter a non-zero amount. That is cosmetic and one-directional.
 */
export function hasUnquotedShippingFee(
  shippingMethodId: ShippingMethodLike | null | undefined,
  shippingFee: number | null | undefined
): boolean {
  if (!isFeePendingShippingMethod(shippingMethodId)) return false;
  return Number(shippingFee ?? 0) === 0;
}

export function sameShippingMethod(
  a?: ShippingMethodLike,
  b?: ShippingMethodLike
): boolean {
  const na = normalizeShippingMethodId(a);
  const nb = normalizeShippingMethodId(b);
  if (na === null || nb === null) return false;
  return na === nb;
}