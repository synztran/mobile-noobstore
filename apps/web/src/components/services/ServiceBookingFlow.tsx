"use client";

import { ServiceBookingSuccessDrawer } from "./ServiceBookingSuccessDrawer";
import { ServiceBookingSummaryBar } from "./ServiceBookingSummaryBar";
import { ServiceSectionCard } from "./ServiceSectionCard";
import { BookingAppointmentSection } from "./BookingAppointmentSection";
import { useServiceBookingFlow } from "./useServiceBookingFlow";
import type { BookingSection } from "@/app/api/services/booking-config/route";
import type { ServiceEntryDraft } from "./types";
import {
  CalendarClock,
  ChevronDown,
  MessageCircle,
  PackageCheck,
  Phone,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import { useMemo, useState } from "react";

const STEPS = [
  { icon: Plus, title: "Thêm dịch vụ", caption: "Chọn 1 hoặc nhiều mục" },
  { icon: SlidersHorizontal, title: "Tuỳ chỉnh", caption: "Số lượng & tuỳ chọn" },
  { icon: CalendarClock, title: "Chọn giờ hẹn", caption: "Thời gian lấy hàng" },
  { icon: PackageCheck, title: "Nhận bàn phím", caption: "Xác nhận đơn" },
];

const FAQS = [
  {
    q: "Mình cần chuẩn bị gì khi lấy hàng?",
    a: "Chỉ cần vệ sinh nhẹ bàn phím trước khi gửi. Chúng tôi sẽ ghé theo giờ hẹn đã chọn, kiểm tra cùng bạn rồi mang đi xử lý.",
  },
  {
    q: "Giá hiển thị đã bao gồm gì?",
    a: "Giá từng mục là giá dịch vụ cơ bản. Các tuỳ chọn nâng cao (thay switch, loại grease…) sẽ được cộng thêm vào khi bạn chọn, và luôn hiển thị trước khi đặt lịch.",
  },
  {
    q: "Thời gian xử lý tính như thế nào?",
    a: "Mỗi mục có số ngày xử lý riêng. Nếu đặt nhiều mục trong một đơn, tổng thời gian sẽ là tổng số ngày của tất cả mục.",
  },
  {
    q: "Sau khi đặt lịch thì sao?",
    a: "Bạn sẽ nhận mã đơn ngay lập tức. Noobstore sẽ liên hệ để xác nhận chi tiết, lịch hẹn và tiến hành xử lý đơn của bạn.",
  },
];

function StepsStrip() {
  return (
    <div className="rounded-2xl bg-surface-container p-3">
      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
        Cách đặt lịch
      </p>
      <div className="grid grid-cols-4 gap-2">
        {STEPS.map((step, idx) => (
          <div key={step.title} className="flex flex-col items-center gap-1.5 text-center">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary-gradient text-white shadow-sm shadow-primary/20">
              <step.icon className="h-5 w-5" />
              <span className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-surface text-[9px] font-black text-primary ring-1 ring-outline-variant/30">
                {idx + 1}
              </span>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-on-surface">
                {step.title}
              </p>
              <p className="mt-0.5 text-[8px] leading-tight text-on-surface-variant">
                {step.caption}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionQuickNav({
  sections,
  counts,
}: {
  sections: BookingSection[];
  counts: Record<string, number>;
}) {
  const scrollTo = (key: string) => {
    document
      .getElementById(key)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      <span className="shrink-0 self-center text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
        Chọn nhanh
      </span>
      {sections.map((section) => {
        const count = counts[section.key] ?? 0;
        const label = section.title.replace(/^Dịch vụ /, "");
        return (
          <button
            key={section.key}
            type="button"
            onClick={() => scrollTo(section.key)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-outline-variant/30 bg-surface-container px-3 py-1.5 text-[11px] font-bold text-on-surface transition-colors active:scale-95"
          >
            {label}
            {count > 0 ? (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black text-on-primary">
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function FaqAccordion() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="rounded-2xl bg-surface-container p-4">
      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
        Câu hỏi thường gặp
      </p>
      <div className="space-y-1.5">
        {FAQS.map((faq, idx) => {
          const open = openIdx === idx;
          return (
            <div
              key={faq.q}
              className="overflow-hidden rounded-xl bg-surface-container-low"
            >
              <button
                type="button"
                onClick={() => setOpenIdx(open ? null : idx)}
                className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left"
              >
                <span className="text-xs font-bold text-on-surface">
                  {faq.q}
                </span>
                <ChevronDown
                  size={14}
                  className={`shrink-0 text-on-surface-variant transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                />
              </button>
              {open ? (
                <p className="px-3 pb-3 text-xs leading-relaxed text-on-surface-variant">
                  {faq.a}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Placeholder contact info — replace with real hotline / Zalo.
const HOTLINE = "0123456789";
const ZALO_URL = "https://zalo.me/0123456789";

function ContactCard() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-surface-container-lowest to-surface-container-low p-4 shadow-ambient-sm">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-gradient text-white shadow-sm shadow-primary/20">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-black text-on-surface">Cần tư vấn?</p>
          <p className="text-xs text-on-surface-variant">
            Đội ngũ Noobstore sẵn sàng hỗ trợ bạn
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <a
          href={`tel:${HOTLINE}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary-gradient px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm shadow-primary/20 active:scale-95"
        >
          <Phone size={13} />
          Gọi hotline
        </a>
        <a
          href={ZALO_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-outline-variant/30 bg-surface-container px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-on-surface active:scale-95"
        >
          Nhắn Zalo
        </a>
      </div>
    </div>
  );
}

function ServiceBookingFlowSkeleton() {
  return (
    <section className="animate-pulse space-y-4">
      <div className="rounded-2xl bg-surface-container p-4">
        <div className="h-3 w-24 rounded-full bg-surface-container-high" />
        <div className="mt-3 h-3 w-3/4 rounded-full bg-surface-container-high" />
      </div>

      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="rounded-2xl bg-surface-container p-4">
          <div className="h-4 w-32 rounded-full bg-surface-container-high" />
          <div className="mt-3 h-3 w-3/4 rounded-full bg-surface-container-high" />
          <div className="mt-2 h-3 w-1/2 rounded-full bg-surface-container-high" />
        </div>
      ))}
    </section>
  );
}

export function ServiceBookingFlow() {
  const {
    user,
    authLoading,
    bookingConfigQuery,
    selections,
    pickupAt,
    setPickupAt,
    pickupNote,
    setPickupNote,
    validationError,
    summary,
    bookingMutation,
    successOpen,
    setSuccessOpen,
    successOrderNumber,
    handleAddEntry,
    handleUpdateEntry,
    handleRemoveEntry,
    handleSelectOptionValue,
    handleChangeLineNote,
    handleSubmit,
    handleBookMore,
  } = useServiceBookingFlow();

  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const section of bookingConfigQuery.data?.sections ?? []) {
      let total = 0;
      for (const service of section.services) {
        total += (selections[service.id] as ServiceEntryDraft[] | undefined)
          ?.length ?? 0;
      }
      counts[section.key] = total;
    }
    return counts;
  }, [bookingConfigQuery.data, selections]);

  if (bookingConfigQuery.isPending) {
    return <ServiceBookingFlowSkeleton />;
  }

  if (bookingConfigQuery.isError) {
    return (
      <section className="space-y-4 rounded-2xl border border-error/20 bg-error/5 p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-error/10">
            <span className="text-error">!</span>
          </span>
          <div className="space-y-0.5">
            <p className="text-sm font-bold text-error">
              Không thể tải cấu hình dịch vụ
            </p>
            <p className="text-xs leading-relaxed text-on-surface-variant">
              Đã xảy ra lỗi khi kết nối. Vui lòng thử lại hoặc liên hệ hỗ trợ
              nếu lỗi tiếp tục.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => bookingConfigQuery.refetch()}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-error/30 bg-error/5 px-4 py-2 text-xs font-black uppercase tracking-widest text-error transition-colors hover:bg-error/10"
        >
          Thử lại
        </button>
      </section>
    );
  }

  const sections = bookingConfigQuery.data?.sections ?? [];

  return (
    <section className="space-y-5 pb-8">
      <StepsStrip />

      <SectionQuickNav sections={sections} counts={sectionCounts} />

      {authLoading ? (
        <div className="animate-pulse rounded-2xl bg-surface-container p-4">
          <div className="h-3 w-32 rounded-full bg-surface-container-high" />
        </div>
      ) : null}

      <div className="space-y-4">
        {sections.map((section) => (
          <ServiceSectionCard
            key={section.key}
            section={section}
            selections={selections}
            onAddEntry={handleAddEntry}
            onRemoveEntry={handleRemoveEntry}
            onSelectOptionValue={handleSelectOptionValue}
            onChangeLineNote={handleChangeLineNote}
            onUpdateEntry={handleUpdateEntry}
          />
        ))}
      </div>

      <BookingAppointmentSection
        pickupAt={pickupAt}
        setPickupAt={setPickupAt}
        pickupNote={pickupNote}
        setPickupNote={setPickupNote}
      />

      <FaqAccordion />

      <ContactCard />

      {validationError ? (
        <p className="text-xs font-bold text-error">{validationError}</p>
      ) : null}

      {bookingMutation.error ? (
        <p className="text-xs font-bold text-error">
          {bookingMutation.error.message}
        </p>
      ) : null}

      <ServiceBookingSummaryBar
        totalPrice={summary.totalPrice}
        totalHandlingDays={summary.totalHandlingDays}
        selectedCount={summary.selectedCount}
        summaryItems={summary.summaryItems}
        disabled={!user || authLoading || bookingConfigQuery.isPending}
        isSubmitting={bookingMutation.isPending}
        onSubmit={handleSubmit}
      />

      <ServiceBookingSuccessDrawer
        open={successOpen}
        orderNumber={successOrderNumber}
        onClose={() => setSuccessOpen(false)}
        onBookMore={handleBookMore}
      />
    </section>
  );
}