"use client";

import { useAuth } from "@/modules/user/client/AuthProvider";
import { usePurchaseCheck } from "@/lib/react-query/review/api/usePurchaseCheck";
import { useSubmitReview } from "@/lib/react-query/review/api/useReviewMutations";
import { toast } from "@/lib/toast";
import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, ChangeEvent, DragEvent } from "react";
import { Star, Camera, X, Loader2, Sparkles, Check } from "lucide-react";

interface Props {
  productSlug: string;
}

const QUICK_SUGGESTIONS = [
  "Đóng gói cẩn thận 2 lớp chống sốc",
  "Keycap hoàn thiện đanh mịn, font in sắc nét",
  "Màu sắc retro đúng như mô tả",
  "Gõ âm đầm chắc, chân stem khít",
  "Giao hàng nhanh, hộp nguyên seal",
  "Shop tư vấn nhiệt tình, 10/10",
];

const RATING_PRESETS = [
  { val: 5.0, label: "5.0 ★ Tuyệt vời" },
  { val: 4.5, label: "4.5 ★ Rất tốt" },
  { val: 4.0, label: "4.0 ★ Hài lòng" },
  { val: 3.5, label: "3.5 ★ Khá ổn" },
];

const REVIEW_CRITERIA = [
  { key: "packaging", label: "Đóng gói cẩn thận" },
  { key: "description", label: "Đúng mô tả & màu sắc" },
  { key: "delivery", label: "Giao hàng nhanh" },
] as const;
type ReviewCriteriaKey = (typeof REVIEW_CRITERIA)[number]["key"];

