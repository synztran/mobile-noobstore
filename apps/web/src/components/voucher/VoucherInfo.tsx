"use client";

import { formatVND } from "@/lib/currency";
import type { AppliedVoucherSummary } from "@/types/voucher";

type VoucherInfoProps = {
  voucherCode?: string | null;
  appliedVoucher?: AppliedVoucherSummary | null;
  discountAmount?: number;
  shippingDiscountAmount?: number;
  className?: string;
};

export function VoucherInfo({
  voucherCode,
  appliedVoucher,
  discountAmount = 0,
  shippingDiscountAmount = 0,
  className = "",
}: VoucherInfoProps) {
  const resolvedCode = voucherCode ?? appliedVoucher?.voucher_code ?? null;
  const hasDiscount = discountAmount > 0 || shippingDiscountAmount > 0;

  if (!resolvedCode && !hasDiscount) {
    return null;
  }

  return (
    <div
      className={`space-y-2 rounded-2xl border border-primary/20 bg-primary/5 p-4 ${className}`}
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-primary">
        Thông tin voucher
      </p>
      {resolvedCode ? (
        <p className="text-sm font-bold text-on-surface">
          Mã voucher: <span className="text-primary">{resolvedCode}</span>
        </p>
      ) : null}
      {discountAmount > 0 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-on-surface-variant">Giảm đơn hàng</span>
          <span className="font-bold text-emerald-600">
            -{formatVND(discountAmount)}
          </span>
        </div>
      ) : null}
      {shippingDiscountAmount > 0 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-on-surface-variant">Trợ giá vận chuyển</span>
          <span className="font-bold text-emerald-600">
            -{formatVND(shippingDiscountAmount)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export default VoucherInfo;
