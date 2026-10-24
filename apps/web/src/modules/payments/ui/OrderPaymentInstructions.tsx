"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { formatVND } from "@/lib/currency";

interface Details {
  orderNumber: string; total: number; received: number; amountDue: number;
  balanceDue: number; active: boolean; qrUrl: string | null;
  shippingFee: number; voucherDiscount: number; shippingDiscount: number;
  shippingFeePending: boolean;
  bank: { platform_name: string; account_number: string; account_name: string } | null;
}

export function OrderPaymentInstructions({ identifier }: { identifier: string }) {
  const [imageError, setImageError] = useState(false);
  const query = useQuery<Details>({
    queryKey: ["verified-payment-details", identifier],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${encodeURIComponent(identifier)}/payment`, { cache: "no-store" });
      if (!response.ok) throw new Error("Không thể tải thông tin thanh toán");
      return response.json();
    },
    refetchInterval: 15000,
    staleTime: 0,
  });
  if (query.isPending) return <div aria-label="Đang tải thông tin thanh toán" className="skeleton h-64 w-full" />;
  // Never keep rendering stale bank details following an authorization/network error.
  if (query.isError) return <div className="alert alert-warning flex-col items-start" role="alert">
    <p>Chưa tải được thông tin thanh toán. Vui lòng thử lại trước khi chuyển tiền.</p>
    <button type="button" className="btn btn-sm" onClick={() => query.refetch()}>Thử lại</button>
  </div>;
  const details = query.data;
  if (!details.active) return <p>Đơn hàng hiện không nhận thanh toán.</p>;
  if (details.balanceDue <= 0) return <p className="alert alert-success">Cửa hàng đã ghi nhận thanh toán đủ.</p>;
  return <section className="space-y-4" aria-label="Thông tin chuyển khoản đã xác thực">
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between gap-3"><dt>Tổng đơn hàng</dt><dd>{formatVND(details.total)}</dd></div>
      <div className="flex justify-between gap-3"><dt>Phí vận chuyển</dt><dd>{details.shippingFeePending ? "Cập nhật sau" : formatVND(details.shippingFee)}</dd></div>
      {details.voucherDiscount > 0 && <div className="flex justify-between gap-3"><dt>Giảm giá voucher</dt><dd>{formatVND(details.voucherDiscount)}</dd></div>}
      {details.shippingDiscount > 0 && <div className="flex justify-between gap-3"><dt>Trợ giá vận chuyển</dt><dd>{formatVND(details.shippingDiscount)}</dd></div>}
    </dl>
    <p className="text-center font-semibold">Số tiền cần chuyển: {formatVND(details.amountDue)}</p>
    {details.qrUrl && !imageError ? (
      // Authenticated same-origin image: do not send through Next image optimizer.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`${details.qrUrl}?balance=${details.amountDue}`} alt={`Mã QR thanh toán đơn ${details.orderNumber}`}
        width={280} height={280} className="mx-auto max-w-full rounded-xl bg-white p-3"
        onError={() => setImageError(true)} />
    ) : <p className="text-sm">QR chưa khả dụng. Chuyển khoản theo thông tin ngân hàng bên dưới.</p>}
    {details.bank ? <dl className="space-y-2 break-words text-sm">
      <div><dt>Ngân hàng</dt><dd className="font-semibold">{details.bank.platform_name}</dd></div>
      <div><dt>Chủ tài khoản</dt><dd className="font-semibold">{details.bank.account_name}</dd></div>
      <div><dt>Số tài khoản</dt><dd className="select-all font-semibold">{details.bank.account_number}</dd></div>
      <div><dt>Nội dung chuyển khoản</dt><dd className="select-all font-semibold">{details.orderNumber}</dd></div>
    </dl> : <p className="alert alert-warning">Chưa có thông tin ngân hàng. Vui lòng liên hệ cửa hàng trước khi chuyển tiền.</p>}
    <p className="alert alert-warning text-sm">Kiểm tra đúng tên người nhận, số tài khoản và số tiền trong app ngân hàng trước khi xác nhận. Ảnh chuyển khoản không thay thế xác minh tiền vào tài khoản cửa hàng.</p>
    <p className="text-sm">Đã ghi nhận: {formatVND(details.received)} · Còn lại toàn đơn: {formatVND(details.balanceDue)}</p>
  </section>;
}
