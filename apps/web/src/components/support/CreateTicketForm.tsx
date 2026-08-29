"use client";

import type { OrderItemDetail } from "@/app/api/user/orders/[id]/route";
import { SUPPORT_CATEGORY_OPTIONS } from "@/constants/support";
import { useCreateTicket } from "@/lib/react-query/support/api/useSupportMutations";
import { formatVND } from "@/lib/currency";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import Image from "@/components/ui/AdaptiveImage";

interface SectionState {
  id: string;
  itemId: string;
  category: string;
  subject: string;
  description: string;
  files: File[];
  isSubmitting: boolean;
  isSubmitted: boolean;
  error: string;
}

interface Props {
  orderItems: OrderItemDetail[];
  orderId: string | null;
  orderNumber: string;
}

function createSection(): SectionState {
  return {
    id: crypto.randomUUID(),
    itemId: "",
    category: "defective",
    subject: "",
    description: "",
    files: [],
    isSubmitting: false,
    isSubmitted: false,
    error: "",
  };
}

export function CreateTicketForm({ orderItems, orderId, orderNumber }: Props) {
  const [sections, setSections] = useState<SectionState[]>(() => [
    createSection(),
  ]);
  const successDialogRef = useRef<HTMLDialogElement>(null);
  const [lastSubmittedIndex, setLastSubmittedIndex] = useState<number | null>(
    null
  );
  const createTicket = useCreateTicket();

  const updateSection = useCallback(
    (index: number, patch: Partial<SectionState>) => {
      setSections((prev) =>
        prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
      );
    },
    []
  );

  const addSection = useCallback(() => {
    if (sections.length >= orderItems.length) return;
    const usedIds = new Set(sections.map((s) => s.itemId));
    const nextItem = orderItems.find((item) => !usedIds.has(item.id));
    if (!nextItem) return;
    const section = createSection();
    setSections((prev) => [...prev, section]);
  }, [sections.length, orderItems]);

  const removeSection = useCallback((index: number) => {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleFileChange = useCallback(
    (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      const current = sections[index].files;
      updateSection(index, {
        files: [...current, ...selected].slice(0, 5),
      });
    },
    [sections, updateSection]
  );

  const removeFile = useCallback(
    (sectionIndex: number, fileIndex: number) => {
      const current = sections[sectionIndex].files;
      updateSection(sectionIndex, {
        files: current.filter((_, i) => i !== fileIndex),
      });
    },
    [sections, updateSection]
  );

  const handleSubmit = useCallback(
    async (index: number) => {
      const section = sections[index];
      if (section.isSubmitted || section.isSubmitting) return;

      if (!section.itemId) {
        updateSection(index, { error: "Vui lòng chọn sản phẩm" });
        return;
      }
      if (section.subject.trim().length < 3) {
        updateSection(index, { error: "Tiêu đề phải có ít nhất 3 ký tự" });
        return;
      }

      updateSection(index, { isSubmitting: true, error: "" });

      const formData = new FormData();
      formData.set("subject", section.subject.trim());
      formData.set("category", section.category);
      if (section.description.trim())
        formData.set("description", section.description.trim());
      if (orderId) formData.set("order_id", orderId);
      formData.set("order_item_id", section.itemId);
      for (const file of section.files) {
        formData.append("files", file);
      }

      try {
        await createTicket.mutateAsync(formData);
        updateSection(index, { isSubmitting: false, isSubmitted: true });
        setLastSubmittedIndex(index);
        successDialogRef.current?.showModal();
      } catch (err) {
        updateSection(index, {
          isSubmitting: false,
          error:
            err instanceof Error
              ? err.message
              : "Có lỗi xảy ra, vui lòng thử lại",
        });
      }
    },
    [sections, orderId, createTicket, updateSection]
  );

  const selectedItemMap = useMemo(() => {
    const map = new Map<string, OrderItemDetail>();
    for (const item of orderItems) map.set(item.id, item);
    return map;
  }, [orderItems]);

  const allSubmitted = sections.every((s) => s.isSubmitted);
  const remainingCount = orderItems.length - sections.length;

  const availableItems = orderItems.filter(
    (item) => !sections.some((s) => s.itemId === item.id && !s.isSubmitted)
  );

  return (
    <div className="space-y-5">
      {/* Report sections */}
      <div className="space-y-4">
        {sections.map((section, index) => (
          <div
            key={section.id}
            className={`space-y-4 rounded-2xl p-2 ${
              section.isSubmitted
                ? "bg-surface-container/50 opacity-60"
                : "bg-surface-container-lowest shadow-ambient-sm"
            }`}
          >
            {/* Section header */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
                Yêu cầu {index + 1}
              </p>
              <div className="flex items-center gap-2">
                {section.isSubmitted && (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <CheckCircle2 size={14} />
                    Đã gửi
                  </span>
                )}
                {sections.length > 1 && !section.isSubmitted && (
                  <button
                    type="button"
                    onClick={() => removeSection(index)}
                    className="flex h-7 w-7 items-center justify-center rounded-xl bg-error/10 text-error transition-all active:scale-90"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Product selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                Sản phẩm gặp vấn đề
              </label>
              <select
                value={section.itemId}
                onChange={(e) =>
                  updateSection(index, { itemId: e.target.value })
                }
                disabled={section.isSubmitted}
                className="w-full rounded-2xl border-2 border-transparent bg-surface-container px-4 py-3 text-sm font-semibold text-on-surface outline-none transition-all focus:border-primary disabled:opacity-50"
              >
                <option value="" disabled>
                  -- Chọn sản phẩm --
                </option>
                {orderItems.map((item) => {
                  const isTakenByOther = sections.some(
                    (s, i) =>
                      i !== index && s.itemId === item.id && !s.isSubmitted
                  );
                  return (
                    <option
                      key={item.id}
                      value={item.id}
                      disabled={isTakenByOther}
                    >
                      {item.product_name}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Selected product info */}
            {section.itemId &&
              (() => {
                const item = selectedItemMap.get(section.itemId);
                if (!item) return null;
                return (
                  <div className="rounded-2xl bg-surface-container p-2">
                    <div className="flex items-start gap-2">
                      {item.thumbnail && (
                        <div className="relative aspect-square h-24 w-28 flex-shrink-0 bg-surface-container-high">
                          <Image
                            src={item.thumbnail}
                            alt={item.id}
                            className="rounded-xl object-cover"
                            fill
                            sizes="112px"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-3 text-sm font-bold text-on-surface">
                          {item.product_name}
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-on-surface-variant">
                          <strong className="text-primary">
                            {formatVND(item.unit_price)}
                          </strong>
                          {item.quantity > 1 && (
                            <span className="ml-1 text-outline-variant">
                              x{item.quantity}
                            </span>
                          )}
                        </p>
                        {item.components.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {item.components.map((c, ci) => (
                              <span
                                key={ci}
                                className="inline-flex items-center gap-1 rounded-lg bg-surface-container-high px-2 py-0.5 text-[10px] font-bold text-on-surface-variant"
                              >
                                {c.variant_name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                Danh mục vấn đề
              </label>
              <select
                value={section.category}
                onChange={(e) =>
                  updateSection(index, { category: e.target.value })
                }
                disabled={section.isSubmitted}
                className="w-full rounded-2xl border-2 border-transparent bg-surface-container px-4 py-3 text-sm font-semibold text-on-surface outline-none transition-all focus:border-primary disabled:opacity-50"
              >
                {SUPPORT_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                Tiêu đề
              </label>
              <input
                type="text"
                value={section.subject}
                onChange={(e) =>
                  updateSection(index, { subject: e.target.value })
                }
                placeholder="Tóm tắt vấn đề của bạn"
                disabled={section.isSubmitted}
                className="w-full rounded-2xl border-2 border-transparent bg-surface-container px-4 py-3 text-sm font-semibold text-on-surface outline-none transition-all focus:border-primary disabled:opacity-50"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                Mô tả chi tiết
              </label>
              <textarea
                value={section.description}
                onChange={(e) =>
                  updateSection(index, { description: e.target.value })
                }
                placeholder="Mô tả vấn đề của bạn một cách chi tiết..."
                rows={3}
                disabled={section.isSubmitted}
                className="w-full resize-none rounded-2xl border-2 border-transparent bg-surface-container px-4 py-3 text-sm font-semibold text-on-surface outline-none transition-all focus:border-primary disabled:opacity-50"
              />
            </div>

            {/* File upload */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                Hình ảnh kèm theo (tối đa 5)
              </label>
              {!section.isSubmitted && (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileChange(index, e)}
                    className="hidden"
                    id={`file-input-${section.id}`}
                  />
                  <label
                    htmlFor={`file-input-${section.id}`}
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-outline-variant/40 bg-surface-container-low px-4 py-5 text-sm font-bold text-on-surface-variant transition-all active:scale-[0.99]"
                  >
                    <Upload size={18} />
                    Thêm hình ảnh
                  </label>
                </>
              )}
              {section.files.length > 0 && (
                <div className="grid grid-cols-5 gap-2">
                  {section.files.map((file, i) => (
                    <div key={i} className="group relative aspect-square">
                      <img
                        src={URL.createObjectURL(file)}
                        alt=""
                        className="h-full w-full rounded-xl object-cover"
                      />
                      {!section.isSubmitted && (
                        <button
                          type="button"
                          aria-label="Xoá tệp"
                          onClick={() => removeFile(index, i)}
                          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error */}
            {section.error && (
              <div className="flex items-center gap-2 rounded-2xl bg-error/10 px-4 py-3 text-sm font-semibold text-error">
                <AlertCircle size={16} />
                {section.error}
              </div>
            )}

            {/* Submit button */}
            {!section.isSubmitted && (
              <button
                type="button"
                onClick={() => handleSubmit(index)}
                disabled={section.isSubmitting}
                className="btn btn-primary btn-md w-full rounded-full text-xs font-bold uppercase tracking-widest text-white shadow-ambient-sm transition-transform active:scale-[0.98] disabled:scale-100 disabled:opacity-70"
              >
                {section.isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Đang gửi...
                  </span>
                ) : (
                  "GỬI YÊU CẦU"
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add more button */}
      {remainingCount > 0 && !allSubmitted && (
        <button
          type="button"
          onClick={addSection}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-outline-variant/30 bg-surface-container-lowest px-4 py-4 text-sm font-bold text-on-surface-variant transition-all active:scale-[0.98]"
        >
          <Plus size={18} />
          Thêm yêu cầu ({remainingCount} sản phẩm còn lại)
        </button>
      )}

      {/* Success modal */}
      <dialog
        ref={successDialogRef}
        className="modal modal-bottom sm:modal-middle"
      >
        <div className="modal-box rounded-t-3xl sm:rounded-3xl">
          <div className="flex flex-col items-center py-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 size={28} className="text-emerald-600" />
            </div>
            <p className="mt-4 text-lg font-black text-on-surface">
              Yêu cầu đã được gửi
            </p>
            <p className="mt-1 text-center text-sm text-on-surface-variant">
              Yêu cầu hỗ trợ của bạn đã được gửi thành công. Chúng tôi sẽ xử lý
              trong thời gian sớm nhất.
            </p>
          </div>
          <div className="modal-action flex-col gap-2">
            {!allSubmitted && (
              <button
                type="button"
                onClick={() => successDialogRef.current?.close()}
                className="btn btn-md w-full rounded-full border-0 bg-surface-container text-sm font-bold text-on-surface transition-all active:scale-[0.98]"
              >
                Tiếp tục gửi yêu cầu khác
              </button>
            )}
            <Link
              href="/profile/support"
              className="btn btn-primary btn-md w-full rounded-full text-sm font-bold text-white shadow-ambient-sm transition-all active:scale-[0.98]"
            >
              Xem danh sách yêu cầu
            </Link>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="submit">close</button>
        </form>
      </dialog>
    </div>
  );
}
