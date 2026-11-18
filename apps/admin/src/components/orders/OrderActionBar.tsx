"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  FileText,
  KeyRound,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { OrderDetail } from "./OrderDetailModal";
import { adminQueryKeys } from "@/lib/react-query/root";
import { mainFlowFor, orderStatusLabel } from "@/lib/order-status";
import { isPickupShippingMethod } from "@/lib/shipping-method";
import { VerifiedPaymentPanel } from "./VerifiedPaymentPanel";

const REFUND_DELIVERED_WINDOW_MS = 72 * 60 * 60 * 1000;

const PRE_ORDER_STEPS = [
  { key: "paid", label: "Đã thanh toán" },
  { key: "placed", label: "Đã đặt hàng" },
  { key: "international_shipping", label: "Vận chuyển quốc tế" },
  { key: "customs", label: "Hải quan" },
  { key: "local_delivering", label: "Vận chuyển nội địa" },
  { key: "ready", label: "Sẵn sàng tại shop" },
] as const;

interface Props {
  order: OrderDetail;
  currentStatus: string;
  onUpdated: () => void;
}

function StepIndicator({
  current,
  steps,
  direction = "horizontal",
}: {
  current: string;
  steps: readonly string[];
  direction?: "horizontal" | "vertical";
}) {
  const currentIdx = steps.indexOf(current);

  if (direction === "vertical") {
    return (
      <div className="space-y-0">
        {steps.map((step, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          const isLast = i === steps.length - 1;
          return (
            <div key={step} className="flex items-stretch">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors ${
                    done
                      ? "border-green-500 bg-green-500 text-white"
                      : active
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 bg-white text-slate-400"
                  }`}
                >
                  {done ? <Check className="h-2.5 w-2.5" /> : i + 1}
                </div>
                {!isLast && (
                  <div
                    className={`my-0.5 h-full min-h-10 w-px ${i < currentIdx ? "bg-green-400" : "bg-slate-200"}`}
                  />
                )}
              </div>
              <div className="ml-2 flex items-start pb-2">
                <span
                  className={`text-xs font-medium capitalize leading-tight ${
                    active
                      ? "font-semibold text-blue-700"
                      : done
                        ? "text-green-600"
                        : "text-slate-400"
                  }`}
                >
                  {orderStatusLabel(step)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={step} className="flex items-center">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${done ? "border-green-500 bg-green-500 text-white" : active ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-400"}`}
            >
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            <div className="mx-1.5 flex flex-col items-start">
              <span
                className={`text-xs font-medium capitalize leading-none ${active ? "text-blue-700" : done ? "text-green-600" : "text-slate-400"}`}
              >
                {orderStatusLabel(step)}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mr-1.5 h-px w-12 ${i < currentIdx ? "bg-green-400" : "bg-slate-400"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Pre-order Progress Section ────────────────────────────────────────────

function getPreOrderStepIndex(tracking: unknown): number {
  if (!tracking || typeof tracking !== "object") return -1;
  const t = tracking as Record<string, unknown>;
  const currentStep = t.current_step as string | undefined;
  if (!currentStep) return -1;
  return PRE_ORDER_STEPS.findIndex((s) => s.key === currentStep);
}

function PreOrderProgressSection({
  order,
  onUpdated,
}: {
  order: OrderDetail;
  onUpdated: () => void;
}) {
  const queryClient = useQueryClient();

  const preOrderItems = useMemo(
    () =>
      (order.order_items ?? []).filter(
        (item) =>
          // Pre-order is tracked at two levels: order_items.is_pre_order for
          // plain non-kit products (migration 134) and
          // order_item_components.is_pre_order for kit assemblies. Both must be
          // listed, otherwise the progress panel never renders for plain
          // pre-order items, the Advance button is unreachable,
          // order_items.pre_order_tracking is never written, and the web
          // pre-order timeline — which is driven by that column — stays hidden.
          item.is_pre_order ||
          (item?.order_item_components ?? []).some(
            (c: { is_pre_order?: boolean }) => c.is_pre_order
          )
      ),
    [order.order_items]
  );

  const collectiveStepIndex = useMemo(() => {
    let minIdx = Infinity;
    for (const item of preOrderItems) {
      const idx = getPreOrderStepIndex(item.pre_order_tracking);
      if (idx >= 0 && idx < minIdx) minIdx = idx;
    }
    return minIdx === Infinity ? -1 : minIdx;
  }, [preOrderItems]);

  const allReady = collectiveStepIndex >= PRE_ORDER_STEPS.length - 1;
  const isFirstStep = collectiveStepIndex < 0;

  const advanceMutation = useMutation({
    mutationFn: async () => {
      const itemIds = preOrderItems.map((i) => i.id);
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advance_pre_order: { item_ids: itemIds } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Advance failed");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.orderDetail(order.id),
      });
      onUpdated();
    },
  });

  if (preOrderItems.length === 0) return null;

  return (
    <div className="w-full rounded-lg border border-violet-200 bg-violet-50/60 p-3">
      <p className="mb-2 text-xs font-semibold text-violet-800">
        Pre-order Progress ({preOrderItems.length} item
        {preOrderItems.length > 1 ? "s" : ""})
      </p>

      <div className="space-y-1.5">
        {PRE_ORDER_STEPS.map((step, i) => {
          const done = isFirstStep ? false : i < collectiveStepIndex;
          const active = isFirstStep ? i === 0 : i === collectiveStepIndex;
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
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span
                className={`text-xs leading-tight ${
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

      <button
        onClick={() => advanceMutation.mutate()}
        disabled={advanceMutation.isPending || allReady}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
      >
        {advanceMutation.isPending
          ? "Đang cập nhật…"
          : allReady
            ? "Hoàn thành"
            : "Tiến bước tiếp theo"}
      </button>
    </div>
  );
}

// ── Pickup verification panel ─────────────────────────────────────────────

interface VerifyPickupError {
  error?: string;
  remainingTries?: number;
  lockSecondsLeft?: number;
}

function PickupVerificationPanel({
  order,
  onUpdated,
}: {
  order: OrderDetail;
  onUpdated: () => void;
}) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");

  const recipientName =
    (order.delivery_address?.full_name ??
      [order.users?.first_name, order.users?.last_name]
        .filter(Boolean)
        .join(" ")) ||
    "—";
  const recipientPhone =
    order.delivery_address?.phone_number ?? order.users?.phone_number ?? null;
  const phoneLast2 = recipientPhone ? recipientPhone.slice(-2) : "—";

  const verifyMutation = useMutation({
    mutationFn: async (value: string) => {
      const res = await fetch(`/api/orders/${order.id}/verify-pickup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value }),
      });
      const json: VerifyPickupError = await res.json();
      if (!res.ok) {
        const err = new Error(json.error ?? "Verify failed") as Error &
          VerifyPickupError;
        err.remainingTries = json.remainingTries;
        err.lockSecondsLeft = json.lockSecondsLeft;
        throw err;
      }
      return json;
    },
    onSuccess: () => {
      setCode("");
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.orderDetail(order.id),
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      onUpdated();
    },
  });

  const verifyError = verifyMutation.error as (Error & VerifyPickupError) | null;
  const locked = Number(verifyError?.lockSecondsLeft ?? 0) > 0;

  if (order.pickup_verified_at) return null;

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <ShieldCheck className="h-4 w-4 text-emerald-700" />
        <p className="text-xs font-semibold text-emerald-900">
          Xác minh mã nhận hàng (pickup)
        </p>
        {order.pickup_code_expires_at && (
          <span className="ml-auto text-[11px] text-emerald-700">
            hết hạn {new Date(order.pickup_code_expires_at).toLocaleTimeString("vi-VN")}
          </span>
        )}
      </div>

      {recipientName !== "—" || phoneLast2 !== "—" ? (
        <p className="mb-2 text-[11px] text-slate-600">
          Khách: <strong>{recipientName}</strong> · SĐT cuối:{" "}
          <strong>…{phoneLast2}</strong>
        </p>
      ) : null}

      <div className="flex items-center gap-1.5">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && code.length === 6) {
              verifyMutation.mutate(code);
            }
          }}
          placeholder="6 chữ số"
          inputMode="numeric"
          disabled={verifyMutation.isPending || locked}
          className="w-28 rounded-lg border border-emerald-300 bg-white px-2 py-1.5 text-center text-sm font-bold tracking-[0.25em] focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 disabled:opacity-50"
        />
        <button
          onClick={() => code.length === 6 && verifyMutation.mutate(code)}
          disabled={code.length !== 6 || verifyMutation.isPending || locked}
          className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {verifyMutation.isPending ? "Đang xác minh…" : "Xác minh & giao hàng"}
        </button>
      </div>

      {verifyError && !locked && (
        <p className="mt-2 text-[11px] text-red-600">
          {verifyError.error}
          {typeof verifyError.remainingTries === "number" && (
            <span className="ml-1 font-medium">
              Còn {verifyError.remainingTries} lần thử.
            </span>
          )}
        </p>
      )}

      {locked && (
        <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-red-600">
          <KeyRound className="h-3.5 w-3.5" />
          Mã bị khóa. Chờ {verifyError?.lockSecondsLeft}s hoặc làm mới trang.
        </p>
      )}

      <p className="mt-2 flex items-start gap-1 text-[11px] text-amber-700">
        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
        Không có mã? Bỏ qua và dùng “Mark as delivered” bên dưới để giao hàng
        thủ công (sẽ ghi là không xác minh).
      </p>
    </div>
  );
}

