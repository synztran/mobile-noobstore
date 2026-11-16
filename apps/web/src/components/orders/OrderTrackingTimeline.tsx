"use client";

import type { OrderDetail } from "@/app/api/user/orders/[id]/route";
import { isPickupShippingMethod } from "@/lib/shipping-method";
import {
  Check,
  CircleX,
  Package,
  PackageCheck,
  Plane,
  Receipt,
  ShieldCheck,
  Store,
  Truck,
  type LucideIcon,
} from "lucide-react";

type Tone = "brand" | "violet";
type StepState = "done" | "active" | "pending" | "error";

interface StepModel {
  key: string;
  label: string;
  description: string;
  state: StepState;
  icon: LucideIcon;
  timestamp?: string | null;
  meta?: string | null;
  loading?: boolean;
}

const PRE_ORDER_STEPS = [
  {
    key: "paid",
    label: "Thanh toán",
    description: "Đơn hàng đã được thanh toán",
    icon: Receipt,
  },
  {
    key: "placed",
    label: "Đặt hàng",
    description: "Đơn hàng của bạn đã được tiếp nhận",
    icon: Package,
  },
  {
    key: "international_shipping",
    label: "Vận chuyển quốc tế",
    description: "Kiện hàng đang trên đường về Việt Nam",
    icon: Plane,
  },
  {
    key: "customs",
    label: "Hải quan",
    description: "Kiện hàng đang được thông quan",
    icon: ShieldCheck,
  },
  {
    key: "local_delivering",
    label: "Vận chuyển nội địa",
    description: "Kiện hàng đang được vận chuyển trong nước",
    icon: Truck,
  },
  {
    key: "ready",
    label: "Sẵn sàng tại shop",
    description: "Kiện hàng đã về shop, chờ bạn đến nhận",
    icon: Store,
  },
] as const;

const WAITING_PAYMENT_STEP = {
  key: "waiting_payment",
  label: "Chờ thanh toán",
  description: "Đơn hàng đã được tiếp nhận, đang chờ thanh toán",
  icon: Receipt,
} as const;

const NORMAL_STEPS = [
  {
    key: "placed",
    label: "Đặt hàng",
    description: "Đơn hàng của bạn đã được tiếp nhận",
    icon: Receipt,
  },
  {
    key: WAITING_PAYMENT_STEP.key,
    label: WAITING_PAYMENT_STEP.label,
    description: WAITING_PAYMENT_STEP.description,
    icon: WAITING_PAYMENT_STEP.icon,
  },
  {
    key: "confirmed",
    label: "Xác nhận đơn",
    description: "Đơn hàng đã được xác nhận",
    icon: PackageCheck,
  },
  {
    key: "delivering",
    label: "Đang vận chuyển",
    description: "Đơn hàng đang trên đường đến bạn",
    icon: Truck,
  },
  {
    key: "delivered",
    label: "Đã giao hàng",
    description: "Đơn hàng đã giao thành công",
    icon: Package,
  },
] as const;

const DEPOSIT_STEPS = [
  {
    key: "placed",
    label: "Đặt hàng",
    description: "Đơn hàng của bạn đã được tiếp nhận",
    icon: Receipt,
  },
  {
    key: WAITING_PAYMENT_STEP.key,
    label: WAITING_PAYMENT_STEP.label,
    description: "Vui lòng thanh toán tiền đặt cọc (lần 1)",
    icon: WAITING_PAYMENT_STEP.icon,
  },
  {
    key: "first_paid",
    label: "Đặt cọc",
    description: "Đã nhận tiền đặt cọc (thanh toán lần 1)",
    icon: PackageCheck,
  },
  {
    key: "second_paid",
    label: "Đã tất toán",
    description: "Đã thanh toán phần còn lại (lần 2)",
    icon: PackageCheck,
  },
  {
    key: "delivering",
    label: "Đang vận chuyển",
    description: "Đơn hàng đang trên đường đến bạn",
    icon: Truck,
  },
  {
    key: "delivered",
    label: "Đã giao hàng",
    description: "Đơn hàng đã giao thành công",
    icon: Package,
  },
] as const;