function StarRating({
  value,
  onChange,
  size = "md",
  allowHalf = true,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: "sm" | "md" | "lg";
  allowHalf?: boolean;
}) {
  const starDimensions = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-7 w-7",
  }[size];

  return (
    <div
      className="flex items-center gap-1.5"
      role="radiogroup"
      aria-label="Đánh giá sao"
    >
      {[1, 2, 3, 4, 5].map((starIndex) => {
        // Calculate fill percentage: 0, 0.5, or 1.0
        const fill = Math.max(0, Math.min(1, value - (starIndex - 1)));

        return (
          <div
            key={starIndex}
            className={clsx("relative select-none", starDimensions)}
          >
            {/* Background base empty star */}
            <Star
              className={clsx(
                starDimensions,
                "fill-transparent text-outline-variant/40"
              )}
              strokeWidth={1.5}
            />

            {/* Overlay filled portion (supports half and full stars) */}
            {fill > 0 && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star
                  className={clsx(
                    starDimensions,
                    "shrink-0 fill-amber-400 text-amber-400"
                  )}
                  strokeWidth={1.5}
                />
              </div>
            )}

            {/* Left half clickable area for half-star (e.g. 4.5) */}
            {onChange && (
              <>
                {allowHalf && (
                  <button
                    type="button"
                    onClick={() => onChange(starIndex - 0.5)}
                    className="absolute bottom-0 left-0 top-0 z-10 w-1/2 cursor-pointer"
                    title={`${starIndex - 0.5} sao`}
                    aria-label={`${starIndex - 0.5} sao`}
                  />
                )}
                {/* Right half clickable area for full star (e.g. 5.0) */}
                <button
                  type="button"
                  onClick={() => onChange(starIndex)}
                  className={clsx(
                    "absolute bottom-0 top-0 z-10 cursor-pointer",
                    allowHalf ? "right-0 w-1/2" : "inset-x-0 w-full"
                  )}
                  title={`${starIndex} sao`}
                  aria-label={`${starIndex} sao`}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ImageItem {
  file: File;
  previewUrl: string;
  uploadedUrl?: string;
}

export function ReviewSubmitForm({ productSlug }: Props) {
  const { user } = useAuth();
  const { data: purchaseData, isLoading: purchaseLoading } = usePurchaseCheck(
    productSlug,
    !!user
  );
  const submitReview = useSubmitReview(productSlug);
  const [formRating, setFormRating] = useState<number>(5);
  const [criteria, setCriteria] = useState<
    Record<ReviewCriteriaKey, number | null>
  >({
    packaging: null,
    description: null,
    delivery: null,
  });
  const [formBody, setFormBody] = useState("");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const pathname = usePathname();
  const returnTarget = `${pathname || `/shop/${productSlug}`}#product-rating-reviews-section`;
  const loginUrl = `/login?next=${encodeURIComponent(returnTarget)}`;

  const handleFilesSelected = (e: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addFiles = (files: File[]) => {
    if (!files.length) return;

    const availableSlots = Math.max(0, 4 - images.length);
    if (files.length > availableSlots) {
      toast.error(`Chỉ có thể thêm tối đa ${availableSlots} ảnh nữa`);
    }

    const newItems: ImageItem[] = [];
    for (const file of files.slice(0, availableSlots)) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`Ảnh ${file.name} vượt quá dung lượng 5MB`);
        continue;
      }
      newItems.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    setImages((prev) => [...prev, ...newItems]);
  };

  const handleImageDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingImages(true);
  };

  const handleImageDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setIsDraggingImages(false);
    }
  };

  const handleImageDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingImages(false);
    addFiles(
      Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith("image/")
      )
    );
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const item = prev[index];
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const toggleSuggestion = (text: string) => {
    setFormBody((prev) => {
      if (prev.includes(text)) {
        return prev
          .replace(text, "")
          .replace(/\.\s*\./g, ".")
          .replace(/^\s*\.\s*|\s*\.\s*$/g, "")
          .trim();
      }
      return prev ? `${prev.trim().replace(/\.?$/, "")}. ${text}` : text;
    });
  };

  const handleSubmit = async () => {
    if (
      !Number.isFinite(formRating) ||
      formRating < 1 ||
      formRating > 5 ||
      Math.round(formRating * 2) !== formRating * 2
    ) {
      toast.error("Vui lòng chọn mức đánh giá từ 1 đến 5 sao");
      return;
    }

    try {
      setIsUploading(true);

      // Upload images if any
      const finalImageUrls: string[] = [];
      const unuploadedFiles = images
        .filter((img) => !img.uploadedUrl)
        .map((img) => img.file);

      if (unuploadedFiles.length > 0) {
        const formData = new FormData();
        unuploadedFiles.forEach((f) => formData.append("files", f));

        const uploadRes = await fetch(
          `/api/products/${productSlug}/reviews/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => null);
          throw new Error(errData?.error || "Tải ảnh lên thất bại");
        }

        const data = (await uploadRes.json()) as { urls: string[] };
        finalImageUrls.push(...data.urls);
      }

      // Add already uploaded images
      images.forEach((img) => {
        if (img.uploadedUrl) finalImageUrls.push(img.uploadedUrl);
      });

      // Submit review
      submitReview.mutate(
        {
          rating: formRating,
          criteria,
          body: formBody || undefined,
          images: finalImageUrls,
        },
        {
          onSuccess: () => {
            toast.success("Cảm ơn bạn đã gửi đánh giá!");
            setFormBody("");
            setFormRating(5.0);
            setCriteria({ packaging: null, description: null, delivery: null });
            setImages([]);
            setIsUploading(false);
          },
          onError: (err) => {
            setIsUploading(false);
            toast.error(
              err instanceof Error ? err.message : "Gửi đánh giá thất bại"
            );
          },
        }
      );
    } catch (err) {
      setIsUploading(false);
      toast.error(
        err instanceof Error ? err.message : "Có lỗi xảy ra khi tải ảnh"
      );
    }
  };

  if (!user) {
    return (
      <div className="rounded-2xl border border-outline-variant/30 bg-surface-container/70 p-5 text-center">
        <p className="text-sm text-on-surface-variant">
          Vui lòng{" "}
          <Link
            href={loginUrl}
            className="font-bold text-primary underline underline-offset-2"
          >
            đăng nhập
          </Link>{" "}
          để viết đánh giá sản phẩm.
        </p>
      </div>
    );
  }

  if (purchaseLoading) {
    return (
      <div className="animate-pulse space-y-3 rounded-2xl bg-surface-container/60 p-5">
        <div className="h-4 w-36 rounded bg-surface-container-high" />
        <div className="h-10 w-full rounded bg-surface-container-high" />
      </div>
    );
  }

  if (!purchaseData?.can_review) {
    if (purchaseData?.has_reviewed) {
      return (
        <div className="rounded-2xl border border-outline-variant/30 bg-surface-container/70 p-5 text-center">
          <p className="text-xs font-bold text-on-surface">
            Bạn đã đánh giá sản phẩm này rồi.
          </p>
          <p className="mt-1 text-[11px] text-on-surface-variant">
            Mỗi khách hàng chỉ gửi 1 đánh giá cho mỗi sản phẩm đã mua.
          </p>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-outline-variant/30 bg-surface-container/70 p-5 text-center">
        <p className="text-xs font-bold text-on-surface">
          Chỉ khách hàng đã mua sản phẩm mới có thể viết đánh giá.
        </p>
        <p className="mt-1 text-[11px] text-on-surface-variant">
          Hãy hoàn tất đơn hàng và quay lại đánh giá để nhận xu tích điểm nhé!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-outline-variant/30 bg-surface-container-low/60 p-4">
      {/* ── Purchased items summary ── */}
      {purchaseData.purchased_items.length > 0 && (
        <div className="space-y-1.5 border-b border-outline-variant/20 pb-3">
          {purchaseData.purchased_items.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-outline-variant/20 bg-surface p-3"
            >
              {item.thumbnail && (
                <img
                  src={item.thumbnail}
                  alt={item.product_name}
                  className="h-16 w-16 shrink-0 rounded-xl object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-on-surface">
                  {item.product_name}
                </p>
                <p className="mt-1 truncate text-xs text-on-surface-variant">
                  {item.variant_summary}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Star rating selection ── */}
      <div className="space-y-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-on-surface">
              Đánh giá chất lượng
            </p>
            <p className="text-[11px] text-on-surface-variant">
              Chọn từ 1.0 đến 5.0 sao
            </p>
          </div>

          <div className="flex items-center gap-2">
            <StarRating value={formRating} onChange={setFormRating} size="lg" />
          </div>
        </div>

        {/* Quick Star Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {RATING_PRESETS.map((preset) => (
            <button
              key={preset.val}
              type="button"
              onClick={() => setFormRating(preset.val)}
              className={clsx(
                "rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all active:scale-95",
                formRating === preset.val
                  ? "bg-amber-400 text-stone-900 shadow-sm"
                  : "border border-outline-variant/30 bg-surface text-on-surface-variant hover:text-on-surface"
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-black uppercase tracking-wider text-on-surface">
          Đánh giá chi tiết{" "}
          <span className="font-medium normal-case tracking-normal text-on-surface-variant">
            (không bắt buộc)
          </span>
        </legend>
        {REVIEW_CRITERIA.map(({ key, label }) => (
          <div
            key={key}
            className="flex items-center justify-between gap-3 rounded-xl bg-surface-container/60 px-3 py-2"
          >
            <span className="text-xs font-semibold text-on-surface">
              {label}
            </span>
            <StarRating
              size="sm"
              value={criteria[key] ?? 0}
              onChange={(value) =>
                setCriteria((prev) => ({ ...prev, [key]: value }))
              }
              allowHalf={false}
            />
            {criteria[key] !== null && (
              <button
                type="button"
                onClick={() =>
                  setCriteria((prev) => ({ ...prev, [key]: null }))
                }
                className="text-xs text-on-surface-variant"
                aria-label={`Bỏ điểm ${label}`}
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </fieldset>

      {/* ── Quick Suggestions (Chips) ── */}
      <div className="space-y-1.5 border-t border-outline-variant/20 pt-3">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-on-surface-variant">
          <Sparkles size={13} className="text-amber-500" />
          <span>Gợi ý nhanh (chạm để chèn):</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {QUICK_SUGGESTIONS.map((sug, i) => {
            const isSelected = formBody.includes(sug);
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleSuggestion(sug)}
                className={clsx(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all active:scale-95",
                  isSelected
                    ? "bg-primary font-semibold text-surface"
                    : "border border-outline-variant/30 bg-surface text-on-surface-variant hover:border-primary/40 hover:text-on-surface"
                )}
              >
                {isSelected && <Check size={11} strokeWidth={3} />}
                <span>{sug}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Review Body Textarea ── */}
      <div className="space-y-1.5">
        <textarea
          value={formBody}
          onChange={(e) => setFormBody(e.target.value)}
          placeholder="Hãy chia sẻ cảm nhận thực tế của bạn về sản phẩm này (chất lượng phím, âm thanh gõ, đóng gói, giao hàng)..."
          rows={3}
          className="w-full resize-none rounded-xl border border-outline-variant/30 bg-surface px-3 py-2.5 text-xs leading-relaxed text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none"
        />
      </div>

      {/* ── Photo Upload Section ── */}
      <div
        onDragOver={handleImageDragOver}
        onDragLeave={handleImageDragLeave}
        onDrop={handleImageDrop}
        className={clsx(
          "space-y-2 rounded-xl p-3 transition-colors",
          isDraggingImages && "bg-primary/5"
        )}
      >
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-on-surface">
          <Camera size={14} className="text-primary" />
          <span>Ảnh thực tế</span>
          <span className="font-normal text-on-surface-variant">
            ({images.length}/4) · Kéo ảnh vào khung hoặc chọn ảnh
          </span>
        </p>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }, (_, idx) => {
            const item = images[idx];
            return (
              <div
                key={item?.previewUrl ?? `empty-${idx}`}
                className={clsx(
                  "relative aspect-square min-w-0 overflow-hidden rounded-xl border-2 border-dashed bg-surface transition-colors",
                  item
                    ? "border-outline-variant/50"
                    : "border-outline-variant/60 hover:border-primary/60",
                  isDraggingImages && "border-primary bg-primary/5"
                )}
                onClick={() => !item && fileInputRef.current?.click()}
                role={!item ? "button" : undefined}
                tabIndex={!item ? 0 : undefined}
                onKeyDown={(e) => {
                  if (!item && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                aria-label={!item ? `Thêm ảnh ${idx + 1}` : undefined}
              >
                {item ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setPreviewImage(item.previewUrl)}
                      className="h-full w-full cursor-zoom-in"
                      aria-label={`Xem ảnh ${idx + 1} phóng to`}
                    >
                      <img
                        src={item.previewUrl}
                        alt={`Ảnh tải lên ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
                      aria-label="Xoá ảnh"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-on-surface-variant">
                    <Camera size={18} />
                    <span className="text-[10px] font-medium">Thêm ảnh</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          multiple
          className="hidden"
          onChange={handleFilesSelected}
        />
      </div>

      {/* ── Submit Button ── */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitReview.isPending || isUploading}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-black uppercase tracking-widest text-surface shadow-ambient-sm transition-all hover:bg-on-surface active:scale-[0.99] disabled:opacity-50"
      >
        {(submitReview.isPending || isUploading) && (
          <Loader2 size={14} className="animate-spin" />
        )}
        <span>
          {submitReview.isPending || isUploading
            ? "Đang gửi..."
            : "Gửi đánh giá"}
        </span>
      </button>

      {previewImage && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh đánh giá"
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-surface text-on-surface"
            aria-label="Đóng xem ảnh"
          >
            <X size={22} />
          </button>
          <img
            src={previewImage}
            alt="Ảnh đánh giá phóng to"
            className="max-h-[85dvh] max-w-full rounded-xl object-contain"
          />
        </div>
      )}
    </div>
  );
}
