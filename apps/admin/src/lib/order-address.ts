import {
  isCarrierShippingMethod,
  isPickupShippingMethod,
} from "./shipping-method";

type AddressRow = Record<string, string | null | undefined>;

function parseAddress(deliveryAddress: unknown): AddressRow {
  if (!deliveryAddress) return {};
  if (typeof deliveryAddress === "string") {
    try {
      return JSON.parse(deliveryAddress) as AddressRow;
    } catch {
      return {};
    }
  }
  if (typeof deliveryAddress === "object") {
    return deliveryAddress as AddressRow;
  }
  return {};
}

/**
 * Build the customer address shown on the invoice based on how the order is
 * fulfilled:
 *   1. pickup            → "Lấy tại cửa hàng"
 *   2. standard/express  → street address
 *   3. carrier/shipment  → apartment + street, ward, district, city
 */
export function buildCustomerAddress(
  deliveryAddress: unknown,
  shippingMethodId: string | null | undefined
): string {
  const addr = parseAddress(deliveryAddress);

  if (isPickupShippingMethod(shippingMethodId) || !shippingMethodId) {
    return isPickupShippingMethod(shippingMethodId) ? "Lấy tại cửa hàng" : "";
  }

  const parts = isCarrierShippingMethod(shippingMethodId)
    ? [
        addr.apartment,
        addr.street_address,
        addr.ward,
        addr.district,
        addr.city,
      ]
    : [addr.street_address];

  return parts.filter(Boolean).join(", ");
}