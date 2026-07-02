"use client";

import {
  Check,
  ChevronRight,
  FileText,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { OrderDetail } from "./OrderDetailModal";

const STATUS_FLOW = [
  "pending",
  "confirmed",
  "delivering",
  "delivered",
] as const;
type MainStatus = (typeof STATUS_FLOW)[number];

interface Props {
  order: OrderDetail;
  currentStatus: string;
  onUpdated: () => void;
}

function StepIndicator({ current }: { current: string }) {
  const steps = STATUS_FLOW;
  const currentIdx = steps.indexOf(current as MainStatus);

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
                className={`mr-1.5 h-px w-6 ${i < currentIdx ? "bg-green-400" : "bg-slate-200"}`}
              />
            )}
          </div>
        );
      })}
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

  const refundStatuses = ["confirmed", "delivering", "cancelled"];
  const canRefund =
    order?.paid_at !== null && refundStatuses.includes(currentStatus);
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
        body: JSON.stringify({ orderId: order.id, customer: order.users, gifts: order.order_items?.map(item => item.gifts) }),
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
    <div className="shrink-0 space-y-3 border-t border-slate-200 px-6 py-4">
      {/* Step flow indicator */}
      {flowIdx >= 0 && (
        <div className="pb-1">
          <StepIndicator current={currentStatus} />
        </div>
      )}

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
          {!order.invoice_url && (
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
  );
}
