export const DELIVERY_SERVICE_ID = "delivery_service";

export function normalizeShippingMethodId(
  id?: string | null
): string | null {
  if (id === "shipment") return DELIVERY_SERVICE_ID;
  return id ?? null;
}

export function sameShippingMethod(
  a?: string | null,
  b?: string | null
): boolean {
  const na = normalizeShippingMethodId(a);
  const nb = normalizeShippingMethodId(b);
  if (na === null || nb === null) return false;
  return na === nb;
}
