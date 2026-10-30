"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { formatVND } from "@/lib/currency";
import { toast } from "@/lib/toast";
import AdaptiveImage from "@/components/ui/AdaptiveImage";
import { Check, Copy } from "lucide-react";

interface Details {
  orderId: string;
  orderNumber: string;
  total: number;
  subtotal: number;
  received: number;
  amountDue: number;
  balanceDue: number;
  active: boolean;
  qrUrl: string | null;
  shippingFee: number;
  shippingFeePending: boolean;
  voucherDiscount: number;
  shippingDiscount: number;
  paymentType: "full" | "deposit_cod";
  depositAmount: number;
  remainingAmount: number;
  depositPercentage: number;
  depositPaid: boolean;
  bank: {
    platform_name: string;
    account_number: string;
    account_name: string;
    bank_logo_url?: string | null;
  } | null;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      toast.success(`${label} đã sao chép!`);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      type="button"
      aria-label={`Sao chép ${label}`}
      onClick={handleCopy}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container transition-transform hover:bg-surface-container-high active:scale-90"
    >
      {copied ? (
        <Check className="h-4 w-4 text-secondary" />
      ) : (
        <Copy className="h-4 w-4 text-primary" />
      )}
    </button>
  );
}

export function OrderPaymentInstructions({ identifier }: { identifier: string }) {
  const [imageError, setImageError] = useState(false);

  const query = useQuery<Details>({
    queryKey: ["verified-payment-details", identifier],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${encodeURIComponent(identifier)}/payment`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Không thể tải thông tin thanh toán");
      return response.json();
    },
    refetchInterval: 15000,
    staleTime: 0,
  });

  if (query.isPending) {
    return (
      <div aria-label="Đang tải thông tin thanh toán" className="space-y-4 animate-pulse">
        <div className="h-64 w-full rounded-2xl bg-surface-container" />
        <div className="h-40 w-full rounded-2xl bg-surface-container" />
      </div>
    );
  }

  // Never keep rendering stale bank details following an authorization/network error.
  if (query.isError) {
    return (
      <div className="alert alert-warning flex-col items-start" role="alert">
        <p>Chưa tải được thông tin thanh toán. Vui lòng thử lại trước khi chuyển tiền.</p>
        <button type="button" className="btn btn-sm" onClick={() => query.refetch()}>
          Thử lại
        </button>
      </div>
    );
  }

  const details = query.data;

  if (!details.active) {
    return (
      <div className="rounded-2xl bg-surface-container p-4 text-center">
        <p className="text-sm font-semibold text-on-surface-variant">
          Đơn hàng hiện không nhận thanh toán.
        </p>
      </div>
    );
  }

  if (details.balanceDue <= 0) {
    return (
      <div className="alert alert-success">
        <p>Cửa hàng đã ghi nhận thanh toán đủ.</p>
      </div>
    );
  }

  return (
    <section className="space-y-4" aria-label="Thông tin chuyển khoản đã xác thực">
      {/* Deposit callout */}
      {details.paymentType === "deposit_cod" && !details.depositPaid && (
        <div className="rounded-2xl border border-amber-200 bg-amber-100 p-3">
          <p className="text-xs font-bold text-amber-800">Thanh toán đặt cọc</p>
          <p className="text-xs leading-relaxed text-amber-700">
            Đơn hàng đặt cọc {details.depositPercentage}% ({formatVND(details.depositAmount)}). Vui lòng chuyển khoản đủ số tiền đặt cọc. Số còn lại ({formatVND(details.remainingAmount)}) sẽ thanh toán khi nhận hàng.
          </p>
        </div>
      )}

      {/* QR Code & Amount Breakdown Card */}
      <div className="relative flex flex-col items-center overflow-hidden rounded-2xl bg-surface-container-low p-4 shadow-ambient">
        {details.bank && details.qrUrl && !imageError ? (
          <div className="relative z-10 mb-2 flex h-64 w-full items-center justify-center rounded-2xl border border-outline-variant/30 bg-white p-4">
            <div className="relative h-full w-full">
              <AdaptiveImage
                src={`${details.qrUrl}?balance=${details.amountDue}`}
                alt={`Mã QR thanh toán đơn ${details.orderNumber}`}
                fill
                sizes="280px"
                className="object-contain"
                unoptimized
                onError={() => setImageError(true)}
              />
            </div>
          </div>
        ) : (
          <div className="relative z-10 mb-2 flex h-64 w-full items-center justify-center rounded-2xl bg-surface-container">
            <p className="px-6 text-center text-sm font-semibold text-on-surface-variant">
              {details.bank
                ? "Nếu QR không khả dụng, vui lòng chuyển khoản theo thông tin bên dưới."
                : "Chưa có cấu hình thanh toán ngân hàng."}
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
            <span className="font-bold text-on-surface">{formatVND(details.subtotal)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-on-surface-variant">Phí vận chuyển</span>
            <span
              className={`text-xs font-bold ${
                details.shippingFee === 0 && details.shippingFeePending
                  ? "text-emerald-600"
                  : "text-on-surface-variant"
              }`}
            >
              {details.shippingFeePending
                ? "Cập nhật sau"
                : details.shippingFee === 0
                  ? "Miễn phí"
                  : formatVND(details.shippingFee)}
            </span>
          </div>

          {details.voucherDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Giảm giá voucher</span>
              <span className="font-bold text-green-600">
                -{formatVND(details.voucherDiscount)}
              </span>
            </div>
          )}

          {details.shippingDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Giảm phí vận chuyển</span>
              <span className="font-bold text-secondary">
                -{formatVND(details.shippingDiscount)}
              </span>
            </div>
          )}

          <div className="h-px bg-outline-variant/30" />

          {details.paymentType === "deposit_cod" ? (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">
                  Đặt cọc ({details.depositPercentage}%)
                </span>
                <span className="font-bold text-primary">
                  {details.depositPaid ? "Đã thanh toán" : formatVND(details.depositAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Còn lại (COD)</span>
                <span className="font-bold text-secondary">
                  {formatVND(details.remainingAmount)}
                </span>
              </div>
              <div className="h-px bg-outline-variant/30" />
              <div className="flex justify-between">
                <span className="font-black text-on-surface">
                  {details.depositPaid
                    ? "Còn cần chuyển khoản (lần 2)"
                    : "Cần chuyển khoản (đặt cọc)"}
                </span>
                <span className="text-lg font-black text-primary">
                  {formatVND(details.amountDue)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex justify-between">
              <span className="font-black text-on-surface">Tổng cộng</span>
              <span className="text-lg font-black text-primary">
                {formatVND(details.amountDue > 0 ? details.amountDue : details.total)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bank Transfer Information */}
      {details.bank && (
        <div className="flex flex-wrap gap-3 rounded-2xl bg-surface-container p-4">
          {/* Bank name */}
          <div className="flex w-full items-center justify-between rounded-xl">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-outline">
                Ngân hàng
              </p>
              <div className="flex items-center gap-2 text-base font-bold text-on-surface">
                {details.bank.bank_logo_url ? (
                  <AdaptiveImage
                    src={details.bank.bank_logo_url}
                    alt="bank logo"
                    width={120}
                    height={60}
                    className="object-contain"
                  />
                ) : null}
                {/* <span>{details.bank.platform_name}</span> */}
              </div>
            </div>
          </div>

          {/* Account number */}
          <div className="flex w-[calc(50%-0.375rem)] items-center justify-between rounded-xl">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-outline">
                Số tài khoản
              </p>
              <div className="text-base font-bold text-on-surface">
                {details.bank.account_number}
              </div>
            </div>
            <CopyButton value={details.bank.account_number} label="Số tài khoản" />
          </div>

          {/* Account name */}
          <div className="flex w-[calc(50%-0.375rem)] items-center justify-between rounded-xl">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-outline">
                Chủ tài khoản
              </p>
              <div className="text-base font-bold text-on-surface">
                {details.bank.account_name}
              </div>
            </div>
            <CopyButton value={details.bank.account_name} label="Chủ tài khoản" />
          </div>

          {/* Transfer content / reference */}
          <div className="flex max-w-max items-center justify-between rounded-xl">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-outline">
                Nội dung chuyển khoản
              </p>
              <div className="text-base font-bold text-primary">
                {details.orderNumber}
              </div>
            </div>
            <CopyButton value={details.orderNumber} label="Nội dung chuyển khoản" />
          </div>
        </div>
      )}

      {/* Security alert & verification notice */}
      <div className="space-y-1">
        <p className="rounded-xl bg-surface-container-low px-4 py-2 text-center text-xs text-on-surface-variant">
          Kiểm tra đúng tên người nhận, số tài khoản và số tiền trong app ngân hàng trước khi xác nhận.
        </p>
        {details.received > 0 && (
          <p className="text-center text-xs text-on-surface-variant">
            Đã ghi nhận: {formatVND(details.received)} · Còn lại toàn đơn: {formatVND(details.balanceDue)}
          </p>
        )}
      </div>
    </section>
  );
}
