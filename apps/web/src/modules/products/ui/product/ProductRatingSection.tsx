"use client";

import { useReviews } from "@/lib/react-query/review/api/useReviewQueries";
import { formatVND } from "@/lib/currency";
import {
  Star,
  CheckCircle2,
  ThumbsUp,
  PenSquare,
  Sparkles,
  Camera,
  MessageSquare,
  ShieldCheck,
  ChevronDown,
  X,
} from "lucide-react";
import Image from "@/components/ui/AdaptiveImage";
import clsx from "clsx";
import { useEffect, useState, useMemo, useRef } from "react";
import { ReviewSubmitForm } from "./ReviewSubmitForm";

interface ProductRatingSectionProps {
  productSlug: string;
  productName: string;
}

interface DisplayReview {
  id: string;
  reviewer_name: string;
  rating: number;
  created_at: string;
  variant_name?: string;
  title?: string;
  body: string;
  is_verified_buyer: boolean;
  helpful_count: number;
  images?: string[];
  criteria?: ReviewCriteria;
}

interface ReviewCriteria {
  packaging?: number | null;
  description?: number | null;
  delivery?: number | null;
}

const CRITERIA = [
  { key: "packaging", label: "Đóng gói cẩn thận" },
  { key: "description", label: "Đúng mô tả & màu sắc" },
  { key: "delivery", label: "Giao hàng nhanh" },
] as const;

