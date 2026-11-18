"use client";

import { AlertTriangle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  voucherId: string;
  voucherCode: string;
  currentStatus: string;
};

export default function InactivateVoucherModal({
  voucherId,
  voucherCode,
  currentStatus,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDisabled = currentStatus === "disabled";
  const nextStatus = isDisabled ? "active" : "disabled";
  const actionLabel = isDisabled ? "Active" : "In-active";
  const modalTitle = isDisabled
    ? "Confirm Active Voucher"
    : "Confirm In-active Voucher";
  const confirmButtonClass = isDisabled
    ? "px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors"
    : "px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg transition-colors";
  const triggerButtonClass = isDisabled
    ? "btn btn-outline btn-success btn-sm text-green-600 hover:text-green-800"
    : "btn btn-outline btn-error btn-sm text-amber-600 hover:text-amber-800";

  async function handleInactivate() {
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/vouchers/${voucherId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? `Failed to ${actionLabel.toLowerCase()} voucher`);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerButtonClass}
      >
        {actionLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative mx-4 w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {modalTitle}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 transition-colors hover:bg-slate-100"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="flex items-start gap-3 text-sm text-slate-700">
                <AlertTriangle
                  className={`mt-0.5 h-5 w-5 ${isDisabled ? "text-green-500" : "text-amber-500"}`}
                />
                <p>
                  Are you sure you want to {actionLabel.toLowerCase()} voucher
                  <span className="font-semibold"> {voucherCode}</span>?
                </p>
              </div>

              {error && (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleInactivate}
                  disabled={loading}
                  className={confirmButtonClass}
                >
                  {loading ? "Updating..." : `Confirm ${actionLabel}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
