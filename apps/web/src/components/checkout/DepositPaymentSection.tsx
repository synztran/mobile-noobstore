"use client";

import { formatVND } from "@/lib/currency";
import {
  DEPOSIT_LOW_PCT_MIN_ORDER_TOTAL,
  DEPOSIT_MAX_PCT,
  DEPOSIT_MIN_PCT,
  hasLowPctDeposit,
  minDepositPercentage,
} from "@/lib/deposit";
import { memo, useEffect, useState } from "react";
import { CheckCircle2, QrCode, ShieldAlert, WalletCards } from "lucide-react";
import clsx from "clsx";

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
  const minPercentage = minDepositPercentage(hasPreOrder, orderTotal);
  const lowPctAvailable = hasLowPctDeposit(hasPreOrder, orderTotal);
  const isDisabled = Boolean(disabledReason);

  const sanitizeDepositPct = (raw: unknown): number => {
    const num = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(num) || Number.isNaN(num)) return minPercentage;
    const clamped = Math.min(DEPOSIT_MAX_PCT, Math.max(minPercentage, num));
    return Math.round(clamped / 5) * 5;
  };

  const [draftPct, setDraftPct] = useState(() =>
    sanitizeDepositPct(depositPercentage)
  );

  useEffect(() => {
    const valid = sanitizeDepositPct(depositPercentage);
    setDraftPct(valid);
    if (valid !== depositPercentage) {
      setDepositPercentage(valid);
    }
  }, [depositPercentage, minPercentage]);

  const liveDeposit = Math.round((subtotal * draftPct) / 100);
  const liveCod = Math.max(0, orderTotal - liveDeposit);

  const commitPercentage = (pct?: number) => {
    const target = sanitizeDepositPct(pct ?? draftPct);
    setDraftPct(target);
    setDepositPercentage(target);
  };

  // Preset percentage chips: min is 30, max is 80 (or dynamic minPercentage)
  const presetPcts = [30, 50, 70, 80].filter(
    (p) => p >= minPercentage && p <= DEPOSIT_MAX_PCT
  );
  if (lowPctAvailable && !presetPcts.includes(DEPOSIT_MIN_PCT)) {
    presetPcts.unshift(DEPOSIT_MIN_PCT);
  }

  return (
    <div className="space-y-3">
      {/* Option 1: Full Payment */}
      <button
        type="button"
        onClick={() => setPaymentType("full")}
        className={clsx(
          "flex w-full items-start justify-between gap-3 rounded-2xl p-4 text-left transition-all",
          paymentType === "full"
            ? "border-2 border-primary bg-primary/[0.04] shadow-sm"
            : "border border-outline-variant/30 bg-surface hover:border-outline-variant/60"
        )}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {/* Custom Radio Button */}
          <div
            className={clsx(
              "mt-0.5 grid h-4 w-4 flex-shrink-0 place-items-center rounded-full border-2 transition-all",
              paymentType === "full"
                ? "border-primary bg-primary text-surface"
                : "border-outline-variant/60 bg-transparent"
            )}
          >
            {paymentType === "full" && (
              <div className="h-1.5 w-1.5 rounded-full bg-surface" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <QrCode size={15} className="text-primary" />
                <span className="text-xs font-bold text-on-surface sm:text-sm">
                  Chuyển khoản QR ngân hàng (100% đơn hàng)
                </span>
              </div>
              <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-900">
                Khuyên dùng
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">
              Quét mã QR banking tự động khớp đơn trong 10 giây, an toàn và bảo mật
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          <span className="text-xs font-black text-on-surface sm:text-sm">
            {formatVND(orderTotal)}
          </span>
        </div>
      </button>

      {/* Option 2: Deposit + COD */}
      {isDisabled ? (
        <div className="flex items-start gap-3 rounded-2xl border border-dashed border-outline-variant/30 bg-surface-container-low/50 p-4 opacity-75">
          <ShieldAlert size={18} className="mt-0.5 flex-shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-on-surface">
              Đặt cọc một phần + Thanh toán COD
            </p>
            <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400">
              {disabledReason ?? "Đặt cọc không áp dụng cho đơn hàng này."}
            </p>
          </div>
        </div>
      ) : (
        <div
          className={clsx(
            "rounded-2xl transition-all",
            paymentType === "deposit_cod"
              ? "border-2 border-primary bg-primary/[0.04] shadow-sm"
              : "border border-outline-variant/30 bg-surface hover:border-outline-variant/60"
          )}
        >
          <button
            type="button"
            onClick={() => setPaymentType("deposit_cod")}
            className="flex w-full items-start justify-between gap-3 p-4 text-left"
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              {/* Custom Radio Button */}
              <div
                className={clsx(
                  "mt-0.5 grid h-4 w-4 flex-shrink-0 place-items-center rounded-full border-2 transition-all",
                  paymentType === "deposit_cod"
                    ? "border-primary bg-primary text-surface"
                    : "border-outline-variant/60 bg-transparent"
                )}
              >
                {paymentType === "deposit_cod" && (
                  <div className="h-1.5 w-1.5 rounded-full bg-surface" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <WalletCards size={15} className="text-primary" />
                  <span className="text-xs font-bold text-on-surface sm:text-sm">
                    Đặt cọc trước {draftPct}% + COD khi nhận hàng
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">
                  Cọc trước {formatVND(liveDeposit)} qua QR · Phần còn lại ({formatVND(liveCod)}) thanh toán khi nhận bưu phẩm
                </p>
              </div>
            </div>
          </button>

          {/* Expanded Deposit Slider & Financial Summary */}
          {paymentType === "deposit_cod" && (
            <div className="space-y-4 border-t border-outline-variant/20 bg-surface/70 px-4 pb-5 pt-4">
              {/* Quick Select % Chips */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-on-surface">
                  Tùy chỉnh tỷ lệ đặt cọc:
                </span>
                <div className="flex items-center gap-1.5">
                  {presetPcts.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setDraftPct(pct);
                        commitPercentage(pct);
                      }}
                      className={clsx(
                        "rounded-lg px-2.5 py-1 text-xs font-black transition-all",
                        draftPct === pct
                          ? "bg-primary text-surface shadow-xs"
                          : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                      )}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Range Slider */}
              <div className="space-y-1.5">
                <input
                  type="range"
                  min={minPercentage}
                  max={DEPOSIT_MAX_PCT}
                  step={5}
                  value={draftPct}
                  onChange={(e) =>
                    setDraftPct(sanitizeDepositPct(Number(e.target.value)))
                  }
                  onPointerUp={() => commitPercentage()}
                  onKeyUp={() => commitPercentage()}
                  onBlur={() => commitPercentage()}
                  className="range range-primary range-sm w-full"
                />
                <div className="flex justify-between text-[10px] font-bold text-on-surface-variant/70">
                  <span>Tối thiểu: {minPercentage}%</span>
                  <span>Tối đa: {DEPOSIT_MAX_PCT}%</span>
                </div>
              </div>

              {/* 2-Column Financial Summary Breakdown */}
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-outline-variant/20 bg-surface-container/60 p-3.5 sm:grid-cols-2">
                <div className="space-y-0.5 border-b border-outline-variant/20 pb-2 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-3">
                  <span className="text-[11px] font-medium text-on-surface-variant">
                    Cần chuyển khoản cọc ngay ({draftPct}%):
                  </span>
                  <p className="text-base font-black text-primary">
                    {formatVND(liveDeposit)}
                  </p>
                </div>
                <div className="space-y-0.5 sm:pl-1">
                  <span className="text-[11px] font-medium text-on-surface-variant">
                    Thanh toán khi nhận hàng (COD):
                  </span>
                  <p className="text-base font-black text-on-surface">
                    {formatVND(liveCod)}
                  </p>
                </div>
              </div>

              {/* Notes */}
              <div className="rounded-xl bg-surface-container-low px-3 py-2 text-[11px] leading-relaxed text-on-surface-variant">
                <span className="font-bold text-primary">Lưu ý:</span> Đặt cọc{" "}
                {draftPct}% giá trị sản phẩm ({formatVND(liveDeposit)}).
                {hasPreOrder ? (
                  <>
                    {" "}
                    Đơn hàng có sản phẩm pre-order yêu cầu đặt cọc tối thiểu{" "}
                    <strong>{minPercentage}%</strong>.
                  </>
                ) : lowPctAvailable ? (
                  <>
                    {" "}
                    Mức cọc <strong>{DEPOSIT_MIN_PCT}%</strong> áp dụng cho đơn hàng từ{" "}
                    <strong>{formatVND(DEPOSIT_LOW_PCT_MIN_ORDER_TOTAL)}</strong> trở lên.
                  </>
                ) : (
                  <>
                    {" "}
                    Đơn hàng dưới{" "}
                    <strong>{formatVND(DEPOSIT_LOW_PCT_MIN_ORDER_TOTAL)}</strong> yêu cầu đặt cọc tối thiểu <strong>{minPercentage}%</strong>.
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
