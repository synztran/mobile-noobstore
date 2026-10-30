"use client";
import { OrderPaymentInstructions } from "@/modules/payments/ui/OrderPaymentInstructions";

// Preserve the caller contract; payment amounts now come only from the server.
interface Props {
  orderNumber: string; totalPrice: number; shippingFee: number;
  shippingMethodId?: string | null; voucherDiscount?: number;
  shippingDiscount?: number; paymentType?: "full" | "deposit_cod";
  depositAmount?: number; remainingAmount?: number; depositPercentage?: number;
  depositPaid?: boolean;
}

export function OrderPaymentPanel({ orderNumber }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
        Thông tin thanh toán
      </p>
      <OrderPaymentInstructions identifier={orderNumber} />
    </div>
  );
}
