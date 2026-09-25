"use client";

import type { ShippingDetails } from "@/lib/data";
import { ShippingMethod } from "@/lib/shipping-method";
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

interface ShippingMethodCardProps {
  shipping: ShippingDetails | null;
  onEdit: () => void;
}

export function ShippingMethodCard({
  shipping,
  onEdit,
}: ShippingMethodCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl bg-surface-container-low">
      <div className="flex items-center justify-between gap-4 p-4">
        <div className="flex flex-1 items-start gap-2">
          <div className="primary-gradient flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl">
            {shipping?.deliverySpeed === ShippingMethod.Pickup ? (
              <Store className="text-lg text-white" />
            ) : (
              <Truck className="text-lg text-white" />
            )}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              {shipping?.deliverySpeed === ShippingMethod.Pickup
                ? "Hình thức nhận hàng"
                : "Vận chuyển"}
            </p>
            <p className="text-sm font-bold text-on-surface">
              {shipping?.deliverySpeed === ShippingMethod.Pickup
                ? "Nhận tại cửa hàng"
                : shipping?.deliverySpeed === ShippingMethod.Express
                  ? "Hỏa tốc"
                  : shipping?.deliverySpeed === ShippingMethod.Shipment
                    ? "Đơn vị vận chuyển"
                    : "Tiêu chuẩn"}
            </p>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              {shipping?.deliverySpeed === ShippingMethod.Pickup
                ? shipping?.pickupAt
                  ? `Hẹn giờ: ${formatPickupSlot(shipping.pickupAt)}`
                  : "NoobStore sẽ chủ động liên hệ bạn khi sản phẩm đã về hàng"
                : shipping?.deliverySpeed === ShippingMethod.Express
                  ? "Dự kiến: 2–4 giờ"
                  : shipping?.deliverySpeed === ShippingMethod.Shipment
                    ? "Giao bởi đơn vị vận chuyển"
                    : "Dự kiến: 12–24 giờ"}
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
