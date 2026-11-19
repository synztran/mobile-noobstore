"use client";

import { formatShortVND, formatVND } from "@/lib/currency";
import type { RewardItem } from "@/types/reward";
import { Coins, Gift, Percent, Tag, Truck, Wallet } from "lucide-react";
import { formatPoints } from "./utils";

interface Props {
  reward: RewardItem;
  onRedeem: (r: RewardItem) => void;
  balance: number;
  dailyCheckinBalance?: number;
}

export function RewardCard({
  reward,
  onRedeem,
  balance,
  dailyCheckinBalance = 0,
}: Props) {
  const isCheckin = reward.pointsCurrency === "daily_checkin";
  const spendable = isCheckin ? dailyCheckinBalance : balance;
  const canAfford = spendable >= reward.pointsCost;
  const isSoldOut =
    reward.stock !== null && reward.claimedCount >= reward.stock;
  const shortage = Math.max(0, reward.pointsCost - spendable);

  const m = reward.metadata ?? {};
  const rt = (m.reward_type as string) || "";
  const scopeType = (m.scope_type as string) || "order_total";
  const amountOff = typeof m.amount_off === "number" ? m.amount_off : null;
  const percentOff = typeof m.percent_off === "number" ? m.percent_off : null;
  const maxDiscount =
    typeof m.max_discount_amount === "number" ? m.max_discount_amount : null;
  const minOrder =
    typeof m.min_order_amount === "number" ? m.min_order_amount : 0;
  const pointAmount = typeof m.point_amount === "number" ? m.point_amount : 0;

  // 1. Phân loại hình thái dải màu bên trái (Left Strip)
  let leftBg = "from-primary to-primary-focus";
  let leftIcon = <Tag size={26} className="text-white" />;
  let leftMainText = "VOUCHER";
  let leftSubText = "ƯU ĐÃI";

  if (
    rt === "free_shipping" ||
    rt === "shipping_percent_off" ||
    rt === "shipping_amount_off"
  ) {
    leftBg = "from-emerald-600 to-teal-800";
    leftIcon = <Truck size={26} className="text-white" />;
    leftMainText = "FREESHIP";
    leftSubText = rt === "free_shipping" ? "100% PHÍ" : "PHÍ SHIP";
  } else if (rt === "percent_off") {
    leftBg = "from-sky-600 to-blue-800";
    leftIcon = <Percent size={26} className="text-white stroke-[2.5]" />;
    leftMainText = `GIẢM ${percentOff ?? 0}%`;
    leftSubText = maxDiscount ? `TỐI ĐA ${formatShortVND(maxDiscount)}` : "TỔNG ĐƠN";
  } else if (rt === "amount_off") {
    leftBg = "from-[#b3451e] to-[#7f2d0f]";
    leftIcon = <Tag size={26} className="text-white" />;
    leftMainText = "GIẢM TIỀN";
    leftSubText = amountOff ? `-${formatShortVND(amountOff)}` : "TỔNG ĐƠN";
  } else if (reward.rewardType === "point") {
    leftBg = "from-amber-600 to-amber-800";
    leftIcon = <Coins size={26} className="text-white" />;
    leftMainText = `+${pointAmount}`;
    leftSubText = "ĐIỂM NSP";
  } else if (reward.rewardType === "product") {
    leftBg = "from-violet-600 to-purple-800";
    leftIcon = <Gift size={26} className="text-white" />;
    leftMainText = "QUÀ TẶNG";
    leftSubText = "VẬT LÝ";
  }

  // 2. Tỉ lệ tiến độ kho (Progress Bar góc trên)
  const hasStockLimit = reward.stock !== null && reward.stock > 0;
  const stockLimit = reward.stock ?? 0;
  const claimed = reward.claimedCount;
  const remaining = Math.max(0, stockLimit - claimed);
  const progressPct = hasStockLimit
    ? Math.min(100, Math.max(0, Math.round((claimed / stockLimit) * 100)))
    : 0;
  const isAlmostSoldOut = hasStockLimit && remaining <= 2;

  // 3. Nhãn loại & điều kiện phụ
  const scopeLabel =
    isCheckin
      ? "Chuyên cần"
      : scopeType === "shipping_fee"
        ? "Vận chuyển"
        : reward.rewardType === "point"
          ? "Điểm NSP"
          : "Tổng đơn";

  const conditionHint =
    minOrder > 0
      ? `Đơn tối thiểu ${formatVND(minOrder)}`
      : reward.description || "Áp dụng khi thanh toán";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onRedeem(reward)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onRedeem(reward);
        }
      }}
      className="group relative flex cursor-pointer select-none overflow-hidden rounded-2xl bg-surface-container-lowest shadow-ambient-sm transition-all hover:shadow-ambient-md active:scale-[0.99] lg:rounded-xl"
      style={{
        maskImage:
          "radial-gradient(circle 8px at 116px 0px, transparent 8px, black 8.5px), radial-gradient(circle 8px at 116px 100%, transparent 8px, black 8.5px)",
        WebkitMaskImage:
          "radial-gradient(circle 8px at 116px 0px, transparent 8px, black 8.5px), radial-gradient(circle 8px at 116px 100%, transparent 8px, black 8.5px)",
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
      }}
    >
      {/* DẢI NHẬN DIỆN BÊN TRÁI (LEFT STRIP) */}
      <div
        className={`relative flex w-[116px] shrink-0 flex-col items-center justify-center bg-gradient-to-b p-2 text-center text-white ${leftBg}`}
      >
        <div className="flex items-center justify-center">
          {leftIcon}
        </div>
        <span className="mt-1.5 text-xs font-black tracking-tight uppercase">
          {leftMainText}
        </span>
        <span className="mt-0.5 text-xs font-black tracking-tight text-white uppercase sm:text-sm">
          {leftSubText}
        </span>

        {/* Vạch nét đứt phân chia hai khối */}
        <div className="absolute top-3.5 bottom-3.5 right-0 w-px border-r border-dashed border-white/40" />
      </div>

      {/* KHỐI NỘI DUNG BÊN PHẢI (RIGHT CONTENT) */}
      <div className="flex min-w-0 flex-1 flex-col justify-between p-3 sm:p-3.5">
        <div>
          {/* Header row: Badge bên trái & Mini progress bar bên phải */}
          <div className="flex items-center justify-between gap-2">
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                isCheckin
                  ? "bg-secondary-fixed/50 text-secondary"
                  : "bg-primary-fixed/40 text-primary"
              }`}
            >
              {scopeLabel}
            </span>

            {/* Mini Progress Bar góc trên phải */}
            {hasStockLimit ? (
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`text-[10px] font-bold ${
                    isSoldOut
                      ? "text-rose-500 font-black"
                      : isAlmostSoldOut
                        ? "text-rose-500 font-extrabold"
                        : "text-on-surface-variant"
                  }`}
                >
                  {isSoldOut
                    ? "Đã hết lượt"
                    : isAlmostSoldOut
                      ? `Còn ${remaining} lượt`
                      : `Đã đổi ${claimed}/${stockLimit}`}
                </span>
                <div className="h-1 w-16 overflow-hidden rounded-full bg-surface-container sm:w-20">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isSoldOut || isAlmostSoldOut
                        ? "bg-rose-500"
                        : "bg-primary"
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            ) : (
              <span className="rounded bg-surface-container px-1.5 py-0.5 text-[10px] font-semibold text-on-surface-variant">
                Không giới hạn
              </span>
            )}
          </div>

          {/* Tiêu đề & mô tả điều kiện */}
          <h3 className="mt-1.5 truncate text-xs font-black text-on-surface sm:text-sm">
            {reward.name}
          </h3>
          <p className="mt-0.5 truncate text-[11px] font-medium text-on-surface-variant">
            {conditionHint}
          </p>
        </div>

        {/* Footer row: Chi phí & Nút hành động */}
        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-surface-container-high/60 pt-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Wallet size={14} className="shrink-0 text-amber-500" />
              <span className="text-sm font-black text-primary sm:text-base">
                {formatPoints(reward.pointsCost).replace(/ điểm$/, "")}
              </span>
            </div>
            {!canAfford && !isSoldOut && (
              <span className="block text-[9px] font-semibold text-rose-500">
                Thiếu {formatPoints(shortage).replace(/ điểm$/, "")}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRedeem(reward);
            }}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 ${
              isSoldOut
                ? "cursor-not-allowed bg-surface-container text-on-surface-variant/50"
                : canAfford
                  ? "primary-gradient text-white hover:opacity-95"
                  : "border border-primary/20 bg-primary-fixed/20 text-primary hover:bg-primary-fixed/30"
            }`}
          >
            {isSoldOut ? "Hết lượt" : canAfford ? "Đổi ngay" : "Xem chi tiết"}
          </button>
        </div>
      </div>
    </div>
  );
}
