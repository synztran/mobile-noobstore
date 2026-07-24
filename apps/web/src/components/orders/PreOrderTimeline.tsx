"use client";

import { Check } from "lucide-react";

const PRE_ORDER_STEPS = [
  { key: "paid", label: "Thanh toán" },
  { key: "placed", label: "Đặt hàng" },
  { key: "international_shipping", label: "Vận chuyển quốc tế" },
  { key: "customs", label: "Hải quan" },
  { key: "local_delivering", label: "Vận chuyển nội địa" },
  { key: "ready", label: "Sẵn sàng tại shop" },
] as const;

function getCollectiveStepIndex(
  items: { preOrderTracking: unknown }[]
): number {
  let min = Infinity;
  for (const item of items) {
    const t = item.preOrderTracking as
      | { current_step?: string }
      | undefined
      | null;
    const idx = PRE_ORDER_STEPS.findIndex((s) => s.key === t?.current_step);
    if (idx >= 0 && idx < min) min = idx;
  }
  return min === Infinity ? -1 : min;
}

interface Props {
  items: { preOrderTracking: unknown }[];
}

export default function PreOrderTimeline({ items }: Props) {
  const collectiveIdx = getCollectiveStepIndex(items);

  return (
    <div className="space-y-3 rounded-2xl bg-violet-50 px-4 py-4">
      <p className="text-xs font-black uppercase tracking-widest text-violet-700">
        Trạng thái đơn hàng Pre-order
      </p>
      <div className="space-y-2">
        {PRE_ORDER_STEPS.map((step, i) => {
          const done = collectiveIdx >= 0 && i < collectiveIdx;
          const active =
            i === collectiveIdx || (collectiveIdx < 0 && i === 0);
          return (
            <div key={step.key} className="flex items-center gap-2">
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                  done
                    ? "bg-violet-500 text-white"
                    : active
                      ? "border-2 border-violet-500 bg-violet-100 text-violet-700"
                      : "border-2 border-slate-300 bg-white text-slate-400"
                }`}
              >
                {done ? (
                  <Check className="h-3 w-3" />
                ) : active ? (
                  <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-sm leading-tight ${
                  done
                    ? "font-medium text-violet-700"
                    : active
                      ? "font-semibold text-violet-900"
                      : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