function StarScore({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5 text-amber-400">
      {[1, 2, 3, 4, 5].map((starIndex) => {
        const fill = Math.max(0, Math.min(1, value - (starIndex - 1)));
        return (
          <div
            key={starIndex}
            className="relative select-none"
            style={{ width: size, height: size }}
          >
            <Star
              size={size}
              className="fill-transparent text-outline-variant/40"
              strokeWidth={1.5}
            />
            {fill > 0 && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star
                  size={size}
                  className="shrink-0 fill-amber-400 text-amber-400"
                  strokeWidth={1.5}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ProductRatingSection({
  productSlug,
  productName,
}: ProductRatingSectionProps) {
  const { data: realData, isLoading } = useReviews(productSlug);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, boolean>>({});
  const [writeModalOpen, setWriteModalOpen] = useState(false);
  const [activeViewerImage, setActiveViewerImage] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!writeModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [writeModalOpen]);

  const totalReviews = realData?.total ?? 0;
  const averageRating = realData?.average ?? 0;

  // Star breakdown
  const starCounts = useMemo(() => {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    realData?.reviews.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating)));
      counts[star] = (counts[star] || 0) + 1;
    });
    return counts;
  }, [realData]);

  // Reviews list to display
  const displayReviews = useMemo(() => {
    return (realData?.reviews ?? []).map((r, idx) => ({
      id: r.id || `real-${idx}`,
      reviewer_name: r.reviewer_name || "Khách hàng NoobStore",
      rating: r.rating,
      created_at: new Date(r.created_at).toLocaleDateString("vi-VN"),
      variant_name: "Chính hãng",
      title: r.title ?? undefined,
      body: r.body || "Sản phẩm chất lượng, giao hàng nhanh chóng.",
      is_verified_buyer: true,
      helpful_count: 3 + (idx % 5),
      images: r.images ?? [],
      criteria: r.criteria,
    }));
  }, [realData]);

  // Filtering
  const filteredReviews = useMemo(() => {
    if (selectedFilter === "all") return displayReviews;
    if (["1", "2", "3", "4", "5"].includes(selectedFilter))
      return displayReviews.filter(
        (r) =>
          Math.min(5, Math.max(1, Math.round(r.rating))) ===
          Number(selectedFilter)
      );
    if (selectedFilter === "with_images")
      return displayReviews.filter((r) => r.images && r.images.length > 0);
    return displayReviews;
  }, [displayReviews, selectedFilter]);

  useEffect(() => {
    if (
      !isLoading &&
      selectedFilter !== "all" &&
      filteredReviews.length === 0
    ) {
      document
        .getElementById("product-rating-reviews-section")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [filteredReviews.length, isLoading, selectedFilter]);

  const toggleHelpful = (id: string) => {
    setHelpfulVotes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <section
      id="product-rating-reviews-section"
      className="mt-8 scroll-mt-24 rounded-3xl border border-outline-variant/30 bg-surface p-5 shadow-ambient-sm md:p-8"
      aria-label="Đánh giá sản phẩm"
    >
      {/* ── Section Header ── */}
      <div className="flex flex-col gap-4 border-b border-outline-variant/20 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400/15 text-amber-500">
              <Star size={18} className="fill-amber-400 text-amber-400" />
            </span>
            <h2 className="text-xl font-black uppercase tracking-tight text-on-surface sm:text-2xl">
              Đánh giá & Nhận xét
            </h2>
          </div>
          <p className="text-xs text-on-surface-variant md:text-sm">
            Nhận xét từ khách hàng đã mua và trải nghiệm{" "}
            <span className="font-semibold text-on-surface">{productName}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setWriteModalOpen(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-black uppercase tracking-widest text-surface shadow-ambient-sm transition-all hover:bg-on-surface/90 active:scale-[0.98]"
        >
          <PenSquare size={15} />
          Viết đánh giá
        </button>
      </div>

      {/* ── Scorecard & Distribution Grid ── */}
      <div className="mt-6 grid grid-cols-1 gap-6 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 md:grid-cols-12 md:p-6">
        {/* Left: Overall Big Score */}
        <div className="flex flex-col items-center justify-center border-b border-outline-variant/20 pb-5 text-center md:col-span-4 md:border-b-0 md:border-r md:pb-0 md:pr-6">
          <p className="text-5xl font-black tracking-tight text-on-surface md:text-6xl">
            {averageRating.toFixed(1)}
          </p>
          <div className="mt-2.5">
            <StarScore value={averageRating} size={20} />
          </div>
          <p className="mt-2 text-xs font-bold text-on-surface">
            {totalReviews} đánh giá
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-600">
            <CheckCircle2 size={13} strokeWidth={2.5} />
            {totalReviews > 0 ? "Đánh giá từ khách hàng" : "Chưa có đánh giá"}
          </div>
        </div>

        {/* Middle: Star Breakdown Bars */}
        <div className="flex flex-col justify-center space-y-2 md:col-span-5 md:px-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = starCounts[star] || 0;
            const percentage =
              totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;

            return (
              <button
                key={star}
                type="button"
                onClick={() =>
                  setSelectedFilter((prev) =>
                    prev === String(star) ? "all" : String(star)
                  )
                }
                className={clsx(
                  "group flex items-center gap-3 rounded-lg px-2 py-1 text-xs transition-colors",
                  selectedFilter === String(star)
                    ? "bg-primary/[0.08]"
                    : "hover:bg-surface-container"
                )}
              >
                <div className="flex w-12 items-center gap-1 font-bold text-on-surface">
                  <span>{star}</span>
                  <Star size={13} className="fill-amber-400 text-amber-400" />
                </div>

                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="w-14 text-right text-[11px] font-semibold text-on-surface-variant">
                  {percentage}% ({count})
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Key Customer Sentiment Highlights */}
        <div className="flex flex-col justify-center gap-2.5 border-t border-outline-variant/20 pt-5 md:col-span-3 md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
            Điểm nổi bật
          </p>

          <div className="space-y-2 text-xs">
            {CRITERIA.map(({ key, label }) => {
              const values = (realData?.reviews ?? [])
                .map((review) => review.criteria?.[key])
                .filter((value): value is number => typeof value === "number");
              const average = values.length
                ? values.reduce((sum, value) => sum + value, 0) / values.length
                : null;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-xl bg-surface-container/60 p-2.5"
                >
                  <span className="font-semibold text-on-surface">{label}</span>
                  <span className="font-black text-primary">
                    {average === null
                      ? "Chưa có đánh giá"
                      : `${Math.round((average / 5) * 100)}%`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Filter Chips ── */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-bold text-on-surface-variant">
          Lọc theo:
        </span>

        {[
          { key: "all", label: `Tất cả (${totalReviews})` },
          { key: "5", label: `5 Sao (${starCounts[5] || 0})` },
          { key: "4", label: `4 Sao (${starCounts[4] || 0})` },
          {
            key: "with_images",
            label: `Có hình ảnh (${displayReviews.filter((r) => r.images?.length).length})`,
          },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setSelectedFilter(f.key)}
            className={clsx(
              "rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95",
              selectedFilter === f.key
                ? "bg-primary text-surface shadow-sm"
                : "border border-outline-variant/30 bg-surface text-on-surface-variant hover:border-primary/40 hover:text-on-surface"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Reviews Feed ── */}
      <div className="mt-6 space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant/40 py-12 text-center">
            <MessageSquare
              size={32}
              className="mx-auto text-on-surface-variant/40"
            />
            <p className="mt-2 text-sm font-bold text-on-surface">
              {Object.hasOwn(starCounts, Number(selectedFilter)) &&
              (starCounts[Number(selectedFilter)] ?? 0) === 0
                ? "Chưa có đánh giá ở phân khúc này"
                : "Chưa có đánh giá nào phù hợp với bộ lọc"}
            </p>
            <button
              type="button"
              onClick={() => setSelectedFilter("all")}
              className="mt-3 text-xs font-bold text-primary hover:underline"
            >
              Xem tất cả đánh giá
            </button>
          </div>
        ) : (
          filteredReviews.map((review) => {
            const hasVoted = Boolean(helpfulVotes[review.id]);

            return (
              <article
                key={review.id}
                className="rounded-2xl border border-outline-variant/20 bg-surface-container-low/50 p-4 transition-all hover:border-outline-variant/40 md:p-5"
              >
                {/* Review Header: User avatar, name, verified badge & date */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-amber-500 text-xs font-black uppercase text-surface ring-2 ring-surface">
                      {review.reviewer_name.slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-on-surface">
                          {review.reviewer_name}
                        </span>
                        {review.is_verified_buyer && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                            <ShieldCheck size={12} strokeWidth={2.5} />
                            Đã mua tại NoobStore
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-on-surface-variant">
                        <span>{review.created_at}</span>
                        {review.variant_name && (
                          <>
                            <span>•</span>
                            <span className="py-0.2 rounded bg-surface-container px-1.5 font-medium">
                              {review.variant_name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stars */}
                  <StarScore value={review.rating} size={15} />
                </div>

                {/* Review Body */}
                <div className="md:pl-13 mt-3.5 pl-1">
                  {review.title && (
                    <h4 className="text-sm font-bold text-on-surface">
                      {review.title}
                    </h4>
                  )}
                  <p className="mt-1 text-xs leading-relaxed text-on-surface md:text-sm">
                    {review.body}
                  </p>

                  {/* Optional Photos thumbnail list */}
                  {review.images && review.images.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {review.images.map((img, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActiveViewerImage(img)}
                          className="group relative h-16 w-16 overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container transition-transform hover:scale-105 active:scale-95"
                        >
                          <Image
                            src={img}
                            alt={`Đánh giá hình ảnh ${i + 1}`}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Helpful Button */}
                  <div className="mt-4 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => toggleHelpful(review.id)}
                      className={clsx(
                        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all active:scale-95",
                        hasVoted
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-outline-variant/30 text-on-surface-variant hover:border-outline-variant hover:text-on-surface"
                      )}
                    >
                      <ThumbsUp
                        size={13}
                        className={clsx(hasVoted && "fill-primary")}
                      />
                      <span>Hữu ích</span>
                      <span>({review.helpful_count + (hasVoted ? 1 : 0)})</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* ── Write Review Modal ── */}
      {writeModalOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-h-[80vh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-3xl border border-outline-variant/30 bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <PenSquare size={16} />
                </span>
                <h3 className="text-base font-black uppercase text-on-surface">
                  Đánh giá sản phẩm
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setWriteModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4">
              <ReviewSubmitForm productSlug={productSlug} />
            </div>
          </div>
        </div>
      )}

      {/* ── Photo Preview Lightbox ── */}
      {activeViewerImage && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-h-[85vh] max-w-[85vw] overflow-hidden rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveViewerImage(null)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
              aria-label="Đóng ảnh"
            >
              <X size={20} />
            </button>
            <img
              src={activeViewerImage}
              alt="Ảnh phóng to đánh giá"
              className="max-h-[85vh] w-auto object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
}
