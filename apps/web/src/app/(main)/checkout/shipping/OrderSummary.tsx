"use client";

import { ShippingSubmitButton } from "@/components/checkout/ShippingSubmitButton";
import ShippingFeeLabel from "@/components/ui/ShippingFeeLabel";
import { formatVND } from "@/lib/currency";
import { memo } from "react";
import CheckoutCartPreview from "./CheckoutCartPreview";

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
    <div className="rounded-2xl border border-outline-variant/20 bg-surface p-5 shadow-ambient-sm md:p-6">
      {/* Mini Cart Preview inside the Overview Card (Desktop) */}
      <div className="mb-4 hidden lg:block">
        <CheckoutCartPreview unstyled />
      </div>

      {/* Price Calculations */}
      <div className="space-y-2.5 pt-2 text-xs lg:border-t lg:border-outline-variant/15 lg:pt-4">
        <div className="flex items-center justify-between text-on-surface-variant">
          <span>Tạm tính hàng hóa</span>
          <span className="font-bold text-on-surface">
            {formatVND(subtotal)}
          </span>
        </div>
        <div className="flex items-center justify-between text-on-surface-variant">
          <span>Phí vận chuyển</span>
          <ShippingFeeLabel
            shippingCost={shippingCost}
            isCalculatingFee={isCalculatingFee}
            shippingFeePending={shippingFeePending}
          />
        </div>
        <div className="my-2 border-t border-outline-variant/20 pt-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-black text-on-surface">
              Tổng thanh toán
            </span>
            <span className="text-xl font-black text-primary md:text-2xl">
              {formatVND(orderTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <div className="mt-5">
        <ShippingSubmitButton
          isCalculatingFee={isCalculatingFee}
          isSubmitting={isSubmitting}
        />
      </div>

      {/* Trust reassurance badge */}
      <div className="mt-3.5 flex items-center justify-center gap-1.5 text-[10px] text-on-surface-variant/80">
        <span>🔒 Thanh toán bảo mật với mã hóa SSL 256-bit</span>
      </div>
    </div>
  );
}

export default memo(OrderSummary);
