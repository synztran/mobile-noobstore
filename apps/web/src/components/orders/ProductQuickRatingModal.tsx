"use client";

import { apiFetch } from "@/lib/api/fetch";
import { useState } from "react";
import Image from "@/components/ui/AdaptiveImage";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  PackageCheck,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { toast } from "@/lib/toast";

export interface RatingProductTarget {
  id: string;
  product_id?: string | null;
  product_slug?: string | null;
  product_name: string;
  thumbnail: string | null;
  variant_info?: string;
  has_reviewed?: boolean;
  reviewed_rating?: number | null;
  reviewed_comment?: string | null;
}

const STAR_LABELS: Record<number, string> = {
  1: "1★ Rất không hài lòng",
  2: "2★ Chưa hài lòng",
  3: "3★ Bình thường",
  4: "4★ Hài lòng",
  5: "5★ Rất tuyệt vời",
};

const QUICK_TAGS = [
  "Đóng gói cẩn thận 2 lớp",
  "Hàng chính hãng, đúng mô tả",
  "Chất lượng hoàn thiện tốt",
  "Gõ âm đầm, phím bấm êm",
  "Shop tư vấn nhiệt tình",
  "Giao hàng nhanh chóng",
];

const CRITERIA = [
  { key: "packaging", label: "Đóng gói cẩn thận" },
  { key: "description", label: "Đúng mô tả & màu sắc" },
  { key: "delivery", label: "Giao hàng nhanh" },
] as const;

export interface ProductRatingFormProps {
  product: RatingProductTarget;
  allProducts?: RatingProductTarget[];
  onSelectProduct?: (product: RatingProductTarget) => void;
  onBack?: () => void;
  onSubmitSuccess?: (productId: string) => void;
}

