"use client";

import { formatVND } from "@/lib/currency";
import { RankBadge } from "@/components/rank/RankBadge";
import type { CustomerRank } from "@/types/rank";
import { ArrowRight } from "lucide-react";

interface OrderSummaryCardProps {
  subtotal: number;
  shippingCost: number;
  isDeliveryService: boolean;
  totalShippingDiscountAmount: number;
  totalDiscountAmount: number;
  rankDiscountAmount: number;
  rankShippingDiscount: number;
  currentRank: CustomerRank | null;
  orderTotal: number;
  submitting: boolean;
  onConfirm: () => void;
  onRankClick: () => void;
}

export function OrderSummaryCard({
  subtotal,
  shippingCost,
  isDeliveryService,
  totalShippingDiscountAmount,
  totalDiscountAmount,
  rankDiscountAmount,
  rankShippingDiscount,
  currentRank,
  orderTotal,
  submitting,
  onConfirm,
  onRankClick,
}: OrderSummaryCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl bg-surface-container-low">
      <div className="space-y-4 px-4 pb-3 pt-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          Tóm tắt đơn hàng
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-on-surface-variant">Tạm tính</span>
            <span className="font-black text-on-surface">
              {formatVND(subtotal)}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-on-surface-variant">Phí vận chuyển</span>
            <span
              className={`font-black ${shippingCost === 0 ? "text-emerald-600" : "text-on-surface"}`}
            >
              {isDeliveryService
                ? "Cập nhật sau"
                : shippingCost === 0
                  ? "Miễn phí"
                  : formatVND(shippingCost)}
            </span>
          </div>

          {totalShippingDiscountAmount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">
                Giảm phí vận chuyển
              </span>
              <span className="font-bold text-emerald-600">
                -{formatVND(totalShippingDiscountAmount)}
              </span>
            </div>
          )}

          {totalDiscountAmount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">Giảm giá voucher</span>
              <span className="font-bold text-emerald-600">
                -{formatVND(totalDiscountAmount)}
              </span>
            </div>
          )}

          {rankDiscountAmount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-on-surface-variant">
                {currentRank && (
                  <RankBadge
                    rank={currentRank}
                    size="sm"
                    onClick={onRankClick}
                  />
                )}
                Giảm giá thành viên
              </span>
              <span className="font-bold text-emerald-600">
                -{formatVND(rankDiscountAmount)}
              </span>
            </div>
          )}

          {rankShippingDiscount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-on-surface-variant">
                {currentRank && (
                  <RankBadge
                    rank={currentRank}
                    size="sm"
                    onClick={onRankClick}
                  />
                )}
                Miễn ship thành viên
              </span>
              <span className="font-bold text-emerald-600">
                -{formatVND(rankShippingDiscount)}
              </span>
            </div>
          )}

          <div className="h-px bg-outline-variant/30" />

          <div className="flex items-center justify-between text-base">
            <span className="font-bold text-on-surface">Tổng cộng</span>
            <span className="text-xl font-black text-primary">
              {formatVND(orderTotal)}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={onConfirm}
        disabled={submitting}
        className="primary-gradient flex w-full items-center justify-center gap-2 rounded-b-3xl py-4 text-sm font-black uppercase tracking-widest text-white transition-opacity active:opacity-90 disabled:opacity-60"
      >
        {submitting ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          <>
            Xác nhận đơn hàng
            <ArrowRight className="text-lg" />
          </>
        )}
      </button>
    </div>
  );
}
