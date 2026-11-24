"use client";

import { useEffect, useState } from "react";
import { Gavel, Loader2, Plus, RefreshCw, Search } from "lucide-react";
import { AuctionTable } from "@/components/auctions/AuctionTable";
import { AuctionFormModal } from "@/components/auctions/AuctionFormModal";

export default function AdminAuctionsPage() {
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchAuctions = async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (statusFilter !== "all") sp.set("status", statusFilter);
      const res = await fetch(`/api/auctions?${sp.toString()}`);
      const data = await res.json();
      if (data.auctions) {
        setAuctions(data.auctions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctions();
  }, [statusFilter]);

  const filteredAuctions = auctions.filter((auc) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const name = auc.product?.name?.toLowerCase() || "";
    const brand = auc.product?.brand?.toLowerCase() || "";
    return name.includes(term) || brand.includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Gavel size={24} className="text-emerald-700" />
            Quản lý Đấu giá
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Thiết lập sản phẩm đấu giá, bước giá tăng, thời gian anti-snipe và kiểm soát phiên trực tiếp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchAuctions}
            disabled={loading}
            className="h-10 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="h-10 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            <Plus size={16} />
            <span>Tạo phiên mới</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {["all", "active", "draft", "ended", "cancelled"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                statusFilter === s
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {s === "all" ? "Tất cả" : s}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên sản phẩm..."
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-600">
          <Loader2 size={24} className="animate-spin text-emerald-700" />
          <span className="text-xs">Đang tải danh sách phiên đấu giá...</span>
        </div>
      ) : (
        <AuctionTable auctions={filteredAuctions} onRefresh={fetchAuctions} />
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <AuctionFormModal
          onClose={() => setIsCreateOpen(false)}
          onSuccess={fetchAuctions}
        />
      )}
    </div>
  );
}
