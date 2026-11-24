"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Ban,
  Clock,
  Gavel,
  Sparkles,
  Trash2,
} from "lucide-react";
import { AuctionExtendModal } from "./AuctionExtendModal";
import { AuctionFormModal } from "./AuctionFormModal";

export function AuctionTable({
  auctions,
  onRefresh,
}: {
  auctions: any[];
  onRefresh: () => void;
}) {
  const [extendingItem, setExtendingItem] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const formatVND = (v: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(v);

  const handleToggleFeature = async (auction: any) => {
    setActionLoading(auction.id);
    try {
      await fetch(`/api/auctions/${auction.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_featured: !auction.is_featured }),
      });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (auction: any) => {
    if (!confirm(`Bạn có chắc muốn hủy phiên đấu giá "${auction.product?.name}"?`)) return;
    setActionLoading(auction.id);
    try {
      await fetch(`/api/auctions/${auction.id}/cancel`, { method: "POST" });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (auction: any) => {
    if (!confirm(`Bạn có chắc muốn xóa phiên đấu giá "${auction.product?.name}"?`)) return;
    setActionLoading(auction.id);
    try {
      await fetch(`/api/auctions/${auction.id}`, { method: "DELETE" });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  if (auctions.length === 0) {
    return (
      <div className="py-16 text-center text-slate-600 bg-white rounded-2xl border border-dashed border-slate-300">
        <Gavel className="mx-auto mb-3 opacity-30" size={36} />
        <p className="text-sm">Chưa có phiên đấu giá nào</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Sản phẩm</th>
              <th className="px-4 py-3">Giá hiện tại / Khởi điểm</th>
              <th className="px-4 py-3">BIN (Mua ngay)</th>
              <th className="px-4 py-3">Lượt bid</th>
              <th className="px-4 py-3">Thời hạn</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {auctions.map((auc) => {
              const p = auc.product;
              const isEnded = new Date(auc.ends_at) <= new Date() || auc.status === "ended";

              return (
                <tr key={auc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                        <Image
                          src={p?.thumbnail || "/images/placeholder.png"}
                          alt={p?.name ?? "Sản phẩm"}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 max-w-[200px]">
                        <div className="font-semibold text-slate-900 truncate">{p?.name}</div>
                        <div className="text-[10px] text-slate-600 truncate">{p?.brand || "NoobStore"}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3.5 font-mono">
                    <div className="font-bold text-emerald-800 text-sm">
                      {formatVND(auc.current_price)}
                    </div>
                    <div className="text-[10px] text-slate-600">
                      Khởi điểm: {formatVND(auc.starting_price)}
                    </div>
                  </td>

                  <td className="px-4 py-3.5 font-mono text-amber-800 font-semibold">
                    {auc.bin_price ? formatVND(auc.bin_price) : "-"}
                  </td>

                  <td className="px-4 py-3.5 font-mono font-bold text-slate-800">
                    {auc.total_bids ?? 0}
                  </td>

                  <td className="px-4 py-3.5 text-[11px]">
                    <div className="text-slate-800">
                      Hết hạn: {new Date(auc.ends_at).toLocaleString("vi-VN")}
                    </div>
                    <div className="text-[10px] text-slate-600">
                      Bù giờ: {auc.anti_snipe_minutes}p
                    </div>
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-1 items-start">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          auc.status === "active" && !isEnded
                            ? "bg-emerald-500/20 text-emerald-400"
                            : auc.status === "ended" || isEnded
                             ? "bg-slate-100 text-slate-700"
                            : auc.status === "cancelled"
                            ? "bg-rose-500/20 text-rose-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {auc.status === "active" && !isEnded
                          ? "Active"
                          : auc.status === "ended" || isEnded
                          ? "Ended"
                          : auc.status === "cancelled"
                          ? "Cancelled"
                          : "Draft"}
                      </span>

                      {auc.is_featured && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400">
                          Featured
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Auction actions */}
                      <span className="group/action relative inline-flex">
                        <button
                          type="button"
                          onClick={() => setEditingItem(auc)}
                          aria-label={`Chỉnh sửa chi tiết sản phẩm — ${auc.product?.name ?? "Đấu giá"}`}
                          aria-describedby={`auction-details-tip-${auc.id}`}
                          className="px-2.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
                        >
                          Chi tiết
                        </button>
                        <span id={`auction-details-tip-${auc.id}`} role="tooltip" className="pointer-events-none absolute right-1/2 top-0 z-30 w-max max-w-64 -translate-y-[calc(100%+0.5rem)] translate-x-1/2 rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/action:opacity-100 group-focus-within/action:opacity-100">Chỉnh sửa chi tiết sản phẩm</span>
                      </span>
                      <span className="group/action relative inline-flex">
                        <button
                          type="button"
                          onClick={() => handleToggleFeature(auc)}
                          aria-label={`${auc.is_featured ? "Bỏ nổi bật" : "Ghim nổi bật"} — ${auc.product?.name ?? "Đấu giá"}`}
                          aria-describedby={`auction-feature-tip-${auc.id}`}
                          disabled={actionLoading === auc.id}
                          className={`p-2.5 rounded-lg border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 ${
                          auc.is_featured
                            ? "bg-amber-100 border-amber-300 text-amber-800"
                             : "bg-white border-slate-300 text-slate-600 hover:text-slate-900"
                        }`}
                        >
                          <Sparkles size={14} />
                        </button>
                        <span id={`auction-feature-tip-${auc.id}`} role="tooltip" className="pointer-events-none absolute right-1/2 top-0 z-30 w-max max-w-64 -translate-y-[calc(100%+0.5rem)] translate-x-1/2 rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/action:opacity-100 group-focus-within/action:opacity-100">{auc.is_featured ? "Bỏ nổi bật" : "Ghim nổi bật"}</span>
                      </span>

                      {/* Extend button */}
                      <span className="group/action relative inline-flex">
                        <button type="button" onClick={() => setExtendingItem(auc)} aria-label={`Gia hạn thời gian — ${auc.product?.name ?? "Đấu giá"}`} aria-describedby={`auction-extend-tip-${auc.id}`} className="p-2.5 rounded-lg bg-white border border-slate-300 text-slate-600 hover:text-amber-700 hover:border-amber-500/60 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700">
                          <Clock size={14} />
                        </button>
                        <span id={`auction-extend-tip-${auc.id}`} role="tooltip" className="pointer-events-none absolute right-1/2 top-0 z-30 w-max max-w-64 -translate-y-[calc(100%+0.5rem)] translate-x-1/2 rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/action:opacity-100 group-focus-within/action:opacity-100">Gia hạn thời gian</span>
                      </span>

                      {/* Cancel button */}
                      {auc.status === "active" && (
                        <span className="group/action relative inline-flex">
                        <button
                          type="button"
                          onClick={() => handleCancel(auc)}
                          aria-label={`Hủy phiên — ${auc.product?.name ?? "Đấu giá"}`}
                          aria-describedby={`auction-cancel-tip-${auc.id}`}
                          disabled={actionLoading === auc.id}
                          className="p-2.5 rounded-lg bg-white border border-slate-300 text-slate-600 hover:text-rose-700 hover:border-rose-500/60 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
                        >
                          <Ban size={14} />
                        </button>
                        <span id={`auction-cancel-tip-${auc.id}`} role="tooltip" className="pointer-events-none absolute right-1/2 top-0 z-30 w-max max-w-64 -translate-y-[calc(100%+0.5rem)] translate-x-1/2 rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/action:opacity-100 group-focus-within/action:opacity-100">Hủy phiên</span>
                        </span>
                      )}

                      {/* Delete button */}
                      <span className="group/action relative inline-flex">
                      <button
                        type="button"
                        onClick={() => handleDelete(auc)}
                        aria-label={`Xóa phiên — ${auc.product?.name ?? "Đấu giá"}`}
                        aria-describedby={`auction-delete-tip-${auc.id}`}
                        disabled={actionLoading === auc.id}
                        className="p-2.5 rounded-lg bg-white border border-slate-300 text-slate-600 hover:text-rose-700 hover:border-rose-500/60 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
                      >
                        <Trash2 size={14} />
                      </button>
                      <span id={`auction-delete-tip-${auc.id}`} role="tooltip" className="pointer-events-none absolute right-1/2 top-0 z-30 w-max max-w-64 -translate-y-[calc(100%+0.5rem)] translate-x-1/2 rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/action:opacity-100 group-focus-within/action:opacity-100">Xóa phiên</span>
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {extendingItem && (
        <AuctionExtendModal
          auctionId={extendingItem.id}
          productName={extendingItem.product?.name ?? "Đấu giá"}
          currentEndsAt={extendingItem.ends_at}
          onClose={() => setExtendingItem(null)}
          onSuccess={onRefresh}
        />
      )}
      {editingItem && (
        <AuctionFormModal
          auctionId={editingItem.id}
          auctionProductName={editingItem.product?.name}
          onClose={() => setEditingItem(null)}
          onSuccess={() => { setEditingItem(null); onRefresh(); }}
        />
      )}
    </>
  );
}
