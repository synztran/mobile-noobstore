"use client";

import { useAuth } from "@/lib/auth/AuthProvider";
import { usePurchaseCheck } from "@/lib/react-query/review/api/usePurchaseCheck";
import { useSubmitReview } from "@/lib/react-query/review/api/useReviewMutations";
import { toast } from "@/lib/toast";
import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";

interface Props {
  productSlug: string;
}

function StarRating({
  value,
  onChange,
  size = "sm",
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: "sm" | "lg";
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          disabled={!onChange}
          className={clsx(
            "transition-colors",
            onChange && "hover:scale-110 active:scale-90",
            !onChange && "cursor-default"
          )}
        >
          <svg
            viewBox="0 0 24 24"
            className={clsx(
              size === "lg" ? "h-6 w-6" : "h-4 w-4",
              star <= value ? "text-amber-400" : "text-outline-variant"
            )}
            fill="currentColor"
          >
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export function ReviewSubmitForm({ productSlug }: Props) {
  const { user } = useAuth();
  const { data: purchaseData, isLoading: purchaseLoading } = usePurchaseCheck(
    productSlug,
    !!user
  );
  const submitReview = useSubmitReview(productSlug);
  const [formRating, setFormRating] = useState(5);
  const [formBody, setFormBody] = useState("");

  const handleSubmit = async () => {
    submitReview.mutate(
      { rating: formRating, body: formBody || undefined },
      {
        onSuccess: () => {
          toast.success("Đã gửi đánh giá");
          setFormBody("");
          setFormRating(5);
        },
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Gửi đánh giá thất bại"
          ),
      }
    );
  };

  if (!user) {
    return (
      <div className="rounded-2xl bg-surface-container p-4 text-center">
        <p className="text-xs text-on-surface-variant">
          Vui lòng{" "}
          <Link href="/login" className="font-bold text-primary hover:underline">
            đăng nhập
          </Link>{" "}
          để viết đánh giá.
        </p>
      </div>
    );
  }

  if (purchaseLoading) {
    return (
      <div className="animate-pulse space-y-2 rounded-2xl bg-surface-container p-4">
        <div className="h-3 w-32 rounded bg-surface-container-high" />
        <div className="h-3 w-48 rounded bg-surface-container-high" />
      </div>
    );
  }

  if (!purchaseData?.can_review) {
    if (purchaseData?.has_reviewed) {
      return (
        <div className="rounded-2xl bg-surface-container p-4 text-center">
          <p className="text-xs text-on-surface-variant">
            Bạn đã đánh giá sản phẩm này rồi.
          </p>
        </div>
      );
    }
    return (
      <div className="rounded-2xl bg-surface-container p-4 text-center">
        <p className="text-xs text-on-surface-variant">
          Chỉ khách hàng đã mua sản phẩm này mới có thể viết đánh giá.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl bg-surface-container p-4">
      {/* Purchased items */}
      {purchaseData.purchased_items.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
            Sản phẩm bạn đã mua
          </p>
          {purchaseData.purchased_items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-surface p-2">
              {item.thumbnail && (
                <img
                  src={item.thumbnail}
                  alt={item.product_name}
                  className="h-10 w-10 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-on-surface">
                  {item.product_name}
                </p>
                <p className="truncate text-[10px] text-on-surface-variant">
                  {item.variant_summary}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rating + body */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-wider text-on-surface-variant">
            Đánh giá của bạn
          </p>
          <StarRating value={formRating} onChange={setFormRating} size="lg" />
        </div>
        <textarea
          value={formBody}
          onChange={(e) => setFormBody(e.target.value)}
          placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
          rows={3}
          className="w-full resize-none rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitReview.isPending}
          className="w-full rounded-xl bg-primary py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
        >
          {submitReview.isPending ? "Đang gửi..." : "Gửi đánh giá"}
        </button>
      </div>
    </div>
  );
}
