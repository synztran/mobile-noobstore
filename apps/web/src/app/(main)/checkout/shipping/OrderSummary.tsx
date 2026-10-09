"use client";

import { ShippingSubmitButton } from "@/components/checkout/ShippingSubmitButton";
import ShippingFeeLabel from "@/components/ui/ShippingFeeLabel";
import { formatVND } from "@/lib/currency";
import { memo } from "react";

interface Props {
  subtotal: number;
  shippingCost: number;
  orderTotal: number;
  isCalculatingFee: boolean;
  isSubmitting: boolean;
  /** Fee not known yet (inter-city courier) — render "Cập nhật sau". */
  shippingFeePending?: boolean;
}

function OrderSummary({
  subtotal,
  shippingCost,
  orderTotal,
  isCalculatingFee,
  isSubmitting,
  shippingFeePending = false,
}: Props) {
  return (
    <div className="overflow-hidden rounded-3xl bg-surface-container-low">
      <div className="space-y-3 px-5 pb-4 pt-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          Tóm tắt đơn hàng
        </p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-on-surface-variant">Tạm tính</span>
          <span className="font-bold text-on-surface">
            {formatVND(subtotal)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-on-surface-variant">Phí vận chuyển</span>
          <ShippingFeeLabel
            shippingCost={shippingCost}
            isCalculatingFee={isCalculatingFee}
            shippingFeePending={shippingFeePending}
          />
        </div>
        <div className="h-px bg-outline-variant/30" />
        <div className="flex items-center justify-between">
          <span className="font-black text-on-surface">Tổng cộng</span>
          <span className="text-2xl font-black text-on-surface">
            {formatVND(orderTotal)}
          </span>
        </div>
      </div>
      <ShippingSubmitButton
        isCalculatingFee={isCalculatingFee}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

export default memo(OrderSummary);
