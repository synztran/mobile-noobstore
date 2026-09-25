export const ShippingMethod = {
  Standard: "standard",
  Express: "express",
  Shipment: "shipment",
  DeliveryService: "delivery_service",
  Pickup: "pickup",
  Preorder: "preorder",
} as const;

export type ShippingMethod =
  (typeof ShippingMethod)[keyof typeof ShippingMethod];

export type DeliverySpeed =
  | (typeof ShippingMethod)["Standard"]
  | (typeof ShippingMethod)["Express"]
  | (typeof ShippingMethod)["Shipment"]
  | (typeof ShippingMethod)["Pickup"];

export const DELIVERY_SERVICE_ID: ShippingMethod = ShippingMethod.DeliveryService;
export const PICKUP_SHIPPING_ID: ShippingMethod = ShippingMethod.Pickup;

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
  return normalizeShippingMethodId(id) === ShippingMethod.DeliveryService;
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