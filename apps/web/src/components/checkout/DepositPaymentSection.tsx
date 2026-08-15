"use client";

import { formatVND } from "@/lib/currency";
import { memo, useEffect, useState } from "react";
import { Percent } from "lucide-react";

interface Props {
  paymentType: "full" | "deposit_cod";
  setPaymentType: (type: "full" | "deposit_cod") => void;
  depositPercentage: number;
  setDepositPercentage: (pct: number) => void;
  hasPreOrder?: boolean;
  subtotal: number;
  orderTotal: number;
  disabledReason?: string;
}

const MIN_ORDER_SUBTOTAL = 1_000_000;

export const DepositPaymentSection = memo(function DepositPaymentSection({
  paymentType,
  setPaymentType,
  depositPercentage,
  setDepositPercentage,
  hasPreOrder = false,
  subtotal,
  orderTotal,
  disabledReason,
}: Props) {
  const minPercentage = hasPreOrder ? 20 : 10;
  const isDisabled = subtotal < MIN_ORDER_SUBTOTAL || Boolean(disabledReason);

  // Local draft while dragging so the store (and the whole summary page) only
  // re-renders once when the user releases the slider.
  const [draftPct, setDraftPct] = useState(depositPercentage);

  useEffect(() => {
    setDraftPct(depositPercentage);
  }, [depositPercentage]);

  const liveDeposit = Math.round((subtotal * draftPct) / 100);
  const liveCod = Math.max(0, orderTotal - liveDeposit);

  const commitPercentage = () => setDepositPercentage(draftPct);

  if (isDisabled) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-surface-container-low">
        <div className="pointer-events-none select-none blur-[6px]" aria-hidden>
          <div className="flex items-center justify-between gap-8 p-4">
            <div className="flex flex-1 items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-surface-container-high">
                <Percent className="text-lg text-on-surface-variant" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  Đặt cọc đơn hàng
                </p>
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={false}
                disabled
              />
            </label>
          </div>
        </div>
        <div className="absolute inset-0 z-10 flex w-full items-center justify-center p-1">
          <p className="my-auto h-full w-full place-content-center rounded-xl bg-amber-500/10 px-1 py-1 text-center text-xs font-bold leading-relaxed text-amber-800">
            {disabledReason ??
              `Tính năng đặt cọc không hỗ trợ cho đơn hàng dưới ${formatVND(
                MIN_ORDER_SUBTOTAL
              )}.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-surface-container-low">
      <div className="flex items-center justify-between gap-8 p-4">
        <div className="flex flex-1 items-start gap-2">
          <div className="primary-gradient flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl">
            <Percent className="text-lg text-white" />
          </div>
          <div className="flex flex-col">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Đặt cọc đơn hàng
            </p>
            <span className="text-xs text-on-surface-variant">
              Đơn hàng của bạn được hỗ trợ thanh toán trước một phần
            </span>
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={paymentType === "deposit_cod"}
            onChange={(e) =>
              setPaymentType(e.target.checked ? "deposit_cod" : "full")
            }
          />
        </label>
      </div>
      {paymentType === "deposit_cod" && (
        <div className="space-y-3 border-t border-outline-variant/20 px-4 pb-4 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-on-surface-variant">
              Tỉ lệ đặt cọc:{" "}
              <strong className="text-on-surface">{depositPercentage}%</strong>
            </span>
          </div>
          <input
            type="range"
            min={minPercentage}
            max={80}
            step={5}
            value={draftPct}
            onChange={(e) => setDraftPct(Number(e.target.value))}
            onPointerUp={commitPercentage}
            onKeyUp={commitPercentage}
            onBlur={commitPercentage}
            className="range range-primary range-sm"
          />
          <div className="space-y-1.5 rounded-2xl bg-surface-container px-3 py-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">
                Đặt cọc ({draftPct}%)
              </span>
              <span className="font-bold text-primary">
                {formatVND(liveDeposit)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">
                Số tiền còn lại (COD)
              </span>
              <span className="font-bold text-secondary">
                {formatVND(liveCod)}
              </span>
            </div>
            <div className="h-px bg-outline-variant/30" />
            <div className="flex justify-between">
              <span className="text-xs font-bold text-on-surface">
                Cần chuyển khoản ngay
              </span>
              <span className="text-sm font-black text-primary">
                {formatVND(liveDeposit)}
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-primary/15 bg-primary/5 px-3 py-2.5">
            <p className="text-xs leading-relaxed text-on-surface-variant">
              <span className="font-bold text-primary">Lưu ý:</span> Đặt cọc{" "}
              {draftPct}% giá trị sản phẩm ({formatVND(liveDeposit)}). Số tiền
              còn lại ({formatVND(liveCod)}) sẽ được thanh toán khi nhận hàng
              (COD).
              {hasPreOrder && (
                <>
                  {" "}
                  Đơn hàng có pre-order yêu cầu đặt cọc tối thiểu{" "}
                  <strong>{minPercentage}%</strong>.
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
});
