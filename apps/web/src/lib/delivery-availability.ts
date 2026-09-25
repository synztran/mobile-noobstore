import { DELIVERY_OPTIONS } from "@/constants";
import { ShippingMethod } from "@/lib/shipping-method";
import {
  expressDelivery,
  pickupDelivery,
  standardDelivery,
} from "@/lib/store-hours";

export interface DeliveryMethodAvailability {
  id: string;
  label: string;
  available: boolean;
  eta: string;
}

type GetDeliveryAvailabilityOptions = {
  /** Show "Sau khi có hàng" ETA for every method on pre-order products. */
  isPreOrder?: boolean;
  preOrderEstimate?: string | null;
};

/**
 * Availability + expected-arrival for every delivery method, computed from
 * the current time against the store's working hours. Reusable across
 * components/pages (product configurator, checkout summary, etc.).
 */
export function getDeliveryAvailability(
  now: Date,
  options: GetDeliveryAvailabilityOptions = {}
): DeliveryMethodAvailability[] {
  const { isPreOrder = false, preOrderEstimate = null } = options;

  const preOrderEta = preOrderEstimate
    ? `Sau khi có hàng (ước tính ${preOrderEstimate})`
    : "Sau khi có hàng";

  const methods: DeliveryMethodAvailability[] = DELIVERY_OPTIONS.map((opt) => {
    if (opt.id === ShippingMethod.Pickup) {
      const p = pickupDelivery(now);
      return { id: opt.id, label: opt.label, available: p.available, eta: p.eta };
    }
    if (opt.id === ShippingMethod.Express) {
      const e = expressDelivery(now, 2);
      return { id: opt.id, label: opt.label, available: e.available, eta: e.eta };
    }
    if (opt.id === ShippingMethod.Standard) {
      const s = standardDelivery(now);
      return { id: opt.id, label: opt.label, available: s.available, eta: s.eta };
    }
    return {
      id: opt.id,
      label: opt.label,
      available: true,
      eta: "Giao bởi đơn vị vận chuyển",
    };
  });

  if (isPreOrder) {
    return methods.map((m) => ({ ...m, available: true, eta: preOrderEta }));
  }
  return methods;
}

/** Number of delivery methods usable right now. */
export function countAvailableMethods(
  methods: DeliveryMethodAvailability[]
): number {
  return methods.filter((m) => m.available).length;
}