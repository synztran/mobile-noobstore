"use client";

import { RankBadge } from "@/components/rank/RankBadge";
import { VoucherDrawer } from "@/components/voucher/VoucherDrawer";
import { useVouchers } from "@/hooks/useVouchers";
import { formatVND } from "@/lib/currency";
import { useApplyVouchers } from "@/lib/react-query/voucher/api/useVoucherMutations";
import { toast } from "@/lib/toast";
import type { CustomerRank } from "@/types/rank";
import type { VoucherApplyItem } from "@/types/voucher";
import { ArrowRight, Search, ShieldCheck, Ticket, X } from "lucide-react";
import { useState } from "react";
import CheckoutCartPreview from "@/app/(main)/checkout/shipping/CheckoutCartPreview";

interface OrderSummaryCardProps {
  subtotal: number;
  shippingCost: number;
  /** Fee not known yet (inter-city courier) — render "Cập nhật sau". */
  shippingFeePending: boolean;
  totalShippingDiscountAmount: number;
  totalDiscountAmount: number;
  rankDiscountAmount: number;
  rankShippingDiscount: number;
  currentRank: CustomerRank | null;
  orderTotal: number;
  submitting: boolean;
  onConfirm: () => void;
  onRankClick: () => void;
  shippingMethodId?: string;
  voucherItems?: VoucherApplyItem[];
  paymentType?: "full" | "deposit_cod";
  depositPercentage?: number;
  isShippingValid?: boolean;
}

