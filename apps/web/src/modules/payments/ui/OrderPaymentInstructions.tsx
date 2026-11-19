"use client";

import { apiFetch } from "@/lib/api/fetch";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { formatVND } from "@/lib/currency";
import { toast } from "@/lib/toast";
import AdaptiveImage from "@/components/ui/AdaptiveImage";
import { AlertCircle, Check, Copy, QrCode, ShieldCheck, Sparkles } from "lucide-react";

interface Details {
  orderId: string;
  orderNumber: string;
  status: string;
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

function CopyButton({
  value,
  label,
  variant = "icon",
}: {
  value: string;
  label: string;
  variant?: "icon" | "button";
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      toast.success(`${label} đã sao chép!`);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={handleCopy}
        className="btn btn-primary btn-xs h-7 min-h-[28px] rounded-lg px-2.5 text-[10px] font-black uppercase tracking-wider text-surface shadow-xs transition-transform active:scale-95"
      >
        {copied ? (
          <>
            <Check size={12} className="stroke-[3]" />
            Đã chép
          </>
        ) : (
          "Sao chép"
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={`Sao chép ${label}`}
      onClick={handleCopy}
      className="grid h-7 w-7 place-items-center rounded-lg border border-outline-variant/30 bg-surface-container text-on-surface-variant transition-colors hover:border-primary hover:text-primary active:scale-90"
    >
      {copied ? (
        <Check size={13} className="text-emerald-700 stroke-[3]" />
      ) : (
        <Copy size={13} />
      )}
    </button>
  );
}

export function OrderPaymentInstructions({
  identifier,
}: {
  identifier: string;
}) {
  const [imageError, setImageError] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 mins countdown

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const query = useQuery<Details>({
    queryKey: ["verified-payment-details", identifier],
    queryFn: async () => {
      const response = await apiFetch(
        `/api/orders/${encodeURIComponent(identifier)}/payment`,
        {
          cache: "no-store",
        }
      );
      if (!response.ok) throw new Error("Không thể tải thông tin thanh toán");
      return response.json();
    },
    refetchInterval: 15000,
    staleTime: 0,
  });

  if (query.isPending) {
    return (
      <div
        aria-label="Đang tải thông tin thanh toán"
        className="animate-pulse space-y-4"
      >
        <div className="h-64 w-full rounded-2xl bg-surface-container" />
        <div className="h-40 w-full rounded-2xl bg-surface-container" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="alert alert-warning flex-col items-start rounded-2xl" role="alert">
        <p className="text-xs font-semibold">
          Chưa tải được thông tin thanh toán. Vui lòng thử lại trước khi chuyển tiền.
        </p>
        <button
          type="button"
          className="btn btn-sm mt-2 rounded-xl"
          onClick={() => query.refetch()}
        >
          Thử lại
        </button>
      </div>
    );
  }

  const details = query.data;

  if (details.balanceDue <= 0 && details.active) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
        <p className="text-sm font-bold text-green-900 dark:text-green-900">
          ✓ Đơn hàng đã được ghi nhận thanh toán đầy đủ.
        </p>
      </div>
    );
  }

  const isDeposit = details.paymentType === "deposit_cod";
  const isAwaitingSecondPayment = isDeposit && details.depositPaid;
  const effectiveAmount = isAwaitingSecondPayment
    ? details.remainingAmount
    : details.amountDue > 0
      ? details.amountDue
      : details.depositAmount > 0
        ? details.depositAmount
        : details.balanceDue > 0
          ? details.balanceDue
          : details.total;
  const remainingPercentage = Math.max(0, 100 - details.depositPercentage);

  const qrImageUrl = details.bank
    ? details.qrUrl
      ? `${details.qrUrl}?balance=${effectiveAmount}`
      : `https://img.vietqr.io/image/${details.bank.platform_name.toLowerCase().replace(/\s+/g, "")}-${details.bank.account_number}-compact2.png?amount=${effectiveAmount}&addInfo=${encodeURIComponent(details.orderNumber)}&accountName=${encodeURIComponent(details.bank.account_name)}`
    : null;

  return (
    <div className="rounded-2xl border border-outline-variant/20 bg-surface p-5 shadow-ambient-sm md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/15 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
            <QrCode size={18} className="stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-on-surface sm:text-base">
              Quét mã QR Banking thanh toán tự động
            </h3>
            <p className="text-[11px] text-on-surface-variant">
              Mở ứng dụng ngân hàng bất kỳ để quét mã thanh toán tức thì
            </p>
          </div>
        </div>
        {!details.active ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-900">
            Đơn hàng đã hủy (Thông tin lưu trữ)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Khớp đơn tự động 24/7
          </span>
        )}
      </div>

      {/* Main Grid: QR Left + Bank Details Right */}
      <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
        {/* Left: QR Code Box */}
        <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-outline-variant/25 bg-surface-container-low/50 p-4">
          <div className="relative flex h-48 w-48 items-center justify-center overflow-hidden rounded-xl border border-outline-variant/30 bg-white p-2 shadow-xs sm:h-52 sm:w-52">
            {qrImageUrl && !imageError ? (
              <AdaptiveImage
                src={qrImageUrl}
                alt={`Mã QR thanh toán đơn ${details.orderNumber}`}
                fill
                sizes="220px"
                className="object-contain"
                unoptimized
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="p-4 text-center text-xs text-on-surface-variant">
                Mã QR không khả dụng. Vui lòng chuyển khoản thủ công theo thông tin bên cạnh.
              </div>
            )}
          </div>
          {(!isDeposit || !details.depositPaid) && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <span>⏳ Giữ hàng & mã QR:</span>
              <span className="font-mono font-black">{formatCountdown(timeLeft)}</span>
            </div>
          )}
        </div>

