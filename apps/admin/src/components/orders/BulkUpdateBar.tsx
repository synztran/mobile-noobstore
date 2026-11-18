"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  PackageCheck,
  RotateCcw,
  Truck,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

const TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "first_paid", "cancelled"],
  confirmed: ["delivering", "second_paid", "cancelled", "refunded"],
  first_paid: ["second_paid", "cancelled", "refunded"],
  second_paid: ["delivering", "cancelled", "refunded"],
  delivering: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
  refunded: [],
};

const ACTION_META: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  confirmed: { label: "Confirm", icon: CheckCircle2, color: "btn-primary" },
  first_paid: { label: "1st paid", icon: CheckCircle2, color: "btn-primary" },
  second_paid: { label: "2nd paid", icon: CheckCircle2, color: "btn-primary" },
  delivering: { label: "Delivering", icon: Truck, color: "btn-info" },
  delivered: { label: "Delivered", icon: PackageCheck, color: "btn-success" },
  cancelled: { label: "Cancel", icon: XCircle, color: "btn-error" },
  refunded: { label: "Refund", icon: RotateCcw, color: "btn-warning" },
};

interface Props {
  selectedIds: string[];
  onClear: () => void;
}

export default function BulkUpdateBar({ selectedIds, onClear }: Props) {
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [currentStatuses, setCurrentStatuses] = useState<Set<string> | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    if (selectedIds.length === 0) {
      setCurrentStatuses(null);
      return;
    }
    setStatusLoading(true);
    async function fetchStatuses() {
      try {
        const res = await fetch("/api/orders/statuses?ids=" + selectedIds.join(","));
        if (!res.ok) return;
        const data: Record<string, string> = await res.json();
        setCurrentStatuses(new Set(Object.values(data)));
      } catch {
        setCurrentStatuses(null);
      } finally {
        setStatusLoading(false);
      }
    }
    fetchStatuses();
  }, [selectedIds]);

  function getCommonActions(): string[] {
    if (!currentStatuses || currentStatuses.size === 0) {
      return [];
    }

    const statusArray = Array.from(currentStatuses);
    let intersection = new Set(TRANSITIONS[statusArray[0]] ?? []);

    for (let i = 1; i < statusArray.length; i++) {
      const allowed = new Set(TRANSITIONS[statusArray[i]] ?? []);
      intersection = new Set(
        Array.from(intersection).filter((s) => allowed.has(s)),
      );
    }

    return Array.from(intersection);
  }

  if (selectedIds.length === 0) return null;

  async function handleBulkUpdate(status: string) {
    setUpdating(status);
    try {
      const res = await fetch("/api/orders/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: selectedIds, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.failed?.length
          ? `${data.error} (${data.failed.length} orders invalid)`
          : data.error ?? "Bulk update failed";
        throw new Error(msg);
      }
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      onClear();
    } catch (err) {
      console.error("[BulkUpdateBar]", err);
    } finally {
      setUpdating(null);
      setShowConfirm(null);
    }
  }

  const commonActions = getCommonActions();

  return (
    <div className="sticky bottom-4 z-40 flex items-center justify-between rounded-xl table-border card-bg px-4 py-3 shadow-float">
      <span className="text-sm font-medium text-heading">
        {selectedIds.length} order{selectedIds.length > 1 ? "s" : ""} selected
        {currentStatuses && currentStatuses.size > 0 && (
          <span className="ml-2 text-xs text-muted">
            ({Array.from(currentStatuses).join(", ")})
          </span>
        )}
      </span>

      <div className="flex items-center gap-2">
        {statusLoading ? (
          <span className="loading loading-spinner loading-sm" />
        ) : showConfirm ? (
          <>
            <p className="mr-2 text-sm text-body">
              Update to <strong>{showConfirm}</strong>?
            </p>
            <button
              onClick={() => handleBulkUpdate(showConfirm)}
              disabled={updating === showConfirm}
              className="btn btn-sm btn-primary"
            >
              {updating === showConfirm ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                "Confirm"
              )}
            </button>
            <button
              onClick={() => setShowConfirm(null)}
              className="btn btn-sm btn-ghost"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            {commonActions.length > 0 ? (
              commonActions.map((status) => {
                const meta = ACTION_META[status];
                if (!meta) return null;
                const Icon = meta.icon;
                return (
                  <button
                    key={status}
                    onClick={() => setShowConfirm(status)}
                    disabled={!!updating}
                    className={`btn btn-sm ${meta.color}`}
                  >
                    <Icon className="h-4 w-4" />
                    {meta.label}
                  </button>
                );
              })
            ) : (
              <span className="text-xs text-muted italic">
                No common transitions for selected statuses
              </span>
            )}

            <button
              onClick={onClear}
              disabled={!!updating}
              className="btn btn-sm btn-ghost btn-square ml-2"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}