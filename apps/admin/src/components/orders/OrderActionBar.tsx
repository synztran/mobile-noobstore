"use client";

import {
  Check,
  ChevronRight,
  FileText,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { OrderDetail } from "./OrderDetailModal";

const STATUS_FLOW = [
  "pending",
  "confirmed",
  "delivering",
  "delivered",
] as const;
type MainStatus = (typeof STATUS_FLOW)[number];

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
  direction = "horizontal",
}: {
  current: string;
  direction?: "horizontal" | "vertical";
}) {
  const steps = STATUS_FLOW;
  const currentIdx = steps.indexOf(current as MainStatus);

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
                  {step}
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
                {step}
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
  const [loading, setLoading] = useState(false);

  const preOrderItems = useMemo(
    () =>
      (order.order_items ?? []).filter((item) =>
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

  const handleAdvance = async () => {
    setLoading(true);
    try {
      const itemIds = preOrderItems.map((i) => i.id);
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advance_pre_order: { item_ids: itemIds } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Advance failed");
      onUpdated();
    } catch (e) {
      console.error("[PreOrderProgress] advance failed:", e);
    } finally {
      setLoading(false);
    }
  };

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
        onClick={handleAdvance}
        disabled={loading || allReady}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
      >
        {loading
          ? "Đang cập nhật…"
          : allReady
            ? "Hoàn thành"
            : "Tiến bước tiếp theo"}
      </button>
    </div>
  );
}

export default function OrderActionBar({
  order,
  currentStatus,
  onUpdated,
}: Props) {
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelNote, setCancelNote] = useState("");
  const [showRefund, setShowRefund] = useState(false);

  const flowIdx = STATUS_FLOW.indexOf(currentStatus as MainStatus);
  const nextStatus =
    flowIdx >= 0 && flowIdx < STATUS_FLOW.length - 1
      ? STATUS_FLOW[flowIdx + 1]
      : null;

  const isTerminal =
    currentStatus === "delivered" ||
    currentStatus === "cancelled" ||
    currentStatus === "refunded";
  const isDisplayPreOrderProcess = [
    "confirmed",
    "delivering",
    "delivered",
  ].includes(currentStatus);

  const refundStatuses = ["confirmed", "delivering", "cancelled"];
  const hasPayment =
    order?.paid_at !== null ||
    (order?.payment_type === "deposit_cod" && order?.deposit_paid_at !== null);
  const canRefund = hasPayment && refundStatuses.includes(currentStatus);
  const canAdvance = nextStatus !== null;
  const canCancel = !isTerminal;

  const patch = async (body: Record<string, unknown>) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      onUpdated();
      setShowCancel(false);
      setShowRefund(false);
      setCancelNote("");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setActionLoading(false);
    }
  };

  const generateInvoice = async () => {
    setActionLoading(true);
    setActionError(null);
    setSuccessMessage(null);
    try {
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
      setSuccessMessage("Hoá đơn đã được tạo!");
      onUpdated();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setActionLoading(false);
    }
  };

  if (isTerminal && !canRefund) return null;

  return (
    <div className="shrink-0 space-y-4 pt-4">
      <div className="flex gap-4">
        {/* Step flow indicator — vertical */}
        {flowIdx >= 0 && (
          <div className="w-fit flex-1 shrink-0 pb-1">
            <StepIndicator
              current={currentStatus}
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
        {actionError && (
          <p className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-600">
            {actionError}
          </p>
        )}
        {successMessage && (
          <p className="rounded border border-green-200 bg-green-50 px-2 py-1.5 text-xs text-green-700">
            {successMessage}
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
                  patch({
                    status: "cancelled",
                    cancelled_note: cancelNote,
                  })
                }
                disabled={actionLoading}
                className="whitespace-nowrap rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? "Cancelling…" : "Confirm cancel"}
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
              Mark this order as refunded?
            </p>
            <button
              onClick={() => patch({ status: "refunded" })}
              disabled={actionLoading}
              className="whitespace-nowrap rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {actionLoading ? "Processing…" : "Confirm refund"}
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
            {canAdvance && (
              <button
                onClick={() => patch({ status: nextStatus! })}
                disabled={actionLoading}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium capitalize text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
                Mark as {nextStatus}
              </button>
            )}
            {canRefund && (
              <button
                onClick={() => setShowRefund(true)}
                disabled={actionLoading}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-orange-300 px-3 py-2 text-sm font-medium text-orange-600 transition-colors hover:bg-orange-50 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Refund
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => setShowCancel(true)}
                disabled={actionLoading}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Cancel Order
              </button>
            )}
            {["confirmed", "delivered", "delivering"].includes(order.status) &&
              !order.invoice_url && (
                <button
                  onClick={generateInvoice}
                  disabled={actionLoading}
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
