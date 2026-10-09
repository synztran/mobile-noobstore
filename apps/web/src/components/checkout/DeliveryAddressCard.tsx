"use client";

import type { ShippingDetails } from "@/lib/data";

interface DeliveryAddressCardProps {
  shipping: ShippingDetails;
  /** Fulfilled by a third-party courier — show the full ward/district/city. */
  isCarrierMethod: boolean;
}

export function DeliveryAddressCard({
  shipping,
  isCarrierMethod,
}: DeliveryAddressCardProps) {
  return (
    <div className="space-y-1 overflow-hidden rounded-2xl bg-surface-container-low px-4 py-4">
      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
        Thông tin nhận hàng
      </p>
      <p className="text-sm font-bold text-on-surface">
        {shipping.fullName}{" "}
        <span className="font-normal text-on-surface-variant">
          · {shipping.phoneNumber}
        </span>
      </p>
      <p className="text-sm text-on-surface-variant">
        {(isCarrierMethod
          ? [
              shipping.apartment,
              shipping.streetAddress,
              shipping.ward,
              shipping.district,
              shipping.city,
            ]
          : [shipping.apartment, shipping.streetAddress]
        )
          .filter(Boolean)
          .join(", ")}
      </p>
      {shipping.notes ? (
        <p className="space-x-1">
          <strong className="text-sm">Ghi chú:</strong>
          <small>{shipping.notes}</small>
        </p>
      ) : null}
    </div>
  );
}
