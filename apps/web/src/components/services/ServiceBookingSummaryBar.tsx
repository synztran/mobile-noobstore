"use client";

import { formatVND } from "@/lib/currency";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export interface BookingSummaryItem {
  serviceId: string;
  serviceName: string;
  sectionKey: string;
  count: number;
  handlingDays: number;
  price: number;
}

interface ServiceBookingSummaryBarProps {
  totalPrice: number;
  totalHandlingDays: number;
  selectedCount: number;
  summaryItems: BookingSummaryItem[];
  pickupAt: string;
  disabled: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
}

function formatDate(d: Date): string {
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}`;
}

export function ServiceBookingSummaryBar({
  totalPrice,
  totalHandlingDays,
  selectedCount,
  summaryItems,
  pickupAt,
  disabled,
  isSubmitting,
  onSubmit,
}: ServiceBookingSummaryBarProps) {
  const [expanded, setExpanded] = useState(false);
  const isEmpty = selectedCount === 0;

  const pickupDate = pickupAt ? new Date(pickupAt) : null;
  const hasPickup = pickupDate !== null && !Number.isNaN(pickupDate.getTime());
  const doneDate =
    hasPickup && totalHandlingDays > 0
      ? new Date(
          pickupDate!.getTime() + totalHandlingDays * 24 * 60 * 60 * 1000
        )
      : null;

  const scrollToSection = (key: string) => {
    document
      .getElementById(key)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      id="tour-summary-bar"
      className="fixed bottom-0 left-0 right-0 z-[60] space-y-2 border-t border-outline-variant/60 bg-surface/80 px-4 py-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl"
    >
      {isEmpty ? (
        <p className="mb-2 text-center text-xs font-bold text-on-surface-variant">
          Chọn dịch vụ bên trên để bắt đầu đặt lịch
        </p>
      ) : (
        <>
          {/* Overview line */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-between gap-3 py-0.5 text-left"
          >
            <p className="min-w-0 truncate text-sm text-on-surface-variant">
              <span className="font-bold text-on-surface">{selectedCount}</span>{" "}
              mục · {totalHandlingDays} ngày
              {/* {doneDate ? (
                <>
                  {" · Xong ~"}
                  <span className="font-bold text-on-surface">
                    {formatDate(doneDate)}
                  </span>
                </>
              ) : null} */}
            </p>
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-base font-black text-primary">
                {formatVND(totalPrice)}
              </span>
              <span className="inline-flex items-center rounded-md bg-surface-container-high p-1 font-bold tracking-wider text-on-surface-variant transition-colors">
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-300 ${
                    expanded ? "-rotate-180" : ""
                  }`}
                />
              </span>
            </span>
          </button>

          {/* Expandable breakdown */}
          <div
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
              expanded
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="space-y-2 overflow-hidden">
              <div className="flex max-h-40 flex-col gap-2 overflow-y-auto rounded-md border border-outline-variant/50 bg-surface-container-low p-2.5">
                {summaryItems.length === 0 ? (
                  <p className="text-xs text-on-surface-variant">
                    Chưa có mục được chọn.
                  </p>
                ) : (
                  summaryItems.map((item) => (
                    <button
                      key={item.serviceId}
                      type="button"
                      onClick={() => scrollToSection(item.sectionKey)}
                      className="flex w-full items-start justify-between gap-2 rounded-xl text-left transition-colors hover:bg-surface-container active:bg-surface-container-high"
                    >
                      <div className="flex flex-col">
                        <span className="min-w-0 truncate text-xs font-bold text-on-surface">
                          {item.serviceName}
                          {/* <span className="ml-1 font-normal text-on-surface-variant">
                          x{item.count}
                        </span> */}
                        </span>

                        <span className="text-[10px] font-normal text-on-surface-variant">
                          {item.handlingDays} ngày
                        </span>
                      </div>
                      <span className="shrink-0 text-sm font-black text-primary">
                        {formatVND(item.price)}
                      </span>
                    </button>
                  ))
                )}
              </div>

              {hasPickup ? (
                <div className="mb-2 text-center text-sm text-on-surface-variant">
                  Lấy hàng&nbsp;
                  <span className="font-bold text-on-surface">
                    {formatDate(pickupDate!)}
                  </span>
                  {doneDate ? (
                    <>
                      {" → hoàn tất dự kiến "}
                      <span className="font-bold text-on-surface">
                        {formatDate(doneDate)}
                      </span>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled || isSubmitting || isEmpty}
        className={
          isEmpty
            ? "w-full rounded-full border border-outline-variant/30 bg-surface-container px-4 py-3.5 text-xs font-black uppercase tracking-widest text-on-surface-variant"
            : "w-full rounded-full bg-primary-gradient py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20 transition-opacity active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
        }
      >
        {isSubmitting ? (
          <span className="loading loading-spinner loading-sm" />
        ) : isEmpty ? (
          "Chọn dịch vụ để bắt đầu"
        ) : (
          "Đặt lịch dịch vụ"
        )}
      </button>
    </div>
  );
}
