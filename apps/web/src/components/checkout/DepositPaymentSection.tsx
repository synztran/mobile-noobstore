"use client";

import { formatVND } from "@/lib/currency";
import { Landmark } from "lucide-react";

interface Props {
  paymentType: "full" | "deposit_cod";
  setPaymentType: (type: "full" | "deposit_cod") => void;
  depositPercentage: number;
  setDepositPercentage: (pct: number) => void;
  depositAmount: number;
  codAmount: number;
  hasPreOrder?: boolean;
  subtotal: number;
}

const MIN_ORDER_SUBTOTAL = 1_000_000;

export function DepositPaymentSection({
  paymentType,
  setPaymentType,
  depositPercentage,
  setDepositPercentage,
  depositAmount,
  codAmount,
  hasPreOrder = false,
  subtotal,
}: Props) {
  const minPercentage = hasPreOrder ? 20 : 10;
  const isDisabled = subtotal < MIN_ORDER_SUBTOTAL;

  if (isDisabled) {
    return (
      <div className="overflow-hidden rounded-2xl bg-surface-container-low">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex flex-1 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-surface-container-high">
              <Landmark className="text-lg text-on-surface-variant" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                Đặt cọc đơn hàng
              </p>
            </div>
          </div>
        </div>
        <div className="border-t border-outline-variant/20 px-4 pb-4 pt-3">
          <div className="rounded-2xl bg-amber-500/10 px-3 py-2.5">
            <p className="text-xs leading-relaxed text-amber-700">
              Tính năng đặt cọc không hỗ trợ cho đơn hàng dưới{" "}
              <strong>{formatVND(MIN_ORDER_SUBTOTAL)}</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-surface-container-low">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex flex-1 items-center gap-3">
          <div className="primary-gradient flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl">
            <Landmark className="text-lg text-white" />
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
              <strong className="text-on-surface">
                {depositPercentage}%
              </strong>
            </span>
          </div>
          <input
            type="range"
            min={minPercentage}
            max={80}
            step={5}
            value={depositPercentage}
            onChange={(e) => setDepositPercentage(Number(e.target.value))}
            className="range range-primary range-sm"
          />
          <div className="space-y-1.5 rounded-2xl bg-surface-container px-3 py-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">
                Đặt cọc ({depositPercentage}%)
              </span>
              <span className="font-bold text-primary">
                {formatVND(depositAmount)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">
                Số tiền còn lại (COD)
              </span>
              <span className="font-bold text-secondary">
                {formatVND(codAmount)}
              </span>
            </div>
            <div className="h-px bg-outline-variant/30" />
            <div className="flex justify-between">
              <span className="text-xs font-bold text-on-surface">
                Cần chuyển khoản ngay
              </span>
              <span className="text-sm font-black text-primary">
                {formatVND(depositAmount)}
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-primary/15 bg-primary/5 px-3 py-2.5">
            <p className="text-xs leading-relaxed text-on-surface-variant">
              <span className="font-bold text-primary">Lưu ý:</span> Đặt cọc{" "}
              {depositPercentage}% giá trị sản phẩm (
              {formatVND(depositAmount)}). Số tiền còn lại (
              {formatVND(codAmount)}) sẽ được thanh toán khi nhận hàng (COD).
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
}