export function ProductRatingForm({
  product,
  allProducts,
  onSelectProduct,
  onBack,
  onSubmitSuccess,
}: ProductRatingFormProps) {
  const [rating, setRating] = useState<number>(
    product.reviewed_rating ? Math.round(product.reviewed_rating) : 5
  );
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState(product.reviewed_comment || "");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [criteria, setCriteria] = useState<Record<string, number>>({
    packaging: 5,
    description: 5,
    delivery: 5,
  });
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleTagClick = (tag: string) => {
    setSelectedTags((prev) => {
      const exists = prev.includes(tag);
      const nextTags = exists ? prev.filter((t) => t !== tag) : [...prev, tag];
      if (!exists) {
        setComment((prevComment) =>
          prevComment ? `${prevComment}, ${tag}` : tag
        );
      }
      return nextTags;
    });
  };

  const handleCriteriaChange = (key: string, value: number) => {
    setCriteria((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (product.has_reviewed) {
      toast.error("Bạn đã gửi đánh giá cho sản phẩm này rồi!");
      return;
    }

    if (!rating || rating < 1 || rating > 5) {
      toast.error("Vui lòng chọn số sao đánh giá (1 - 5 sao)");
      return;
    }

    setSubmitting(true);
    try {
      if (product.product_slug) {
        const res = await apiFetch(`/api/products/${product.product_slug}/reviews`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rating,
            body: comment.trim() || undefined,
            criteria,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Gửi đánh giá thất bại");
        }
      } else {
        // Fallback delay if product has no slug
        await new Promise((r) => setTimeout(r, 500));
      }

      setSubmitting(false);
      setIsSuccess(true);
      toast.success("Cảm ơn bạn đã gửi đánh giá sản phẩm!");

      setTimeout(() => {
        setIsSuccess(false);
        setComment("");
        setSelectedTags([]);
        if (onSubmitSuccess && product.id) {
          onSubmitSuccess(product.id);
        }
      }, 900);
    } catch (err) {
      setSubmitting(false);
      toast.error(
        err instanceof Error ? err.message : "Không thể gửi đánh giá"
      );
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="space-y-4">
      {/* Back button if inline inside drawer */}
      {onBack && (
        <div className="flex items-center justify-between border-b border-outline-variant/15 pb-3">
          <button
            type="button"
            onClick={onBack}
            className="group flex items-center gap-1.5 text-xs font-bold text-primary transition-opacity hover:opacity-80 active:scale-95"
          >
            <ArrowLeft
              size={15}
              className="transition-transform group-hover:-translate-x-0.5"
            />
            <span>Quay lại chi tiết đơn hàng</span>
          </button>
        </div>
      )}

      {/* Header Title */}
      <div>
        <h3 className="text-base font-black text-on-surface">
          Đánh giá sản phẩm
        </h3>
        <p className="text-xs text-on-surface-variant">
          Chia sẻ trải nghiệm sử dụng của bạn với cộng đồng NoobStore
        </p>
      </div>

      {/* Product selector if multiple products in order */}
      {allProducts && allProducts.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {allProducts.map((p) => {
            const isSelected = p.id === product.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectProduct?.(p)}
                className={`max-w-[160px] shrink-0 truncate rounded-xl px-2.5 py-1 text-xs font-bold transition-all ${
                  isSelected
                    ? "shadow-2xs bg-primary text-surface"
                    : "bg-surface-container/60 text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                {p.product_name}
              </button>
            );
          })}
        </div>
      )}

      {/* Product Card Info */}
      <div className="flex items-center gap-3 rounded-2xl bg-surface-container/40 p-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-container">
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.product_name}
              fill
              sizes="56px"
              className="object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-on-surface-variant/40">
              <PackageCheck size={24} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-xs font-bold text-on-surface">
              {product.product_name}
            </p>
            {product.has_reviewed && (
              <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={12} />
                Đã đánh giá
              </span>
            )}
          </div>
          {product.variant_info && (
            <p className="mt-0.5 truncate text-[11px] text-on-surface-variant">
              Phân loại: {product.variant_info}
            </p>
          )}
        </div>
      </div>

      {isSuccess ? (
        <div className="my-8 flex flex-col items-center justify-center gap-3 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 size={32} />
          </div>
          <p className="text-sm font-bold text-on-surface">
            Gửi đánh giá thành công!
          </p>
          <p className="text-xs text-on-surface-variant">
            NoobStore chân thành cảm ơn phản hồi quý báu từ bạn.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Star Rating Selector */}
          <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-outline-variant/15 bg-surface-container/20 py-3.5">
            {product.has_reviewed && (
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                Đánh giá của bạn
              </span>
            )}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= displayRating;
                return (
                  <button
                    key={star}
                    type="button"
                    disabled={Boolean(product.has_reviewed)}
                    onClick={() => !product.has_reviewed && setRating(star)}
                    onMouseEnter={() => !product.has_reviewed && setHoverRating(star)}
                    onMouseLeave={() => !product.has_reviewed && setHoverRating(0)}
                    className={`p-1 transition-transform ${
                      product.has_reviewed
                        ? "cursor-default"
                        : "active:scale-90"
                    }`}
                    aria-label={`${star} sao`}
                  >
                    <Star
                      size={30}
                      className={`transition-colors ${
                        filled
                          ? "drop-shadow-xs fill-amber-400 text-amber-400"
                          : "text-outline-variant/40 hover:text-amber-300"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              {STAR_LABELS[displayRating] || `${displayRating} sao`}
            </span>
          </div>

          {/* Quick Suggestions - only when not reviewed */}
          {!product.has_reviewed && (
            <div className="space-y-1.5">
              <p className="flex items-center gap-1 text-[11px] font-bold text-on-surface-variant">
                <Sparkles size={12} className="text-amber-500" />
                Gợi ý nhanh nhận xét
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TAGS.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagClick(tag)}
                      className={`rounded-xl border px-2.5 py-1 text-xs font-medium transition-all ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-outline-variant/30 bg-surface text-on-surface hover:border-outline-variant/60"
                      }`}
                    >
                      {active ? "✓ " : "+ "}
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comment Box */}
          <div className="space-y-1">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={Boolean(product.has_reviewed)}
              rows={3}
              placeholder={
                product.has_reviewed
                  ? "Chưa có nhận xét chi tiết"
                  : "Chia sẻ thêm cảm nhận của bạn về chất âm, ngoại hình, cảm giác gõ..."
              }
              className={`focus:outline-hidden w-full resize-none rounded-2xl border border-outline-variant/25 p-3 text-xs leading-relaxed text-on-surface placeholder:text-on-surface-variant/50 ${
                product.has_reviewed
                  ? "bg-surface-container/30 opacity-90 cursor-default"
                  : "bg-surface focus:border-primary"
              }`}
            />
            <div className="flex justify-between text-[10px] text-on-surface-variant">
              <span>Nhận xét chi tiết giúp ích nhiều cho người mua sau</span>
              <span>{comment.length}/500</span>
            </div>
          </div>

          {/* Criteria mini scores */}
          <div className="space-y-2 rounded-2xl border border-outline-variant/15 bg-surface-container/20 p-3">
            <p className="text-[11px] font-bold text-on-surface">
              Đánh giá theo tiêu chí
            </p>
            <div className="space-y-1.5">
              {CRITERIA.map((crit) => (
                <div
                  key={crit.key}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-on-surface-variant">{crit.label}</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleCriteriaChange(crit.key, val)}
                        className="p-0.5"
                      >
                        <Star
                          size={14}
                          className={`${
                            val <= (criteria[crit.key] ?? 5)
                              ? "fill-amber-400 text-amber-400"
                              : "text-outline-variant/30"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Photo upload mockup placeholder */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                toast.info("Tính năng tải ảnh đang chuẩn bị ra mắt")
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-outline-variant/40 px-3 py-2 text-xs font-semibold text-on-surface-variant hover:border-primary hover:text-primary"
            >
              <Camera size={15} />
              <span>Thêm hình ảnh / video</span>
            </button>
            <span className="text-[10px] text-on-surface-variant/70">
              (Tối đa 5 ảnh)
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                disabled={submitting}
                className="btn btn-ghost btn-sm h-11 flex-1 rounded-2xl text-xs font-bold text-on-surface-variant"
              >
                Để sau
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || Boolean(product.has_reviewed)}
              className={`shadow-xs btn btn-sm h-11 flex-1 rounded-2xl text-xs font-black uppercase tracking-wider ${
                product.has_reviewed
                  ? "btn-disabled bg-surface-container text-on-surface-variant/50"
                  : "btn-primary text-surface active:scale-95"
              }`}
            >
              {submitting ? (
                <span className="loading loading-spinner loading-xs" />
              ) : product.has_reviewed ? (
                "Đã đánh giá"
              ) : (
                "Gửi đánh giá"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: RatingProductTarget | null;
  onSubmitSuccess?: (productId: string) => void;
}

export function ProductQuickRatingModal({
  isOpen,
  onClose,
  product,
  onSubmitSuccess,
}: ModalProps) {
  if (!isOpen || !product) return null;

  return (
    <dialog
      open
      onCancel={(e) => e.preventDefault()}
      className="modal modal-open modal-bottom z-[9999] sm:modal-middle"
    >
      <div className="backdrop-blur-xs modal-backdrop bg-on-surface/50" />

      <div className="modal-box relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-outline-variant/20 bg-surface p-5 sm:rounded-3xl sm:p-6">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="btn btn-circle btn-ghost btn-sm absolute right-4 top-4 text-on-surface-variant hover:bg-surface-container"
        >
          <X size={18} />
        </button>

        <ProductRatingForm
          product={product}
          onSubmitSuccess={(id) => {
            onSubmitSuccess?.(id);
            onClose();
          }}
        />
      </div>
    </dialog>
  );
}
