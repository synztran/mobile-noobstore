import { CheckCircle2, Circle, Clock, XCircle } from "lucide-react";

interface Props {
  status: string;
  paidAt: string | null;
  refundedAt: string | null;
  paymentType?: "full" | "deposit_cod";
  depositPaidAt?: string | null;
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

function getPaymentStatus(paidAt: string | null, refundedAt: string | null, depositPaidAt?: string | null, paymentType?: string) {
  if (refundedAt)
    return {
      label: "Refunded",
      color: "text-orange-600 bg-orange-50 border-orange-200",
    };
  if (paidAt)
    return {
      label: "Paid",
      color: "text-green-600 bg-green-50 border-green-200",
    };
  if (paymentType === "deposit_cod" && depositPaidAt)
    return {
      label: "Deposit Paid",
      color: "text-amber-600 bg-amber-50 border-amber-200",
    };
  if (paymentType === "deposit_cod")
    return {
      label: "Awaiting Deposit",
      color: "text-amber-500 bg-amber-50 border-amber-200",
    };
  return {
    label: "Unpaid",
    color: "text-slate-500 bg-slate-50 border-slate-200",
  };
}

export default function OrderStatusIndicator({
  status,
  paidAt,
  refundedAt,
  paymentType,
  depositPaidAt,
}: Props) {
  const badge = STATUS_BADGES[status];
  const payment = getPaymentStatus(paidAt, refundedAt, depositPaidAt, paymentType);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Circle className="h-4 w-4" />
        Status
      </div>
      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Order:</span>
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
          <span className="text-xs text-slate-400">Payment:</span>
          <span
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold ${payment.color}`}
          >
            {payment.label === "Paid" && (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            {payment.label === "Unpaid" && <Clock className="h-3.5 w-3.5" />}
            {payment.label === "Refunded" && (
              <XCircle className="h-3.5 w-3.5" />
            )}
            {payment.label}
          </span>
        </div>
      </div>
    </div>
  );
}
