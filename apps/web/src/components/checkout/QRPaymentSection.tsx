"use client";
import type { PaymentInformation } from "@/lib/payment-information";
import { OrderPaymentInstructions } from "@/modules/payments/ui/OrderPaymentInstructions";

interface Props {
  bankMethod: PaymentInformation | null; totalPrice: number;
  orderNumber: string | null; subtotal: number; shippingCost: number;
  voucherDiscount?: number; shippingDiscount?: number; totalLabel?: string;
  paymentType?: "full" | "deposit_cod"; depositAmount?: number;
  remainingAmount?: number; depositPercentage?: number; shippingFeePending?: boolean;
}

export function QRPaymentSection({ orderNumber }: Props) {
  return orderNumber ? <OrderPaymentInstructions identifier={orderNumber} /> :
    <p className="alert alert-warning">Chưa có mã đơn hàng để tải thông tin thanh toán.</p>;
}