export default function OrderActionBar({
  order,
  currentStatus,
  onUpdated,
}: Props) {
  const queryClient = useQueryClient();
  const [showCancel, setShowCancel] = useState(false);
  const [cancelNote, setCancelNote] = useState("");
  const [showRefund, setShowRefund] = useState(false);

  // Deposit orders advance through a 5-step flow (pending → first_paid →
  // second_paid → delivering → delivered); full-payment orders keep the
  // original 4-step flow. A deposit order may still sit in the legacy
  // "confirmed" status (set before the two-installment flow existed) — treat
  // it as "first_paid" for flow purposes so it can keep advancing. Pickup
  // orders skip "delivering" entirely (goods are handed over at the store).
  const isPickup = isPickupShippingMethod(order.shipping_method_id);
  const steps = mainFlowFor(order.payment_type, isPickup);
  const flowStatus =
    order.payment_type === "deposit_cod" && currentStatus === "confirmed"
      ? "first_paid"
      : isPickup && currentStatus === "delivering"
        ? "delivered"
        : currentStatus;
  const flowIdx = steps.indexOf(flowStatus);
  const nextStatus =
    flowIdx >= 0 && flowIdx < steps.length - 1 ? steps[flowIdx + 1] : null;

  const refundableFromReturn = currentStatus === "returning";
  const isTerminal =
    currentStatus === "delivered" ||
    currentStatus === "cancelled" ||
    currentStatus === "refunded";
  const isDelivered = currentStatus === "delivered";

  const deliveredAtMs = order.delivered_at
    ? new Date(order.delivered_at).getTime()
    : NaN;
  // "pending" is included so the pre-order progress panel is reachable from the
  // moment the order is placed — otherwise a brand-new pre-order order shows no
  // panel at all, the Advance button is unreachable, pre_order_tracking is never
  // written, and the customer never sees the web pre-order timeline.
  const isDisplayPreOrderProcess = [
    "pending",
    "confirmed",
    "first_paid",
    "second_paid",
    "delivering",
    "delivered",
  ].includes(currentStatus);

  const refundStatuses = ["confirmed", "first_paid", "second_paid", "delivering"];
  const hasPayment =
    order?.paid_at !== null ||
    (order?.payment_type === "deposit_cod" && order?.deposit_paid_at !== null);
  const canRefund =
    refundableFromReturn ||
    isDelivered ||
    (hasPayment && refundStatuses.includes(currentStatus));
  const canAdvance = nextStatus !== null && !["confirmed", "first_paid", "second_paid"].includes(nextStatus);
  const canCancel = !isTerminal;

  const patchMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.orderDetail(order.id),
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setShowCancel(false);
      setShowRefund(false);
      setCancelNote("");
      onUpdated();
    },
  });

  const invoiceMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/invoices/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          customer: order.users,
          gifts: order.order_items?.map((item) => item.gifts),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to generate invoice");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.orderDetail(order.id),
      });
      onUpdated();
    },
  });

  if (isTerminal && !canRefund) return <VerifiedPaymentPanel key={order.id} orderId={order.id} total={Number(order.total_price)} status={order.status} paymentType={order.payment_type} paidAt={order.paid_at} onUpdated={onUpdated} />;

  return (
    <div className="shrink-0 space-y-4 pt-4">
      <VerifiedPaymentPanel key={order.id} orderId={order.id} total={Number(order.total_price)} status={order.status} paymentType={order.payment_type} paidAt={order.paid_at} onUpdated={onUpdated} />
      <div className="flex gap-4">
        {/* Step flow indicator — vertical */}
        {flowIdx >= 0 && (
          <div className="w-fit flex-1 shrink-0 pb-1">
            <StepIndicator
              current={flowStatus}
              steps={steps}
              direction={isDisplayPreOrderProcess ? "vertical" : "horizontal"}
            />
          </div>
        )}
        {flowIdx >= 0 && <div className="h-auto w-px shrink-0 bg-slate-300" />}
        {/* Pre-order progress section — fills remaining space */}
        {isDisplayPreOrderProcess ? (
          <div className={`w-full flex-1`}>
            <PreOrderProgressSection order={order} onUpdated={onUpdated} />
          </div>
        ) : null}
      </div>

      {/* <div className="h-px w-full bg-slate-300" /> */}
      <div className="border-t border-slate-400 pt-4">
        {isPickup &&
          !order.pickup_verified_at &&
          (order.payment_type === "deposit_cod"
            ? currentStatus === "second_paid"
            : currentStatus === "confirmed") && (
            <div className="mb-4">
              <PickupVerificationPanel order={order} onUpdated={onUpdated} />
            </div>
          )}
        {patchMutation.isError && (
          <p className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-600">
            {patchMutation.error.message}
          </p>
        )}
        {invoiceMutation.isError && (
          <p className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-600">
            {invoiceMutation.error.message}
          </p>
        )}

        {/* Inline cancel form */}
        {showCancel && (
          <div className="flex items-start gap-2">
            <textarea
              value={cancelNote}
              onChange={(e) => setCancelNote(e.target.value)}
              placeholder="Cancellation reason (optional)"
              rows={2}
              className="flex-1 resize-none rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-red-400"
            />
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() =>
                  patchMutation.mutate({
                    status: "cancelled",
                    cancelled_note: cancelNote,
                  })
                }
                disabled={patchMutation.isPending}
                className="whitespace-nowrap rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {patchMutation.isPending ? "Cancelling…" : "Confirm cancel"}
              </button>
              <button
                onClick={() => setShowCancel(false)}
                className="whitespace-nowrap rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Inline refund form */}
        {showRefund && (
          <div className="flex items-center gap-2">
            <p className="flex-1 text-xs text-slate-500">
              {refundableFromReturn
                ? "Package verified? Confirm refund — stock and points will be reversed."
                : isDelivered
                  ? "Refund this delivered order? Stock and points earned on delivery will be reversed."
                  : "Mark this order as refunded?"}
            </p>
            <button
              onClick={() => patchMutation.mutate({ status: "refunded" })}
              disabled={patchMutation.isPending}
              className="whitespace-nowrap rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {patchMutation.isPending ? "Processing…" : "Confirm refund"}
            </button>
            <button
              onClick={() => setShowRefund(false)}
              className="whitespace-nowrap rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            >
              Back
            </button>
          </div>
        )}

        {/* Action buttons */}
        {!showCancel && !showRefund && (
          <div className="flex flex-wrap items-center gap-2">
            {isDelivered && order.delivered_at && (
              <p className="w-full text-[11px] text-orange-600">
                Refund window open — available until{" "}
                {new Date(
                  deliveredAtMs + REFUND_DELIVERED_WINDOW_MS
                ).toLocaleString("vi-VN")}
                (72h after delivery).
              </p>
            )}
            {canAdvance && (
              <button
                onClick={() => patchMutation.mutate({ status: nextStatus! })}
                disabled={patchMutation.isPending}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium capitalize text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
                Mark as {orderStatusLabel(nextStatus!)}
              </button>
            )}
            {canRefund && (
              <button
                onClick={() => setShowRefund(true)}
                disabled={patchMutation.isPending}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-orange-300 px-3 py-2 text-sm font-medium text-orange-600 transition-colors hover:bg-orange-50 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                {refundableFromReturn ? "Refund (approve return)" : "Refund"}
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => setShowCancel(true)}
                disabled={patchMutation.isPending}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Cancel Order
              </button>
            )}
            {[
                "confirmed",
                "first_paid",
                "second_paid",
                "delivered",
                "delivering",
              ].includes(order.status) &&
              !order.invoice_url && (
                <button
                  onClick={() => invoiceMutation.mutate()}
                  disabled={invoiceMutation.isPending}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-green-300 px-3 py-2 text-sm font-medium text-green-600 transition-colors hover:bg-green-50 disabled:opacity-50"
                >
                  <FileText className="h-4 w-4" />
                  Generate Invoice
                </button>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
