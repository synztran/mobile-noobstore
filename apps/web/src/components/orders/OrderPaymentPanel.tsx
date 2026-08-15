"use client";

import { formatVND } from "@/lib/currency";
import type { PaymentInformation } from "@/lib/payment-information";
import { normalizeShippingMethodId, DELIVERY_SERVICE_ID } from "@/lib/shipping-method";
import { usePaymentInformation } from "@/lib/react-query/order/api/useOrderQueries";
import { Check, Copy, CreditCard } from "lucide-react";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";

interface Props {
  orderNumber: string;
  totalPrice: number;
  shippingFee: number;
  shippingMethodId?: string | null;
  voucherDiscount?: number;
  shippingDiscount?: number;
  paymentType?: "full" | "deposit_cod";
  depositAmount?: number;
  remainingAmount?: number;
  depositPercentage?: number;
}

function buildQRUrl(
  bank: PaymentInformation,
  amount: number,
  ref: string
): string {
  const query = new URLSearchParams({
    acc: bank.account_number,
    bank: bank.platform_name,
    amount: String(amount),
    des: ref,
    template: "compact",
  });
  return `https://qr.sepay.vn/img?${query.toString()}`;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [value]);

  return (
    <button
      type="button"
      aria-label={`Sao chép ${label}`}
      onClick={handleCopy}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container transition-transform active:scale-90"
    >
      {copied ? (
        <Check size={14} className="text-secondary" />
      ) : (
        <Copy size={14} className="text-primary" />
      )}
    </button>
  );
}

export function OrderPaymentPanel({
  orderNumber,
  totalPrice,
  shippingFee,
  shippingMethodId = null,
  voucherDiscount = 0,
  shippingDiscount = 0,
  paymentType = "full",
  depositAmount = 0,
  remainingAmount = 0,
  depositPercentage = 0,
}: Props) {
  const subtotal =
    totalPrice - shippingFee + voucherDiscount + shippingDiscount;

  const isDeliveryService =
    normalizeShippingMethodId(shippingMethodId) === DELIVERY_SERVICE_ID;

  const { data, isLoading } = usePaymentInformation();

  const bankMethod = useMemo(
    () => data?.find((m) => m.platform_type === "bank") ?? null,
    [data]
  );

  const qrAmount = paymentType === "deposit_cod"
    ? depositAmount
    : totalPrice;

  const qrUrl = useMemo(() => {
    if (!bankMethod) return null;
    return buildQRUrl(bankMethod, qrAmount, orderNumber);
  }, [bankMethod, qrAmount, orderNumber]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-40 rounded-full bg-surface-container" />
        <div className="h-56 rounded-2xl bg-surface-container" />
        <div className="h-24 rounded-2xl bg-surface-container" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Section label */}
      <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
        Thông tin thanh toán
      </p>

      {/* QR Code */}
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-container p-4">
        {qrUrl ? (
          <div className="relative h-56 w-full overflow-hidden rounded-xl border border-outline-variant/20 bg-white">
            <Image
              src={qrUrl}
              alt={`Mã QR thanh toán đơn ${orderNumber}`}
              fill
              sizes="280px"
              className="object-contain"
              unoptimized
            />
          </div>
        ) : (
          <div className="flex h-56 w-full items-center justify-center rounded-xl border border-outline-variant/20 bg-surface">
            <p className="px-6 text-center text-sm text-on-surface-variant">
              Chưa cấu hình thông tin ngân hàng
            </p>
          </div>
        )}
        <div>
          <p className="text-center text-sm font-bold text-on-surface">
            Quét mã để thanh toán
          </p>
          <p className="text-center text-xs text-on-surface-variant">
            Mở app ngân hàng và quét mã để hoàn tất thanh toán
          </p>
        </div>
      </div>

      {/* Amount breakdown */}
      <div className="space-y-2 rounded-2xl bg-surface-container px-4 py-3">
        <div className="flex justify-between text-sm">
          <span className="text-on-surface-variant">Tạm tính</span>
          <span className="font-bold text-on-surface">
            {formatVND(subtotal)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-on-surface-variant">Phí vận chuyển</span>
          <span
            className={
              isDeliveryService
                ? "font-bold text-on-surface-variant"
                : shippingFee === 0
                  ? "font-bold text-secondary"
                  : "font-bold text-on-surface"
            }
          >
            {isDeliveryService
              ? "Cập nhật sau"
              : shippingFee === 0
                ? "Miễn phí"
                : formatVND(shippingFee)}
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
            <span className="text-on-surface-variant">Trợ giá vận chuyển</span>
            <span className="font-bold text-secondary">
              -{formatVND(shippingDiscount)}
            </span>
          </div>
        )}
        <div className="h-px bg-outline-variant/30" />
        {paymentType === "deposit_cod" ? (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Đặt cọc ({depositPercentage}%)</span>
              <span className="font-bold text-primary">{formatVND(depositAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Còn lại (COD)</span>
              <span className="font-bold text-secondary">{formatVND(remainingAmount)}</span>
            </div>
            <div className="h-px bg-outline-variant/30" />
            <div className="flex justify-between">
              <span className="font-black text-on-surface">Cần chuyển khoản</span>
              <span className="text-base font-black text-primary">
                {formatVND(qrAmount)}
              </span>
            </div>
          </>
        ) : (
          <div className="flex justify-between">
            <span className="font-black text-on-surface">Cần thanh toán</span>
            <span className="text-base font-black text-primary">
              {formatVND(totalPrice)}
            </span>
          </div>
        )}
      </div>

      {/* Bank info rows */}
      {bankMethod && (
        <div className="space-y-3 rounded-2xl bg-surface-container px-4 py-3">
          <div className="space-y-2">
            {/* Bank name */}
            <div className="flex items-center justify-between">
              <div className="flex flex-1 flex-col rounded-xl bg-surface px-3 py-2">
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-outline">
                  Ngân hàng
                </p>
                <p className="text-sm font-bold uppercase text-on-surface">
                  {bankMethod.platform_name}
                </p>
              </div>
            </div>

            {/* Account number + account name side by side */}
            <div className="flex gap-2">
              <div className="flex flex-1 items-center justify-between rounded-xl bg-surface px-3 py-2">
                <div>
                  <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-outline">
                    Số tài khoản
                  </p>
                  <p className="text-sm font-black tracking-wider text-on-surface">
                    {bankMethod.account_number}
                  </p>
                </div>
                <CopyButton
                  value={bankMethod.account_number}
                  label="số tài khoản"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex flex-1 items-center justify-between rounded-xl bg-surface px-3 py-2">
                <div>
                  <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-outline">
                    Chủ tài khoản
                  </p>
                  <p className="text-sm font-black text-on-surface">
                    {bankMethod.account_name}
                  </p>
                </div>
                <CopyButton
                  value={bankMethod.account_name}
                  label="chủ tài khoản"
                />
              </div>
            </div>

            {/* Transfer content */}
            <div className="flex items-center justify-between rounded-xl bg-surface px-3 py-2">
              <div>
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-outline">
                  Nội dung chuyển khoản
                </p>
                <p className="text-sm font-black tracking-wider text-primary">
                  {orderNumber}
                </p>
              </div>
              <CopyButton value={orderNumber} label="nội dung chuyển khoản" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