        {/* Right: Bank Details Table */}
        <div className="space-y-2.5">
          {/* Amount Due Row */}
          <div className="flex items-center justify-between rounded-xl bg-surface-container/40 px-3.5 py-2.5">
            <span className="text-xs text-on-surface-variant">
              {isAwaitingSecondPayment
                ? `Số tiền còn lại (${remainingPercentage}%):`
                : isDeposit
                  ? `Số tiền đặt cọc (${details.depositPercentage}%):`
                  : "Số tiền cần thanh toán:"}
            </span>
            <span className="text-base font-black text-primary">
              {formatVND(effectiveAmount)}
            </span>
          </div>

          {/* Remaining COD if deposit */}
          {isDeposit && !details.depositPaid && details.remainingAmount > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-surface-container/20 px-3.5 py-2 text-xs">
              <span className="text-on-surface-variant">Còn lại thanh toán COD khi nhận:</span>
              <span className="font-bold text-on-surface">
                {formatVND(details.remainingAmount)}
              </span>
            </div>
          )}

          {/* Bank Platform */}
          {details.bank && (
            <>
              <div className="flex items-center justify-between rounded-xl bg-surface-container/40 px-3.5 py-2.5">
                <span className="text-xs text-on-surface-variant">Ngân hàng thụ hưởng:</span>
                <div className="flex min-w-0 items-center gap-2">
                  {details.bank.bank_logo_url ? (
                    <div className="relative h-7 w-24 shrink-0">
                      <AdaptiveImage
                        src={details.bank.bank_logo_url}
                        alt={details.bank.platform_name}
                        fill
                        sizes="96px"
                        className="object-contain object-right"
                      />
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-on-surface">
                      {details.bank.platform_name || "Ngân hàng"}
                    </span>
                  )}
                </div>
              </div>

              {/* Account Number */}
              <div className="flex items-center justify-between rounded-xl bg-surface-container/40 px-3.5 py-2.5">
                <span className="text-xs text-on-surface-variant">Số tài khoản:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-black text-on-surface">
                    {details.bank.account_number}
                  </span>
                  <CopyButton
                    value={details.bank.account_number}
                    label="Số tài khoản"
                  />
                </div>
              </div>

              {/* Account Name */}
              <div className="flex items-center justify-between rounded-xl bg-surface-container/40 px-3.5 py-2.5">
                <span className="text-xs text-on-surface-variant">Chủ tài khoản:</span>
                <span className="text-xs font-bold uppercase text-on-surface">
                  {details.bank.account_name}
                </span>
              </div>

              {/* Transfer Content (Crucial) */}
              <div className="flex items-center justify-between rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3.5 py-2.5">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-primary">
                    Nội dung chuyển khoản (bắt buộc)
                  </p>
                  <p className="font-mono text-sm font-black text-on-surface">
                    {details.orderNumber}
                  </p>
                </div>
                <CopyButton
                  value={details.orderNumber}
                  label="Nội dung chuyển khoản"
                  variant="button"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Auto-Listen Status Banner */}
      {!details.active ? (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-amber-950">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-800" />
          <p className="text-xs font-medium leading-relaxed text-amber-950">
            <strong className="font-bold text-amber-950">Lưu ý:</strong> Đơn hàng hiện không ở trạng thái chờ thanh toán (đã hủy hoặc hết hạn). Thông tin tài khoản và mã QR Banking được lưu lại để đối soát.
          </p>
        </div>
      ) : (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <div className="h-4 w-4 shrink-0 rounded-full border-2 border-emerald-700 border-t-transparent animate-spin" />
          <p className="text-xs leading-relaxed text-emerald-950">
            <strong className="font-bold">Đang chờ tín hiệu chuyển khoản:</strong> Trang sẽ tự động hoàn tất và gửi thông báo ngay khi hệ thống ngân hàng ghi nhận giao dịch (thường từ 5–15 giây).
          </p>
        </div>
      )}
    </div>
  );
}
