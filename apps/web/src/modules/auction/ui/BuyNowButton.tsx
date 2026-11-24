"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle, Loader2, Sparkles, X } from "lucide-react";
import { formatVND } from "@/lib/currency";
import { useBuyNowMutation } from "../client/queries";
import type { AuctionProductItem } from "../types";

export function BuyNowButton({
  auction,
}: {
  auction: AuctionProductItem;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const buyNowMutation = useBuyNowMutation(auction.id);

  if (!auction.bin_price || auction.status !== "active") {
    return null;
  }

  const handleConfirm = async () => {
    setErrorMsg(null);
    try {
      await buyNowMutation.mutateAsync();
      setModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể thực hiện mua ngay");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-sm"
      >
        <Sparkles size={16} />
        <span>Mua ngay (BIN): {formatVND(auction.bin_price)}</span>
      </button>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500" />
                Xác nhận Mua Ngay
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-sm text-foreground/90">
              <p>
                Bạn sắp chốt mua ngay sản phẩm{" "}
                <strong>{auction.product?.name ?? "đấu giá"}</strong> với mức giá:
              </p>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                <span className="font-mono text-xl font-bold text-amber-500">
                  {formatVND(auction.bin_price)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Sau khi xác nhận, phiên đấu giá sẽ <strong>kết thúc ngay lập tức</strong> và bạn sẽ trở thành người chiến thắng với {auction.winner_checkout_hours}h để hoàn tất đặt hàng.
              </p>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={buyNowMutation.isPending}
                className="flex-1 h-11 rounded-xl bg-surface-container hover:bg-surface-container-high text-foreground font-semibold text-sm transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={buyNowMutation.isPending}
                className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                {buyNowMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                <span>Xác nhận mua</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
