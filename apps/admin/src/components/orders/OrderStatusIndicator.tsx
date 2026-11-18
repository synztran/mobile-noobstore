import { CheckCircle2, Circle, Clock, FileText, RotateCcw, XCircle } from "lucide-react";

import {
  getPaymentState,
  type PaymentState,
} from "@/lib/order-status";

interface Props {
  status: string;
  paidAt: string | null;
  refundedAt: string | null;
  paymentType?: "full" | "deposit_cod";
  depositPaidAt?: string | null;
  invoiceUrl?: string | null;
}

const STATUS_BADGES: Record<
  string,
  { label: string; classes: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Pending",
    classes: "bg-yellow-50 border-yellow-200 text-yellow-700",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  confirmed: {
    label: "Confirmed",
    classes: "bg-blue-50 border-blue-200 text-blue-700",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  first_paid: {
    label: "First Paid",
    classes: "bg-cyan-50 border-cyan-200 text-cyan-700",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  second_paid: {
    label: "Second Paid",
    classes: "bg-blue-50 border-blue-200 text-blue-700",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  delivering: {
    label: "Delivering",
    classes: "bg-purple-50 border-purple-200 text-purple-700",
    icon: <Circle className="h-3.5 w-3.5" />,
  },
  delivered: {
    label: "Delivered",
    classes: "bg-green-50 border-green-200 text-green-700",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  returning: {
    label: "Returning",
    classes: "bg-amber-50 border-amber-300 text-amber-700",
    icon: <RotateCcw className="h-3.5 w-3.5" />,
  },
  cancelled: {
    label: "Cancelled",
    classes: "bg-red-50 border-red-200 text-red-700",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  refunded: {
    label: "Refunded",
    classes: "bg-orange-50 border-orange-200 text-orange-700",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

/**
 * Presentation only. The precedence that decides WHICH state an order is in
 * lives in getPaymentState() so the orders list column and this modal cannot
 * drift into disagreeing about the same order.
 */
const PAYMENT_BADGES: Record<
  PaymentState,
  { label: string; classes: string; icon?: React.ReactNode }
> = {
  refunded: {
    label: "Refunded",
    classes: "text-orange-600 bg-orange-50 border-orange-200",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  paid: {
    label: "Paid",
    classes: "text-green-600 bg-green-50 border-green-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  deposit_paid: {
    label: "Deposit Paid",
    classes: "text-green-600 bg-green-50 border-green-200",
  },
  awaiting_deposit: {
    label: "Awaiting Deposit",
    classes: "text-amber-500 bg-amber-50 border-amber-200",
  },
  unpaid: {
    label: "Unpaid",
    classes: "text-slate-500 bg-slate-50 border-slate-200",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
};

export default function OrderStatusIndicator({
  status,
  paidAt,
  refundedAt,
  paymentType,
  depositPaidAt,
  invoiceUrl,
}: Props) {
  const badge = STATUS_BADGES[status];
  const payment = PAYMENT_BADGES[
    getPaymentState({ paymentType, paidAt, refundedAt, depositPaidAt })
  ];
  const invoiceGenerated = Boolean(invoiceUrl);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Circle className="h-4 w-4" />
        Status
      </div>
      <div className="flex flex-wrap items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-right text-xs text-slate-400">
            Order:
          </span>
          {badge ? (
            <span
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold ${badge.classes}`}
            >
              {badge.icon}
              {badge.label}
            </span>
          ) : (
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs capitalize text-slate-600">
              {status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-right text-xs text-slate-400">
            Payment:
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold ${payment.classes}`}
          >
            {payment.icon}
            {payment.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-right text-xs text-slate-400">
            Invoice:
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
              invoiceGenerated
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-slate-200 bg-slate-50 text-slate-500"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            {invoiceGenerated ? "Generated" : "Not yet"}
          </span>
        </div>
      </div>
    </div>
  );
}
