import {
  BanknoteIcon,
  CircleDashed,
  Coins,
  PackageCheck,
  RotateCcw,
  Truck,
  XCircle,
} from "lucide-react";

interface TimelineEntry {
  key: string;
  label: string;
  timestamp: string | null;
  note?: string | null;
  icon: React.ReactNode;
  color: string; // tailwind border/text color token
  bg: string;
}

interface Props {
  createdAt: string | null;
  paidAt: string | null;
  deliveringAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelledNote: string | null;
  refundedAt: string | null;
  returningAt?: string | null;
  status: string;
  updatedAt: string | null;
  depositPaidAt?: string | null;
  paymentType?: "full" | "deposit_cod";
  isPickup?: boolean;
}

function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString("vi-VN");
}

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderTimeline({
  createdAt,
  paidAt,
  deliveringAt,
  deliveredAt,
  cancelledAt,
  cancelledNote,
  refundedAt,
  returningAt,
  status,
  updatedAt,
  depositPaidAt,
  paymentType,
  isPickup,
}: Props) {
  const entries: TimelineEntry[] = [
    {
      key: "placed",
      label: "Order placed",
      timestamp: createdAt,
      icon: <CircleDashed className="h-4 w-4" />,
      color: "border-slate-300 text-slate-600",
      bg: "bg-slate-50",
    },
    ...(paymentType === "deposit_cod"
      ? [
          {
            key: "first_paid" as const,
            label: "1st payment (deposit)",
            timestamp: depositPaidAt ?? null,
            icon: <Coins className="h-4 w-4" />,
            color: "border-green-200 text-green-600",
            bg: "bg-green-100",
          },
          {
            key: "second_paid" as const,
            label: "2nd payment (balance)",
            timestamp: paidAt ?? null,
            icon: <BanknoteIcon className="h-4 w-4" />,
            color: "border-green-300 text-green-700",
            bg: "bg-green-50",
          },
        ]
      : [
          {
            key: "paid" as const,
            label: "Payment confirmed",
            timestamp: paidAt,
            icon: <BanknoteIcon className="h-4 w-4" />,
            color: "border-green-300 text-green-700",
            bg: "bg-green-50",
          },
        ]),
    ...(isPickup
      ? []
      : [
          {
            key: "delivering" as const,
            label: "Out for delivery",
            timestamp:
              deliveringAt ??
              (status === "delivering" || status === "delivered"
                ? updatedAt
                : null),
            icon: <Truck className="h-4 w-4" />,
            color: "border-purple-300 text-purple-700",
            bg: "bg-purple-50",
          },
        ]),
    {
      key: "delivered",
      label: "Delivered",
      timestamp: deliveredAt ?? (status === "delivered" ? updatedAt : null),
      icon: <PackageCheck className="h-4 w-4" />,
      color: "border-green-400 text-green-800",
      bg: "bg-green-50",
    },
    {
      key: "returning",
      label: "Returning requested",
      timestamp: returningAt ?? null,
      icon: <RotateCcw className="h-4 w-4" />,
      color: "border-amber-300 text-amber-700",
      bg: "bg-amber-50",
    },
    {
      key: "cancelled",
      label: "Cancelled",
      timestamp: cancelledAt,
      note: cancelledNote,
      icon: <XCircle className="h-4 w-4" />,
      color: "border-red-300 text-red-700",
      bg: "bg-red-50",
    },
    {
      key: "refunded",
      label: "Refunded",
      timestamp: refundedAt,
      icon: <RotateCcw className="h-4 w-4" />,
      color: "border-orange-300 text-orange-700",
      bg: "bg-orange-50",
    },
  ];

  const active = entries.filter((e) => e.timestamp);

  if (active.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
        Order History
      </h3>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute bottom-2 left-[15px] top-2 w-px bg-slate-200" />

        <div className="space-y-2">
          {active.map((entry) => (
            <div key={entry.key} className="flex items-center gap-3">
              {/* Icon bubble */}
              <div
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border ${entry.bg} ${entry.color} shrink-0`}
              >
                {entry.icon}
              </div>

              {/* Content */}
              <div
                className={`flex-1 rounded-lg border px-3 py-2 ${entry.bg} ${entry.color.replace("text-", "border-")}`}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span
                    className={`text-sm font-medium ${entry.color.split(" ")[1]}`}
                  >
                    {entry.label}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-xs text-slate-600">
                      {fmtTime(entry.timestamp!)}
                    </span>
                    <span className="text-xs text-slate-600">
                      {fmtDate(entry.timestamp!)}
                    </span>
                  </div>
                </div>
                {entry.note && (
                  <p className="mt-0.5 text-xs italic text-slate-500">
                    Reason: {entry.note}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
