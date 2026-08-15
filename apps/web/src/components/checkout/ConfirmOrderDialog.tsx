"use client";

import { formatVND } from "@/lib/currency";
import { CheckCircle } from "lucide-react";

interface ConfirmOrderDialogProps {
  showConfirm: boolean;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
  itemCount: number;
  subtotal: number;
  shippingCost: number;
  isDeliveryService: boolean;
  totalDiscountAmount: number;
  totalShippingDiscountAmount: number;
  rankDiscountAmount: number;
  rankShippingDiscount: number;
  orderTotal: number;
  paymentType: "full" | "deposit_cod";
  depositPercentage: number;
  depositAmount: number;
  codAmount: number;
}

export function ConfirmOrderDialog({
  showConfirm,
  onClose,
  onConfirm,
  submitting,
  itemCount,
  subtotal,
  shippingCost,
  isDeliveryService,
  totalDiscountAmount,
  totalShippingDiscountAmount,
  rankDiscountAmount,
  rankShippingDiscount,
  orderTotal,
  paymentType,
  depositPercentage,
  depositAmount,
  codAmount,
}: ConfirmOrderDialogProps) {
  return (
    <dialog
      className={`modal modal-bottom !mt-0 sm:modal-middle ${showConfirm ? "modal-open" : ""}`}
    >
      <div className="modal-box rounded-t-2xl bg-surface px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6">
        <div className="mb-2 flex flex-col items-center py-2 text-center">
          <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle size={32} className="text-emerald-600" />
          </div>
          <p className="text-lg font-black text-on-surface">
            Xác nhận đặt hàng
          </p>
        </div>

        <div className="mb-6 space-y-3 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 shadow-md">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Tóm tắt đơn hàng
          </p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-on-surface-variant">Số lượng sản phẩm</span>
            <span className="font-bold text-on-surface">{itemCount}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-on-surface-variant">Tạm tính</span>
            <span className="font-bold text-on-surface">
              {formatVND(subtotal)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-on-surface-variant">Phí vận chuyển</span>
            <span className="font-bold text-on-surface">
              {isDeliveryService
                ? "Cập nhật bởi đơn vị vận chuyển"
                : shippingCost === 0
                  ? "Miễn phí"
                  : formatVND(shippingCost)}
            </span>
          </div>
          {totalDiscountAmount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">Giảm giá</span>
              <span className="font-bold text-emerald-600">
                -{formatVND(totalDiscountAmount)}
              </span>
            </div>
          )}
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
          {rankDiscountAmount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">
                Giảm giá thành viên
              </span>
              <span className="font-bold text-emerald-600">
                -{formatVND(rankDiscountAmount)}
              </span>
            </div>
          )}
          {rankShippingDiscount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">
                Miễn ship thành viên
              </span>
              <span className="font-bold text-emerald-600">
                -{formatVND(rankShippingDiscount)}
              </span>
            </div>
          )}
          <div className="h-px bg-outline-variant/30" />
          <div className="flex items-center justify-between">
            <span className="font-bold text-on-surface">Tổng cộng</span>
            <span className="text-lg font-black text-primary">
              {formatVND(orderTotal)}
            </span>
          </div>
        </div>

        {paymentType === "deposit_cod" && (
          <div className="mb-6 space-y-2 rounded-2xl border border-primary/15 bg-primary/5 p-4 shadow-md">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">
              Thanh toán
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">
                Đặt cọc ({depositPercentage}%)
              </span>
              <span className="font-bold text-primary">
                {formatVND(depositAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">Còn lại (COD)</span>
              <span className="font-bold text-secondary">
                {formatVND(codAmount)}
              </span>
            </div>
            <div className="h-px bg-primary/10" />
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-on-surface">
                Cần chuyển khoản ngay
              </span>
              <span className="font-black text-primary">
                {formatVND(depositAmount)}
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl bg-surface-container py-4 text-xs font-black uppercase tracking-widest text-on-surface transition-transform active:scale-95"
          >
            Huỷ
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="primary-gradient flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 text-xs font-black uppercase tracking-widest text-white transition-transform active:scale-95 disabled:opacity-60"
          >
            {submitting ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "Xác nhận"
            )}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
