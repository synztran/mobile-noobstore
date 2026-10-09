"use client";

import type { ShippingDetails } from "@/lib/data";
import {
  ShippingMethod,
  normalizeShippingMethodId,
} from "@/lib/shipping-method";
import { Store, Truck } from "lucide-react";

function formatPickupSlot(value?: string | null): string {
  if (!value) return "Chưa chọn thời gian";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface MethodCopy {
  label: string;
  description: string;
}

/**
 * Display copy per delivery method. The in-city courier tier is labelled by its
 * delivery window, not by a speed claim, so it is never mistaken for the
 * own-rider "Hỏa tốc" option.
 */
const METHOD_COPY: Record<string, MethodCopy> = {
  [ShippingMethod.Standard]: {
    label: "Tiêu chuẩn",
    description: "Dự kiến: 12–24 giờ",
  },
  [ShippingMethod.Express]: {
    label: "Hỏa tốc",
    description: "Dự kiến: 2–4 giờ",
  },
  [ShippingMethod.Carrier4h]: {
    label: "Vận chuyển nhanh 4h",
    description: "Đơn vị vận chuyển · giao trong 4 giờ",
  },
  // Keyed by the normalized id, since `shipment` is the legacy alias for it.
  [ShippingMethod.DeliveryService]: {
    label: "Đơn vị vận chuyển",
    description: "Giao bởi đơn vị vận chuyển",
  },
  [ShippingMethod.Pickup]: {
    label: "Nhận tại cửa hàng",
    description: "",
  },
};

interface ShippingMethodCardProps {
  shipping: ShippingDetails | null;
  onEdit: () => void;
}

export function ShippingMethodCard({
  shipping,
  onEdit,
}: ShippingMethodCardProps) {
  const isPickup = shipping?.deliverySpeed === ShippingMethod.Pickup;
  // Normalize first: the store may hold either `shipment` or its canonical
  // `delivery_service`, and an unnormalized miss would fall back to the
  // own-rider copy and mislabel an inter-city courier order.
  const methodId = normalizeShippingMethodId(shipping?.deliverySpeed ?? null);
  const copy: MethodCopy =
    (methodId ? METHOD_COPY[methodId] : undefined) ??
    METHOD_COPY[ShippingMethod.Standard];

  const description = isPickup
    ? shipping?.pickupAt
      ? `Hẹn giờ: ${formatPickupSlot(shipping.pickupAt)}`
      : "NoobStore sẽ chủ động liên hệ bạn khi sản phẩm đã về hàng"
    : copy.description;

  return (
    <div className="overflow-hidden rounded-2xl bg-surface-container-low">
      <div className="flex items-center justify-between gap-4 p-4">
        <div className="flex flex-1 items-start gap-2">
          <div className="primary-gradient flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl">
            {isPickup ? (
              <Store className="text-lg text-white" />
            ) : (
              <Truck className="text-lg text-white" />
            )}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              {isPickup ? "Hình thức nhận hàng" : "Vận chuyển"}
            </p>
            <p className="text-sm font-bold text-on-surface">{copy.label}</p>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              {description}
            </p>
          </div>
        </div>
        <button
          onClick={onEdit}
          className="text-xs font-black uppercase tracking-widest text-primary transition-opacity hover:opacity-70"
        >
          Sửa
        </button>
      </div>
    </div>
  );
}
