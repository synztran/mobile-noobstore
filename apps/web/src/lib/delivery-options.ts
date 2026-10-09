import { getCarrierShippingTier } from "@/lib/carrier-shipping";
import { ShippingMethod } from "@/lib/shipping-method";

/**
 * Own rider (priced by distance) + the in-city carrier tier + store pickup.
 * The inter-city courier is deliberately absent: it only makes sense for orders
 * leaving HCM.
 */
export const HCM_VISIBLE_METHODS: ReadonlySet<string> = new Set<string>([
  ShippingMethod.Standard,
  ShippingMethod.Express,
  ShippingMethod.Carrier4h,
  ShippingMethod.Pickup,
]);

/** Outside HCM only the inter-city courier and store pickup are offered. */
export const PROVINCE_VISIBLE_METHODS: ReadonlySet<string> = new Set<string>([
  ShippingMethod.Shipment,
  ShippingMethod.Pickup,
]);

export interface DeliveryOptionInput {
  id: string;
  price: number | null;
}

export interface ResolvedDeliveryOption<T extends DeliveryOptionInput> {
  /** `null` when the price is not known yet — rendered as "Cập nhật sau". */
  price: number | null;
  isHidden: boolean;
  option: T;
}

export interface ResolveDeliveryOptionsInput<T extends DeliveryOptionInput> {
  options: readonly T[];
  /** City is HCMC. */
  isHCM: boolean;
  /** Distance-derived fees for the own-rider options. */
  distanceFees: { express: number; standard: number };
}

/**
 * Resolves each delivery option's price and whether it should be offered.
 *
 * An option is hidden for exactly one reason: geography. Every courier tier is
 * offered inside HCMC and quoted as "Cập nhật sau" (price `null`) because the
 * courier rate is not known at checkout; the own-rider options carry their
 * distance-derived price.
 */
export function resolveDeliveryOptions<T extends DeliveryOptionInput>({
  options,
  isHCM,
  distanceFees,
}: ResolveDeliveryOptionsInput<T>): ResolvedDeliveryOption<T>[] {
  const visibleMethods = isHCM ? HCM_VISIBLE_METHODS : PROVINCE_VISIBLE_METHODS;

  return options.map((option) => {
    const tier = getCarrierShippingTier(option.id);

    let price: number | null;
    if (tier) {
      // Unquoted — staff set the real courier amount from admin /orders.
      price = null;
    } else if (
      option.id === ShippingMethod.Express ||
      option.id === ShippingMethod.Standard
    ) {
      price =
        option.id === ShippingMethod.Express
          ? distanceFees.express
          : distanceFees.standard;
    } else {
      price = option.price;
    }

    return {
      option,
      price,
      isHidden: !visibleMethods.has(option.id),
    };
  });
}
