"use client";

import { useState } from "react";
import {
  PackageCheck,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileSpreadsheet,
} from "lucide-react";

export interface InboundItem {
  product_id: string;
  product_slug: string;
  product_name: string;
  variant_id: string | null;
  variant_name: string | null;
  current_stock: number;
  inbound_quantity: number;
}

export interface InboundBatch {
  operation_id: string;
  filename: string;
  note: string | null;
  item_count: number;
  total_quantity: number;
  created_at: string;
  created_by: string;
  items: InboundItem[];
}

interface Props {
  batches: InboundBatch[];
  isOpen: boolean;
  onClose: () => void;
  onApplied: () => void;
}

export default function InboundReviewModal({
  batches,
  isOpen,
  onClose,
  onApplied,
}: Props) {
  const [selectedBatchIndex, setSelectedBatchIndex] = useState(0);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentBatch = batches[selectedBatchIndex];

  async function handleApply() {
    if (!currentBatch) return;
    setApplying(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/inventory/inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation_id: currentBatch.operation_id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to apply inbound batch.");
      }

      setSuccess(data.message ?? "Đã cập nhật tồn kho thành công!");
      setTimeout(() => {
        onApplied();
      }, 1200);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Có lỗi xảy ra khi áp dụng."
      );
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <PackageCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Duyệt &amp; Áp dụng nhập kho (Warehouse Inbound)
              </h2>
              <p className="text-xs text-slate-500">
                {batches.length} lô hàng đang chờ duyệt áp dụng vào tồn kho live
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Batch switcher if multiple */}
        {batches.length > 1 && (
          <div className="flex gap-2 border-b border-slate-100 bg-slate-50 px-6 py-2">
            {batches.map((b, idx) => (
              <button
                key={b.operation_id}
                onClick={() => {
                  setSelectedBatchIndex(idx);
                  setError(null);
                  setSuccess(null);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  idx === selectedBatchIndex
                    ? "bg-white text-emerald-700 shadow-sm border border-slate-200"
                    : "text-slate-600 hover:bg-slate-200/60"
                }`}
              >
                {b.filename} (+{b.total_quantity})
              </button>
            ))}
          </div>
        )}

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {batches.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <FileSpreadsheet className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="font-semibold text-slate-700">
                Không có lô nhập kho nào đang chờ duyệt.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Tạo phiếu nhập kho tại app Warehouse để gửi số lượng vào đây.
              </p>
            </div>
          ) : currentBatch ? (
            <>
              {/* Batch info card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div>
                    <span className="text-xs text-slate-400">Tên file:</span>
                    <p className="font-semibold text-slate-800">
                      {currentBatch.filename}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Thời gian tạo:</span>
                    <p className="font-semibold text-slate-800">
                      {new Date(currentBatch.created_at).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Số lượng mặt hàng:</span>
                    <p className="font-semibold text-slate-800">
                      {currentBatch.item_count} mặt hàng
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Tổng cộng tăng:</span>
                    <p className="font-bold text-emerald-600">
                      +{currentBatch.total_quantity} sản phẩm
                    </p>
                  </div>
                </div>
                {currentBatch.note && (
                  <div className="mt-3 border-t border-slate-200/60 pt-2 text-xs">
                    <span className="text-slate-400">Ghi chú: </span>
                    <span className="font-medium text-slate-700">
                      {currentBatch.note}
                    </span>
                  </div>
                )}
              </div>

              {/* Status alerts */}
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertTriangle size={16} />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  <CheckCircle2 size={16} />
                  <span>{success}</span>
                </div>
              )}

              {/* Items Table */}
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3">Sản phẩm</th>
                      <th className="px-4 py-3">Biến thể</th>
                      <th className="px-4 py-3 text-right">Tồn hiện tại</th>
                      <th className="px-4 py-3 text-right">Nhập thêm</th>
                      <th className="px-4 py-3 text-right">Tồn sau nhập</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentBatch.items.map((item, idx) => {
                      const expectedStock =
                        item.current_stock + item.inbound_quantity;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">
                              {item.product_name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {item.product_slug}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.variant_name ? (
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium">
                                {item.variant_name}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-600">
                            {item.current_stock}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600">
                            +{item.inbound_quantity}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-slate-900">
                            <span className="inline-flex items-center gap-1.5">
                              {expectedStock}
                              <ArrowRight size={12} className="text-slate-400" />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50 rounded-b-2xl">
          <p className="text-xs text-slate-400">
            Số lượng sẽ được cộng dồn (additive) vào các sản phẩm và biến thể tương ứng.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={applying}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Đóng
            </button>
            {batches.length > 0 && (
              <button
                onClick={handleApply}
                disabled={applying || !currentBatch}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
              >
                {applying ? (
                  <>
                    <span className="loading loading-spinner loading-xs" />
                    Đang áp dụng…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Áp dụng vào tồn kho
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
