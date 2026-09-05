"use client";

import { useVouchers } from "@/hooks/useVouchers";
import { formatVND } from "@/lib/currency";
import type { VoucherApplyItem, VoucherRow } from "@/types/voucher";
import { CheckCircle2, Search, Ticket, X } from "lucide-react";
import { memo } from "react";
import { VoucherDrawer } from "./VoucherDrawer";

type VoucherComponentProps = {
  initialVouchers?: VoucherRow[];
  className?: string;
  subtotal?: number;
  shippingCost?: number;
  shippingMethodId?: string;
  items?: VoucherApplyItem[];
};

function VoucherSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[1, 2].map((item) => (
        <div
          key={item}
          className="space-y-2 rounded-2xl bg-surface-container p-4"
        >
          <div className="h-3 w-1/3 rounded-full bg-surface-container-high" />
          <div className="h-4 w-2/3 rounded-full bg-surface-container-high" />
          <div className="h-8 w-24 rounded-xl bg-surface-container-high" />
        </div>
      ))}
    </div>
  );
}

export const VoucherComponent = memo(function VoucherComponent({
  initialVouchers = [],
  className = "",
  subtotal = 0,
  shippingCost = 0,
  shippingMethodId,
  items = [],
}: VoucherComponentProps) {
  const {
    drawerOpen,
    setDrawerOpen,
    searchQuery,
    setSearchQuery,
    appliedVouchers,
    totalDiscountAmount,
    totalShippingDiscountAmount,
    maxVouchersPerOrder,
    loadingVouchers,
    error,
    displayVouchers,
    filteredVouchers,
    validVouchers,
    invalidVouchers,
    applyingVoucher,
    removeAppliedVoucher,
  } = useVouchers({
    initialVouchers,
    subtotal,
    shippingCost,
    shippingMethodId,
    items,
  });

  return (
    <section className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-start gap-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-outline">
            Mã giảm giá
          </h3>
          {maxVouchersPerOrder > 0 && appliedVouchers.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
              {appliedVouchers.length}/{maxVouchersPerOrder}
            </span>
          )}
        </div>
      </div>

      {appliedVouchers.length > 0 && (
        <div className="space-y-2">
          {appliedVouchers.map((entry) => (
            <div
              key={entry.voucherInfo.voucher_id}
              className="relative rounded-2xl border border-emerald-500/25 bg-[linear-gradient(135deg,rgba(16,185,129,0.10),rgba(255,255,255,0.96))] p-4 shadow-[0_14px_40px_rgba(16,185,129,0.12)]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-12 items-center justify-center rounded-md bg-emerald-500 text-white">
                  <Ticket className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-600">
                    Đã áp dụng: {entry.voucherInfo.voucher_code}
                  </p>
                  {entry.discountAmount > 0 && (
                    <p className="text-sm font-bold text-on-surface">
                      Giảm giá đơn hàng: {formatVND(entry.discountAmount)}
                    </p>
                  )}
                  {entry.shippingDiscountAmount > 0 && (
                    <p className="text-sm font-bold text-on-surface">
                      Miễn phí vận chuyển
                    </p>
                  )}
                  {entry.gifts.length > 0 && (
                    <p className="text-sm font-bold text-on-surface">
                      + {entry.gifts.length} quà tặng
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                aria-label="Gỡ mã giảm giá"
                onClick={() =>
                  removeAppliedVoucher(entry.voucherInfo.voucher_id)
                }
                className="absolute -right-2 -top-2 rounded-2xl border border-error/80 bg-white p-1 font-black uppercase text-error"
              >
                <X size={16} />
              </button>
            </div>
          ))}

          {/* Total discount summary */}
          {(totalDiscountAmount > 0 || totalShippingDiscountAmount > 0) && (
            <div className="rounded-2xl bg-primary/5 p-3">
              <p className="text-center text-sm font-bold text-primary">
                Tổng giảm giá:{" "}
                {formatVND(totalDiscountAmount + totalShippingDiscountAmount)}
              </p>
            </div>
          )}
        </div>
      )}

      {loadingVouchers ? <VoucherSkeleton /> : null}

      {!loadingVouchers && !error && displayVouchers.length === 0 && appliedVouchers.length === 0 ? (
        <div className="rounded-xl bg-surface-container px-4 py-3 text-center text-sm text-on-surface-variant">
          Hiện chưa có voucher khả dụng.
        </div>
      ) : null}

      {!loadingVouchers ? (
        <>
          <VoucherDrawer
            drawerOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            validVouchers={validVouchers}
            invalidVouchers={invalidVouchers}
            filteredVouchers={filteredVouchers}
            subtotal={subtotal}
            shippingCost={shippingCost}
            shippingMethodId={shippingMethodId}
            items={items}
          />
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary/15 bg-primary/5 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-primary transition-colors hover:bg-primary/10"
          >
            <Search className="h-4 w-4" />
            {appliedVouchers.length > 0
              ? `Thay đổi mã giảm giá (${appliedVouchers.length})`
              : `Xem ${displayVouchers.length} mã giảm giá`}
          </button>
        </>
      ) : null}
    </section>
  );
});

export default VoucherComponent;