export function OrderSummaryCard({
  subtotal,
  shippingCost,
  shippingFeePending,
  totalShippingDiscountAmount,
  totalDiscountAmount,
  rankDiscountAmount,
  rankShippingDiscount,
  currentRank,
  orderTotal,
  submitting,
  onConfirm,
  onRankClick,
  shippingMethodId,
  voucherItems = [],
  paymentType = "full",
  depositPercentage = 50,
  isShippingValid = true,
}: OrderSummaryCardProps) {
  const [voucherCodeInput, setVoucherCodeInput] = useState("");

  const {
    drawerOpen,
    setDrawerOpen,
    searchQuery,
    setSearchQuery,
    appliedVouchers,
    validVouchers,
    invalidVouchers,
    filteredVouchers,
    displayVouchers,
    applyingVoucher,
    removeAppliedVoucher,
  } = useVouchers({
    subtotal,
    shippingCost,
    shippingMethodId,
    items: voucherItems,
  });

  const applyVouchersMutation = useApplyVouchers();

  const handleApplyByCode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = voucherCodeInput.trim().toUpperCase();
    if (!code) {
      toast.warning("Vui lòng nhập mã giảm giá");
      return;
    }

    const matched = displayVouchers.find((v) => v.code?.toUpperCase() === code);

    if (matched) {
      const currentIds = appliedVouchers.map((v) => v.voucherInfo.voucher_id);
      if (currentIds.includes(matched.id)) {
        toast.info("Mã giảm giá này đã được áp dụng");
        return;
      }
      currentIds.push(matched.id);
      applyVouchersMutation.mutate({
        voucherIds: currentIds,
        subtotal,
        shippingCost,
        shippingMethodId,
        items: voucherItems,
      });
      setVoucherCodeInput("");
    } else {
      toast.error("Mã giảm giá không tồn tại hoặc đã hết hạn");
    }
  };

  const isDeposit = paymentType === "deposit_cod";
  const depositAmount = isDeposit
    ? Math.round((subtotal * depositPercentage) / 100)
    : 0;
  const remainingCodAmount = isDeposit
    ? Math.max(0, orderTotal - depositAmount)
    : 0;

  return (
    <>
      {/* Voucher Drawer Modal */}
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
        items={voucherItems}
      />

      {/* Unified Order Summary Card - Matching Mockup 100% */}
      <div className="rounded-[18px] border border-outline-variant/20 bg-surface p-5 shadow-[0_12px_36px_rgba(55,35,24,.06)] md:p-6">
        {/* 1. Products Preview */}
        <div className="mb-4">
          <CheckoutCartPreview unstyled />
        </div>

        {/* 2. Voucher Apply Section */}
        <div className="mb-4 space-y-2.5 border-t border-dashed border-outline-variant/25 pt-4">
          <form onSubmit={handleApplyByCode} className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <input
                type="text"
                placeholder="Nhập mã voucher..."
                value={voucherCodeInput}
                onChange={(e) => setVoucherCodeInput(e.target.value)}
                className="input input-sm h-9 w-full rounded-xl border border-outline-variant/30 bg-surface-container/30 px-3 text-xs uppercase placeholder:normal-case placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={
                applyVouchersMutation.isPending || !voucherCodeInput.trim()
              }
              className={`flex h-9 shrink-0 items-center justify-center rounded-xl px-4 text-xs font-black uppercase tracking-wider transition-all ${
                voucherCodeInput.trim()
                  ? "shadow-xs bg-primary text-white hover:opacity-95"
                  : "cursor-not-allowed bg-surface-container text-on-surface-variant/60"
              }`}
            >
              {applyVouchersMutation.isPending ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                "Áp dụng"
              )}
            </button>
          </form>

          {/* Quick trigger to open voucher list drawer */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary transition-opacity hover:opacity-80"
            >
              <Ticket size={14} className="stroke-[2.2]" />
              <span>
                {displayVouchers.length > 0
                  ? `Xem ${displayVouchers.length} mã ưu đãi khả dụng`
                  : "Danh sách mã giảm giá"}
              </span>
            </button>
            {appliedVouchers.length > 0 && (
              <span className="text-[11px] font-bold text-emerald-600">
                Đã dùng {appliedVouchers.length} mã
              </span>
            )}
          </div>

          {/* Applied Voucher Chips */}
          {appliedVouchers.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {appliedVouchers.map((entry) => (
                <div
                  key={entry.voucherInfo.voucher_id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[#cce8d7] bg-[#f0f9f4] px-3 py-1.5 text-xs"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="rounded bg-[#1e8e3e] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                      {entry.voucherInfo.voucher_code}
                    </span>
                    <span className="truncate text-[11px] font-extrabold text-[#1e5e2e]">
                      {entry.discountAmount > 0
                        ? `Giảm ${formatVND(entry.discountAmount)}`
                        : entry.shippingDiscountAmount > 0
                          ? `Giảm ship ${formatVND(entry.shippingDiscountAmount)}`
                          : "Đã áp dụng"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      removeAppliedVoucher(entry.voucherInfo.voucher_id)
                    }
                    className="grid h-5 w-5 place-items-center rounded-full text-[#1e5e2e] transition-colors hover:bg-emerald-500/20 hover:text-rose-600"
                    aria-label="Gỡ voucher"
                  >
                    <X size={12} className="stroke-[2.5]" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Price Calculations */}
        <div className="space-y-2.5 border-t border-outline-variant/15 pt-3.5 text-xs">
          <div>
            <div className="flex items-center justify-between text-on-surface-variant">
              <span>Tạm tính hàng hóa</span>
              <span className="font-bold text-on-surface">
                {formatVND(subtotal)}
              </span>
            </div>

            {/* Nested deposit breakdown under Tạm tính hàng hóa */}
            {isDeposit && (
              <div className="mt-2 space-y-1 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary">
                    Thanh toán cọc trước ({depositPercentage}%):
                  </span>
                  <span className="font-black text-primary">
                    {formatVND(depositAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span>Còn lại thanh toán COD:</span>
                  <span className="font-bold text-on-surface">
                    {formatVND(remainingCodAmount)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-on-surface-variant">
            <span>Phí vận chuyển</span>
            <span
              className={`font-bold ${
                shippingCost === 0 ? "text-[#1e5e2e]" : "text-on-surface"
              }`}
            >
              {shippingFeePending
                ? "Cập nhật sau"
                : shippingCost === 0
                  ? "Miễn phí"
                  : formatVND(shippingCost)}
            </span>
          </div>

          {totalShippingDiscountAmount > 0 && (
            <div className="flex items-center justify-between font-bold text-[#1e5e2e]">
              <span>Giảm giá vận chuyển</span>
              <span>-{formatVND(totalShippingDiscountAmount)}</span>
            </div>
          )}

          {totalDiscountAmount > 0 && (
            <div className="flex items-center justify-between font-bold text-[#1e5e2e]">
              <span>Giảm giá voucher</span>
              <span>-{formatVND(totalDiscountAmount)}</span>
            </div>
          )}

          {rankDiscountAmount > 0 && (
            <div className="flex items-center justify-between font-bold text-[#1e5e2e]">
              <span className="flex items-center gap-1 font-normal text-on-surface-variant">
                {currentRank && (
                  <RankBadge
                    rank={currentRank}
                    size="sm"
                    onClick={onRankClick}
                  />
                )}
                Giảm giá thành viên
              </span>
              <span>-{formatVND(rankDiscountAmount)}</span>
            </div>
          )}

          {rankShippingDiscount > 0 && (
            <div className="flex items-center justify-between font-bold text-[#1e5e2e]">
              <span className="flex items-center gap-1 font-normal text-on-surface-variant">
                {currentRank && (
                  <RankBadge
                    rank={currentRank}
                    size="sm"
                    onClick={onRankClick}
                  />
                )}
                Miễn ship thành viên
              </span>
              <span>-{formatVND(rankShippingDiscount)}</span>
            </div>
          )}

          {/* Total Row */}
          <div className="mt-2.5 border-t-2 border-outline-variant/20 pt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-black text-on-surface">
                {isDeposit ? "Tổng giá trị đơn" : "Tổng thanh toán"}
              </span>
              <span className="text-2xl font-black text-primary">
                {formatVND(orderTotal)}
              </span>
            </div>
            {isDeposit && (
              <div className="mt-2 flex items-center justify-between rounded-xl bg-primary/10 px-3 py-2 text-xs text-primary">
                <span className="font-bold">Số tiền cọc thanh toán trước:</span>
                <span className="text-sm font-black">
                  {formatVND(depositAmount)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 4. Action CTA Button */}
        <div className="mt-5 space-y-2">
          {!isShippingValid && (
            <p className="text-center text-[11px] font-semibold text-rose-600 dark:text-rose-400">
              ⚠️ Vui lòng nhập thông tin giao hàng để xác nhận đơn
            </p>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="primary-gradient flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-xs font-black uppercase tracking-wider text-white shadow-md transition-all active:scale-[0.99] disabled:opacity-60"
          >
            {submitting ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <>
                Xác nhận đơn hàng
                <ArrowRight size={16} className="stroke-[2.5]" />
              </>
            )}
          </button>
        </div>

        {/* 5. Trust Security Reassurance */}
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-on-surface-variant/80">
          <ShieldCheck size={13} className="text-emerald-600" />
          <span>Thanh toán bảo mật với mã hóa</span>
        </div>
      </div>
    </>
  );
}
