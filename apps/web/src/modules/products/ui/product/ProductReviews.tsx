"use client";

import { useReviews } from "@/lib/react-query/review/api/useReviewQueries";
import { motion } from "framer-motion";
import clsx from "clsx";
import { ReviewSubmitForm } from "./ReviewSubmitForm";

interface Props {
  productSlug: string;
}

function StarRating({
  value,
  size = "sm",
}: {
  value: number;
  size?: "sm" | "lg";
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className="cursor-default">
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
        </span>
      ))}
    </div>
  );
}

export function ProductReviews({ productSlug }: Props) {
  const { data, isLoading } = useReviews(productSlug);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse space-y-2 rounded-2xl bg-surface-container p-4"
          >
            <div className="h-3 w-24 rounded bg-surface-container-high" />
            <div className="h-3 w-full rounded bg-surface-container-high" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      {data && data.total > 0 && (
        <div className="flex items-center gap-4 rounded-2xl bg-surface-container p-4">
          <div className="text-center">
            <p className="text-3xl font-black text-on-surface">
              {data.average}
            </p>
            <StarRating value={Math.round(data.average)} />
            <p className="mt-1 text-[10px] text-on-surface-variant">
              {data.total} đánh giá
            </p>
          </div>
          <div className="flex flex-1 flex-col gap-1">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = data.reviews.filter(
                (r) => r.rating === star
              ).length;
              const pct = data.total > 0 ? (count / data.total) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-right text-on-surface-variant">
                    {star}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3 w-3 text-amber-400"
                    fill="currentColor"
                  >
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-high">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Review list */}
      {data && data.reviews.length > 0 ? (
        data.reviews.map((review, i) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3, ease: "easeOut" }}
            className="space-y-1.5 rounded-2xl bg-surface-container-lowest p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StarRating value={review.rating} />
                {review.title && (
                  <p className="text-xs font-bold text-on-surface">
                    {review.title}
                  </p>
                )}
              </div>
              <p className="text-[10px] text-on-surface-variant">
                {new Date(review.created_at).toLocaleDateString("vi-VN")}
              </p>
            </div>
            <p className="text-xs text-on-surface-variant">
              {review.reviewer_name}
            </p>
            {review.body && (
              <p className="text-xs leading-relaxed text-on-surface">
                {review.body}
              </p>
            )}
          </motion.div>
        ))
      ) : (
        <p className="py-4 text-center text-sm text-on-surface-variant">
          Chưa có đánh giá nào.
        </p>
      )}

      {/* Submit form */}
      <ReviewSubmitForm productSlug={productSlug} />
    </div>
  );
}