const STATUS_INDEX: Record<string, number> = {
  pending: 1,
  confirmed: 2,
  delivering: 3,
  delivered: 4,
};

const STATUS_INDEX_DEPOSIT: Record<string, number> = {
  pending: 1,
  confirmed: 2,
  first_paid: 2,
  second_paid: 3,
  delivering: 4,
  delivered: 5,
};

// Pickup orders skip "delivering" — goods are handed over at the store. The
// delivering status still maps to the delivered index so legacy orders stuck
// at delivering render fully instead of collapsing.
const STATUS_INDEX_PICKUP: Record<string, number> = {
  pending: 1,
  confirmed: 2,
  delivering: 3,
  delivered: 3,
};

const STATUS_INDEX_PICKUP_DEPOSIT: Record<string, number> = {
  pending: 1,
  confirmed: 2,
  first_paid: 2,
  second_paid: 3,
  delivering: 4,
  delivered: 4,
};

interface PreOrderTrackingLike {
  current_step?: string;
  steps?: Record<string, string>;
}

function getPreOrderIndex(tracking: unknown): number {
  if (!tracking || typeof tracking !== "object") return -1;
  const t = tracking as PreOrderTrackingLike;
  if (!t.current_step) return -1;
  return PRE_ORDER_STEPS.findIndex((s) => s.key === t.current_step);
}

