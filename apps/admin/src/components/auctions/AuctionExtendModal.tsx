"use client";

import { useState } from "react";
import { Clock, Loader2, X } from "lucide-react";

export function AuctionExtendModal({
  auctionId,
  productName,
  currentEndsAt,
  onClose,
  onSuccess,
}: {
  auctionId: string;
  productName: string;
  currentEndsAt: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [minutes, setMinutes] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presets = [
    { label: "+15 phút", val: 15 },
    { label: "+30 phút", val: 30 },
    { label: "+1 giờ", val: 60 },
    { label: "+3 giờ", val: 180 },
    { label: "+24 giờ", val: 1440 },
  ];

  const handleExtend = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/auctions/${auctionId}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể gia hạn thời gian");
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 text-slate-100">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-base font-bold flex items-center gap-2">
            <Clock size={18} className="text-amber-400" />
            Gia hạn thời gian
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2 text-sm text-slate-300">
          <p className="line-clamp-1 font-semibold text-white">{productName}</p>
          <p className="text-xs text-slate-400">
            Thời hạn hiện tại: {new Date(currentEndsAt).toLocaleString("vi-VN")}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400">Chọn thời gian thêm:</label>
          <div className="grid grid-cols-3 gap-2">
            {presets.map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => setMinutes(p.val)}
                className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  minutes === p.val
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                    : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleExtend}
            disabled={loading}
            className="flex-1 h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Clock size={16} />}
            <span>Xác nhận</span>
          </button>
        </div>
      </div>
    </div>
  );
}
