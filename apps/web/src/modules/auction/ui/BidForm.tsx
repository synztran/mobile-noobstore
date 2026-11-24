"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Gavel, Loader2, Lock } from "lucide-react";
import { formatVND } from "@/lib/currency";
import { toast } from "@/lib/toast";
import { usePlaceBidMutation } from "../client/queries";
import type { AuctionEligibility, AuctionProductItem } from "../types";

export function BidForm({
  auction,
  eligibility,
}: {
  auction: AuctionProductItem;
  eligibility?: AuctionEligibility;
}) {
  const bidIncrement = auction.increment_type === "percentage"
    ? Math.max(1000, Math.round(auction.current_price * auction.increment_value / 100))
    : auction.increment_value;
  const minBid = eligibility?.min_next_bid || auction.current_price + bidIncrement;
  const [bidAmount, setBidAmount] = useState<number>(minBid);
  const [inputValue, setInputValue] = useState<string>(new Intl.NumberFormat("vi-VN").format(minBid));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const placeBidMutation = usePlaceBidMutation(auction.id);
  const isBuyNowBid = auction.bin_price !== null && bidAmount >= auction.bin_price;
  const isAlreadyHighestBidder = eligibility?.code === "already_highest_bidder";

  // Sync minBid whenever current_price changes
  useEffect(() => {
    if (bidAmount < minBid) {
      setBidAmount(minBid);
      setInputValue(new Intl.NumberFormat("vi-VN").format(minBid));
    }
  }, [minBid, bidAmount]);

  const handleQuickAdd = (increment: number) => {
    const nextVal = Math.max(minBid, bidAmount + increment);
    setBidAmount(nextVal);
    setInputValue(new Intl.NumberFormat("vi-VN").format(nextVal));
    setErrorMsg(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    if (!raw) {
      setBidAmount(0);
      setInputValue("");
      return;
    }
    const num = parseInt(raw, 10);
    setBidAmount(num);
    setInputValue(new Intl.NumberFormat("vi-VN").format(num));
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (bidAmount < minBid) {
      setErrorMsg(`Mức giá phải tối thiểu từ ${formatVND(minBid)}`);
      return;
    }
    if (!isBuyNowBid && (bidAmount - minBid) % bidIncrement !== 0) {
      setErrorMsg(`Mức giá cần tăng theo bước ${formatVND(bidIncrement)} từ ${formatVND(minBid)}`);
      return;
    }

    try {
      const res = await placeBidMutation.mutateAsync(bidAmount);
      toast.success(res.is_extended
        ? "Đặt giá thành công! Phiên đấu giá được gia hạn thêm 5 phút."
        : "Đặt giá thành công!");
    } catch (err: any) {
      setErrorMsg(err.message || "Đặt giá thất bại, vui lòng thử lại");
    }
  };

  // If user is not eligible to bid
  if (eligibility && !eligibility.can_bid && !isAlreadyHighestBidder) {
    return (
      <div className="p-4 rounded-xl bg-surface-container border border-border text-center space-y-2">
        <div className="inline-flex p-2 rounded-full bg-amber-500/10 text-amber-500 mb-1">
          {eligibility.code === "already_highest_bidder" ? (
            <CheckCircle2 size={24} />
          ) : (
            <Lock size={24} />
          )}
        </div>
        <h4 className="text-sm font-semibold text-foreground">
          {eligibility.message || "Không thể đặt giá lúc này"}
        </h4>
        <div className="text-xs text-muted-foreground space-y-1">
          {eligibility.required_level > 0 && (
            <p>
              Cấp bậc yêu cầu: <strong>Level {eligibility.required_level}</strong> (Hiện tại: Level {eligibility.user_level})
            </p>
          )}
          {eligibility.required_orders > 0 && (
            <p>
              Đơn hàng yêu cầu: <strong>{eligibility.required_orders} đơn</strong> (Hiện tại: {eligibility.user_orders} đơn)
            </p>
          )}
          {eligibility.max_bids && (
            <p>
              Lượt bid đã dùng: <strong>{eligibility.bids_placed}/{eligibility.max_bids} lượt</strong>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Tăng nhanh mức giá:</span>
        <span className="text-[11px] text-muted-foreground font-mono">
          Tối thiểu: {formatVND(minBid)}
        </span>
      </div>

      {/* Quick Increments: +50k, +100k, +200k, +500k */}
      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => handleQuickAdd(50_000)}
          disabled={placeBidMutation.isPending}
          className="py-2 rounded-xl text-xs font-bold bg-surface-container hover:bg-surface-container-high border border-border text-foreground transition-all active:scale-95 disabled:opacity-50"
        >
          +50k
        </button>
        <button
          type="button"
          onClick={() => handleQuickAdd(100_000)}
          disabled={placeBidMutation.isPending}
          className="py-2 rounded-xl text-xs font-bold bg-surface-container hover:bg-surface-container-high border border-border text-foreground transition-all active:scale-95 disabled:opacity-50"
        >
          +100k
        </button>
        <button
          type="button"
          onClick={() => handleQuickAdd(200_000)}
          disabled={placeBidMutation.isPending}
          className="py-2 rounded-xl text-xs font-bold bg-surface-container hover:bg-surface-container-high border border-border text-foreground transition-all active:scale-95 disabled:opacity-50"
        >
          +200k
        </button>
        <button
          type="button"
          onClick={() => handleQuickAdd(500_000)}
          disabled={placeBidMutation.isPending}
          className="py-2 rounded-xl text-xs font-bold bg-surface-container hover:bg-surface-container-high border border-border text-foreground transition-all active:scale-95 disabled:opacity-50"
        >
          +500k
        </button>
      </div>

      {/* Bid Input Field */}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          disabled={placeBidMutation.isPending}
          aria-label="Nhập giá muốn đặt"
          aria-invalid={Boolean(errorMsg)}
          className="w-full h-12 px-4 pr-16 rounded-2xl bg-white border border-surface-border text-foreground font-mono font-extrabold text-base focus:border-primary focus:outline-none transition-colors shadow-2xs"
          placeholder="Nhập giá muốn đặt..."
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
          VND
        </span>
      </div>

      {errorMsg && (
        <div role="alert" className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
          <AlertCircle size={15} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={placeBidMutation.isPending || bidAmount < minBid || isAlreadyHighestBidder}
        className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-content font-extrabold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none"
      >
        {placeBidMutation.isPending ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Đang gửi giá đặt...</span>
          </>
        ) : (
          <>
            <Gavel size={18} />
            <span>Xác nhận đặt giá {formatVND(bidAmount)}</span>
          </>
        )}
      </button>

      {auction.anti_snipe_minutes > 0 && (
        <p className="text-[11px] text-center text-muted-foreground">
          ⚡ <strong>Quy tắc bù giờ:</strong> Đặt giá trong {auction.anti_snipe_minutes} phút cuối sẽ tự động gia hạn thêm {auction.anti_snipe_minutes} phút.
        </p>
      )}
    </form>
  );
}