function formatDateTime(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const NODE_CLASSES: Record<Tone, Record<StepState, string>> = {
  brand: {
    done: "bg-emerald-500 text-white",
    active:
      "primary-gradient text-white shadow-lg shadow-primary/20 ring-4 ring-primary-fixed/50",
    pending: "border-2 border-outline-variant bg-surface",
    error: "bg-error text-white",
  },
  violet: {
    done: "bg-violet-500 text-white",
    active: "bg-violet-500 text-white ring-4 ring-violet-100",
    pending: "border-2 border-outline-variant bg-surface",
    error: "bg-error text-white",
  },
};

const LABEL_CLASSES: Record<Tone, Record<StepState, string>> = {
  brand: {
    done: "text-emerald-600",
    active: "text-primary",
    pending: "text-on-surface-variant",
    error: "text-error",
  },
  violet: {
    done: "text-violet-600",
    active: "text-violet-800",
    pending: "text-on-surface-variant",
    error: "text-error",
  },
};

const PILL_CLASSES: Record<Tone, Record<StepState, string>> = {
  brand: {
    done: "bg-emerald-100/80 text-emerald-600",
    active: "bg-primary-fixed text-primary",
    pending: "bg-surface-container text-on-surface-variant",
    error: "bg-error/10 text-error",
  },
  violet: {
    done: "bg-violet-100 text-violet-700",
    active: "bg-violet-100 text-violet-700",
    pending: "bg-surface-container text-on-surface-variant",
    error: "bg-error/10 text-error",
  },
};

function normalStepTimestamp(key: string, order: OrderDetail): string | null {
  if (key === "placed") return order.created_at;
  if (key === "confirmed") return order.paid_at ?? order.deposit_paid_at;
  if (key === "first_paid") return order.deposit_paid_at;
  if (key === "second_paid") return order.paid_at;
  if (key === "delivering") return order.delivering_at;
  if (key === "delivered") return order.delivered_at;
  return null;
}

const TERMINATION_SPEC: Record<
  string,
  {
    label: string;
    description: string;
    timestamp: (o: OrderDetail) => string | null;
  }
> = {
  refunded: {
    label: "Đã hoàn tiền",
    description: "Đơn hàng đã bị hủy và hoàn tiền cho bạn",
    timestamp: (o) => o.refunded_at,
  },
  returning: {
    label: "Đang hoàn hàng",
    description: "Vui lòng gửi sản phẩm về shop và đợi xác nhận hoàn tiền",
    timestamp: (o) => o.returning_at,
  },
  cancelled: {
    label: "Đã hủy",
    description: "Đơn hàng đã bị hủy",
    timestamp: (o) => o.cancelled_at,
  },
};

function buildTerminationStep(order: OrderDetail, status: string): StepModel {
  const spec = TERMINATION_SPEC[status] ?? TERMINATION_SPEC.cancelled;
  return {
    key: status,
    label: spec.label,
    description: spec.description,
    state: "error",
    icon: CircleX,
    timestamp: spec.timestamp(order),
  };
}

function getPillText(step: StepModel): string {
  if (step.state === "error") {
    if (step.key === "refunded") return "ĐÃ HOÀN";
    if (step.key === "returning") return "ĐANG XÁC MINH";
    return "ĐÃ HỦY";
  }
  if (step.state === "done") return "Thành công";
  if (step.state === "active") {
    if (step.key === "waiting_payment") return "Đợi thanh toán";
    if (step.key === "first_paid") return "ĐÃ ĐẶT CỌC";
    if (step.key === "second_paid") return "ĐÃ THANH TOÁN";
    return "ĐANG XỬ LÝ";
  }
  return "SẮP TỚI";
}

function TimelineRow({
  step,
  tone,
  isLast,
  lineDone,
}: {
  step: StepModel;
  tone: Tone;
  isLast: boolean;
  lineDone: boolean;
}) {
  const pillText = getPillText(step);

  return (
    <li className="relative flex gap-2 last:pb-0">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
            NODE_CLASSES[tone][step.state]
          } ${step.state === "active" ? "animate-pulse" : ""}`}
        >
          {step.state === "done" ? (
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          ) : step.state === "pending" ? (
            <span className="h-2 w-2 rounded-full bg-outline-variant" />
          ) : step.loading ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <step.icon className="h-3.5 w-3.5" strokeWidth={2.5} />
          )}
        </div>
        {!isLast && (
          <span
            className={`mt-1 min-h-10 w-0.5 rounded-full ${
              lineDone
                ? tone === "violet"
                  ? "bg-violet-400"
                  : "bg-emerald-400"
                : "bg-outline-variant"
            }`}
          />
        )}
      </div>
      <div
        className={`flex min-w-0 flex-1 items-start justify-between gap-2 pb-1 ${
          step.state === "pending" ? "opacity-60" : ""
        }`}
      >
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-bold leading-tight ${LABEL_CLASSES[tone][step.state]}`}
          >
            {step.label}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-on-surface-variant">
            {step.description}
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-col items-end">
          <span
            className={`rounded-sm px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${PILL_CLASSES[tone][step.state]}`}
          >
            {pillText}
          </span>
          {step.meta ? (
            <span className="mt-1 text-[9px] font-black uppercase tracking-wider text-primary">
              {step.meta}
            </span>
          ) : step.timestamp ? (
            <span className="mt-1 text-[9px] font-semibold text-on-surface-variant">
              {formatDateTime(step.timestamp)}
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default function OrderTrackingTimeline({
  order,
}: {
  order: OrderDetail;
}) {
  const orderStatus = order.status as string;
  const isFinished =
    orderStatus === "delivered" ||
    orderStatus === "cancelled" ||
    orderStatus === "refunded" ||
    orderStatus === "returning";
  const isPreOrder = order.items.some((item) => item.preOrderTracking);
  const isPickup = isPickupShippingMethod(order.shipping_method_id);

  function applyPickupStepText<T extends Omit<StepModel, "state">>(step: T): T {
    if (!isPickup) return step;
    if (step.key === "second_paid") {
      return {
        ...step,
        label: "Đã thanh toán đầy đủ đơn hàng",
        description:
          "Đã thanh toán phần còn lại (lần 2), khách hàng vui lòng đến cửa hàng lấy hàng",
      };
    }
    if (step.key === "delivered") {
      return {
        ...step,
        label: "Đơn hàng hoàn tất",
        description: "Đơn hàng đã được bàn giao cho khách hàng",
      };
    }
    return step;
  }

  // Once the parcel is "Sẵn sàng tại shop" (or the order is finished), the
  // pre-order milestones are no longer useful — switch to the order status
  // timeline instead.
  const readyIdx = PRE_ORDER_STEPS.findIndex((s) => s.key === "ready");
  const collectiveIdx = isPreOrder
    ? order.items
        .filter((item) => item.preOrderTracking)
        .reduce((min, item) => {
          const idx = getPreOrderIndex(item.preOrderTracking);
          return idx < 0 ? min : Math.min(min, idx);
        }, Infinity)
    : Infinity;
  const activeIdx =
    !isPreOrder || collectiveIdx === Infinity ? 0 : collectiveIdx;
  const showPreOrderTimeline =
    isPreOrder && !isFinished && activeIdx < readyIdx;
  const tone: Tone = showPreOrderTimeline ? "violet" : "brand";

  let steps: StepModel[];

  if (showPreOrderTimeline) {
    const preOrderItems = order.items.filter((item) => item.preOrderTracking);
    const stepTimes: Record<string, string> = {};
    for (const item of preOrderItems) {
      const t = item.preOrderTracking as
        | PreOrderTrackingLike
        | null
        | undefined;
      const recorded = t?.steps ?? {};
      for (const [key, iso] of Object.entries(recorded)) {
        if (!iso) continue;
        if (!stepTimes[key] || iso < stepTimes[key]) stepTimes[key] = iso;
      }
    }

    steps = PRE_ORDER_STEPS.slice(0, activeIdx + 1).map((step, i) => ({
      ...step,
      state: i < activeIdx ? "done" : "active",
      timestamp: stepTimes[step.key] ?? null,
    }));
  } else {
    const isDepositFlow = order.payment_type === "deposit_cod";
    const flowSteps = (isDepositFlow ? DEPOSIT_STEPS : NORMAL_STEPS).filter(
      (s) => !(isPickup && s.key === "delivering")
    );
    const orderIndex = isDepositFlow
      ? isPickup
        ? STATUS_INDEX_PICKUP_DEPOSIT
        : STATUS_INDEX_DEPOSIT
      : isPickup
        ? STATUS_INDEX_PICKUP
        : STATUS_INDEX;
    const terminated =
      orderStatus === "cancelled" ||
      orderStatus === "refunded" ||
      orderStatus === "returning";
    let lastDoneIdx = 0;

    if (!terminated) {
      lastDoneIdx = orderIndex[orderStatus] ?? 0;
      const allDone = orderStatus === "delivered";
      steps = flowSteps.slice(0, lastDoneIdx + 1).map((step, i) => ({
        ...applyPickupStepText(step),
        state: i < lastDoneIdx || allDone ? "done" : "active",
        timestamp: normalStepTimestamp(step.key, order),
        loading: step.key === "waiting_payment" && orderStatus === "pending",
        meta:
          step.key === "delivering" &&
          i === lastDoneIdx &&
          order.expected_delivery_at
            ? `Dự kiến: ${formatDate(order.expected_delivery_at)}`
            : null,
      }));
    } else {
      if (isDepositFlow) {
        if (order.delivered_at) lastDoneIdx = isPickup ? 4 : 5;
        else if (order.delivering_at) lastDoneIdx = 4;
        else if (order.paid_at) lastDoneIdx = 3;
        else if (order.deposit_paid_at) lastDoneIdx = 2;
      } else {
        if (order.delivered_at) lastDoneIdx = isPickup ? 3 : 4;
        else if (order.delivering_at) lastDoneIdx = 3;
        else if (order.paid_at || order.deposit_paid_at) lastDoneIdx = 2;
      }

      steps = flowSteps.slice(0, lastDoneIdx + 1).map((step, i) => ({
        ...applyPickupStepText(step),
        state: "done",
        timestamp: normalStepTimestamp(step.key, order),
      }));

      steps.push(buildTerminationStep(order, orderStatus));
    }
  }

  return (
    <div className="space-y-4 rounded-2xl bg-surface-container-lowest p-4 shadow-ambient-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-black uppercase tracking-widest text-on-surface-variant">
          {showPreOrderTimeline
            ? "Trạng thái đơn hàng Pre-order"
            : "Trạng thái đơn hàng"}
        </p>
      </div>
      {showPreOrderTimeline && (
        <p className="mt-0.5 text-xs text-on-surface-variant">
          Các mốc được cập nhật khi hàng về shop
        </p>
      )}
      <ol>
        {steps.map((step, i) => {
          const next = steps[i + 1];
          return (
            <TimelineRow
              key={step.key}
              step={step}
              tone={tone}
              isLast={i === steps.length - 1}
              lineDone={next ? next.state !== "error" : false}
            />
          );
        })}
      </ol>
    </div>
  );
}
