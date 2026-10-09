"use client";

import { formatVND } from "@/lib/currency";
import type { PaymentInformation } from "@/lib/payment-information";
import { buildQRBank } from "@/lib/qr-bank";
import Image from "@/components/ui/AdaptiveImage";
import { useState } from "react";

interface Props {
  bankMethod: PaymentInformation | null;
  totalPrice: number;
  orderNumber: string | null;
  subtotal: number;
  shippingCost: number;
  voucherDiscount?: number;
  shippingDiscount?: number;
  totalLabel?: string;
  paymentType?: "full" | "deposit_cod";
  depositAmount?: number;
  remainingAmount?: number;
  depositPercentage?: number;
  shippingFeePending?: boolean;
}

export function QRPaymentSection({
  bankMethod,
  totalPrice: _totalPrice,
  orderNumber,
  subtotal,
  shippingCost,
  voucherDiscount = 0,
  shippingDiscount = 0,
  totalLabel = "Tổng cộng",
  paymentType = "full",
  depositAmount = 0,
  remainingAmount = 0,
  depositPercentage = 0,
  shippingFeePending = false,
}: Props) {
  const [qrError, setQrError] = useState(false);
  const qrPrice = paymentType === "deposit_cod" ? depositAmount : _totalPrice;

  return (
    <div className="relative flex flex-col items-center overflow-hidden rounded-2xl bg-surface-container-low shadow-ambient">
      {bankMethod ? (
        <div className="relative z-10 mb-2 flex h-64 w-full items-center justify-center rounded-2xl border border-outline-variant/30 bg-white p-4">
          {qrError ? (
            <p className="px-4 text-center text-sm leading-relaxed text-on-surface-variant">
              Nếu QR không khả dụng, vui lòng thực hiện thao tác chuyển khoản
              theo thông tin đề cập bên dưới
            </p>
          ) : (
            <Image
              src={buildQRBank(bankMethod, qrPrice, `${orderNumber}`)}
              alt="Payment QR Code"
              className="object-contain"
              fill
              sizes="280px"
              unoptimized
              onError={() => setQrError(true)}
            />
          )}
        </div>
      ) : (
        <div className="relative z-10 mb-2 flex h-64 w-full items-center justify-center rounded-2xl bg-surface-container">
          <p className="px-6 text-center text-sm font-semibold text-on-surface-variant">
            Chưa có cấu hình thanh toán ngân hàng.
          </p>
        </div>
      )}
      <p className="relative z-10 text-center text-xs leading-relaxed text-on-surface-variant">
        Mở app banking và quét mã để hoàn tất thanh toán.
      </p>

      {/* Amount breakdown */}
      <div className="relative z-10 mt-3 w-full space-y-2 rounded-2xl bg-surface-container-high p-4">
        <div className="flex justify-between text-sm">
          <span className="text-on-surface-variant">Tạm tính</span>
          <span className="font-bold text-on-surface">
            {formatVND(subtotal)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-on-surface-variant">Phí vận chuyển</span>
          <span
            className={`text-xs font-bold ${shippingCost === 0 && shippingFeePending ? "text-emerald-600" : "text-on-surface-variant"}`}
          >
            {shippingFeePending
              ? "Cập nhật sau"
              : shippingCost === 0
                ? "Miễn phí"
                : formatVND(shippingCost)}
          </span>
        </div>
        {voucherDiscount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Giảm giá voucher</span>
            <span className="font-bold text-secondary">
              -{formatVND(voucherDiscount)}
            </span>
          </div>
        )}
        {shippingDiscount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Giảm phí vận chuyển</span>
            <span className="font-bold text-secondary">
              -{formatVND(shippingDiscount)}
            </span>
          </div>
        )}
        <div className="h-px bg-outline-variant/30" />
        {paymentType === "deposit_cod" ? (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">
                Đặt cọc ({depositPercentage}%)
              </span>
              <span className="font-bold text-primary">
                {formatVND(depositAmount)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Còn lại (COD)</span>
              <span className="font-bold text-secondary">
                {formatVND(remainingAmount)}
              </span>
            </div>
            <div className="h-px bg-outline-variant/30" />
            <div className="flex justify-between">
              <span className="font-black text-on-surface">
                Cần chuyển khoản
              </span>
              <span className="text-lg font-black text-primary">
                {formatVND(depositAmount)}
              </span>
            </div>
          </>
        ) : (
          <div className="flex justify-between">
            <span className="font-black text-on-surface">{totalLabel}</span>
            <span className="text-lg font-black text-primary">
              {formatVND(_totalPrice)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
