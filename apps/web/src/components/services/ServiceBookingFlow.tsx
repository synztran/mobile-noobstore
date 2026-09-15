"use client";

import { ServiceBookingSuccessDrawer } from "./ServiceBookingSuccessDrawer";
import { ServiceBookingSummaryBar } from "./ServiceBookingSummaryBar";
import { ServiceSectionCard } from "./ServiceSectionCard";
import { BookingAppointmentSection } from "./BookingAppointmentSection";
import { useServiceBookingFlow } from "./useServiceBookingFlow";
import type { BookingSection } from "@/app/api/services/booking-config/route";
import type { ServiceEntryDraft } from "./types";
import { getSectionIcon } from "./sectionIcons";
import {
  AlertTriangle,
  CalendarClock,
  MessageCircle,
  PackageCheck,
  Plus,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";

const STEPS = [
  { icon: Plus, title: "Thêm dịch vụ", caption: "Lựa chọn các mục" },
  {
    icon: SlidersHorizontal,
    title: "Tuỳ chỉnh",
    caption: "Số lượng & tuỳ chọn",
  },
  { icon: CalendarClock, title: "Chọn giờ hẹn", caption: "Thời gian lấy hàng" },
  { icon: PackageCheck, title: "Tiếp nhận", caption: "Xác nhận đơn" },
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

const SERVICE_TIMELINE = [
  { title: "Tiếp nhận", desc: "Kiểm tra bàn phím cùng bạn tại giờ hẹn" },
  { title: "Xử lý & báo giá", desc: "Xử lý theo đơn, báo giá phần phát sinh (nếu có)" },
  { title: "Hoàn tất & trả máy", desc: "Test chạy, đóng gói và trao trả đúng hẹn" },
];

const GUARANTEES = [
  { icon: ShieldCheck, label: "Bảo hành dịch vụ" },
  { icon: CalendarClock, label: "Đúng hẹn" },
  { icon: RotateCcw, label: "Hỗ trợ sau dịch vụ" },
];

// ─── Motion presets (shared) ─────────────────────────────────────────────────

const sectionReveal = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.35, ease: "easeOut" as const },
};

// ─── DaisyUI Steps Strip (dynamic highlight) ─────────────────────────────────

function StepsStrip({ currentStep }: { currentStep: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="rounded-2xl bg-surface-container p-3"
    >
      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
        Cách đặt lịch
      </p>
      <ul className="steps steps-horizontal w-full">
        {STEPS.map((step, idx) => {
          const isActive = idx === currentStep;
          const isCompleted = idx < currentStep;
          const StepIcon = step.icon;
          return (
            <motion.li
              key={step.title}
              className={`step ${isCompleted || isActive ? "step-primary" : ""}`}
              animate={{ scale: isActive ? 1.06 : 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
            >
              <span className="flex flex-col items-center gap-1 text-center">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                    isActive
                      ? "bg-primary text-primary-content shadow-md shadow-primary/30"
                      : isCompleted
                        ? "bg-primary/20 text-primary"
                        : "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  <StepIcon className="h-4 w-4" />
                </span>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider leading-tight ${
                    isActive ? "text-primary" : "text-on-surface"
                  }`}
                >
                  {step.title}
                </span>
                <span className="hidden text-[9px] leading-tight text-on-surface-variant sm:block">
                  {step.caption}
                </span>
              </span>
            </motion.li>
          );
        })}
      </ul>
    </motion.div>
  );
}

// ─── Quick Mode Toggle (DaisyUI toggle) ──────────────────────────────────────

function QuickModeToggle({
  isQuickMode,
  onToggle,
}: {
  isQuickMode: boolean;
  onToggle: (val: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-surface-container p-3">
      <span className="min-w-0 flex-1 pr-3">
        <span className="block text-xs font-black text-on-surface">
          Chế độ đơn giản
        </span>
        <span className="block text-[10px] text-on-surface-variant">
          Ẩn các tuỳ chọn nâng cao, tập trung vào dịch vụ chính
        </span>
      </span>
      <input
        type="checkbox"
        className="toggle toggle-primary toggle-sm"
        checked={isQuickMode}
        onChange={(e) => onToggle(e.target.checked)}
      />
    </label>
  );
}

// ─── Section Quick Nav (chips + count indicator) ─────────────────────────────

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
    <div className="-mx-4 flex items-center gap-3 px-4">
      <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
        Chọn nhanh
      </span>
      <div className="hide-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto px-0.5 py-1">
        {sections.map((section, idx) => {
          const count = counts[section.key] ?? 0;
          const IconComponent = getSectionIcon(section.key);
          const label = section.title.replace(/^Dịch vụ /, "");
          return (
            <motion.button
              key={section.key}
              type="button"
              onClick={() => scrollTo(section.key)}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.04 * idx, type: "spring", stiffness: 260, damping: 20 }}
              whileTap={{ scale: 0.94 }}
              className="btn btn-sm h-8 shrink-0 gap-1.5 rounded-full border-outline-variant/30 bg-surface-container text-[11px] font-bold text-on-surface"
            >
              <IconComponent className="h-3.5 w-3.5 text-on-surface-variant" />
              {label}
              {count > 0 ? (
                <span className="indicator-item badge badge-primary badge-xs font-black">
                  {count > 9 ? "9+" : count}
                </span>
              ) : null}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─── FAQ Accordion (DaisyUI collapse) ────────────────────────────────────────

function FaqAccordion() {
  return (
    <motion.div {...sectionReveal} className="rounded-2xl bg-surface-container p-4">
      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
        Câu hỏi thường gặp
      </p>
      <div className="space-y-1.5">
        {FAQS.map((faq, idx) => (
          <details
            key={faq.q}
            className="collapse collapse-arrow rounded-xl bg-surface-container-low"
            open={idx === 0}
          >
            <summary className="collapse-title min-h-0 py-3 text-xs font-bold text-on-surface">
              {faq.q}
            </summary>
            <div className="collapse-content text-xs leading-relaxed text-on-surface-variant">
              <p>{faq.a}</p>
            </div>
          </details>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Trust / Timeline Section ────────────────────────────────────────────────

function TrustSection() {
  return (
    <motion.div {...sectionReveal} className="rounded-2xl bg-surface-container p-4">
      <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
        Quy trình & cam kết
      </p>

      <ul className="timeline timeline-vertical timeline-compact">
        {SERVICE_TIMELINE.map((step, idx) => (
          <motion.li
            key={step.title}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 * idx, duration: 0.3 }}
          >
            {idx > 0 ? <hr /> : null}
            <div className="timeline-middle text-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="timeline-end timeline-box my-1 border-outline-variant/20 bg-surface-container-lowest">
              <p className="text-xs font-bold text-on-surface">{step.title}</p>
              <p className="text-[10px] leading-tight text-on-surface-variant">
                {step.desc}
              </p>
            </div>
          </motion.li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2">
        {GUARANTEES.map(({ icon: GuaranteeIcon, label }) => (
          <span
            key={label}
            className="badge badge-outline gap-1 border-primary/25 py-2.5 text-[10px] font-bold text-primary"
          >
            <GuaranteeIcon className="h-3 w-3" />
            {label}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Contact Card ────────────────────────────────────────────────────────────

function ContactCard() {
  return (
    <motion.div
      {...sectionReveal}
      className="rounded-2xl bg-gradient-to-br from-surface-container-lowest to-surface-container-low p-4 shadow-ambient-sm"
    >
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
      <a
        href={process.env.NEXT_PUBLIC_FACEBOOK_URL}
        target="_blank"
        rel="noreferrer"
        className="btn btn-primary btn-block btn-sm rounded-full text-[11px] font-black uppercase tracking-widest"
      >
        Chat Zalo / Facebook
      </a>
    </motion.div>
  );
}

// ─── Skeleton / Error (DaisyUI) ───────────────────────────────────────────────

function ServiceBookingFlowSkeleton() {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl bg-surface-container p-4">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton mt-3 h-3 w-3/4" />
      </div>
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="rounded-2xl bg-surface-container p-4">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton mt-3 h-3 w-3/4" />
          <div className="skeleton mt-2 h-3 w-1/2" />
        </div>
      ))}
    </section>
  );
}

// ─── Main Flow ────────────────────────────────────────────────────────────────

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
    globalError,
    entryErrors,
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

  const [isQuickMode, setIsQuickMode] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const section of bookingConfigQuery.data?.sections ?? []) {
      let total = 0;
      for (const service of section.services) {
        total +=
          (selections[service.id] as ServiceEntryDraft[] | undefined)?.length ?? 0;
      }
      counts[section.key] = total;
    }
    return counts;
  }, [bookingConfigQuery.data, selections]);

  // Track scroll position to determine current step (logic unchanged)
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;

      let newStep = 0;

      if (scrollY < 200) {
        newStep = 0;
      } else if (
        (document
          .getElementById("tour-appointment")
          ?.getBoundingClientRect().top ?? 0) < window.innerHeight * 0.5
      ) {
        newStep = 2;
      } else if (Object.values(sectionCounts).some((c) => c > 0)) {
        newStep = 1;
      }

      if (bookingMutation.isPending) {
        newStep = 3;
      }

      setCurrentStep(newStep);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [bookingConfigQuery.data?.sections, sectionCounts, bookingMutation.isPending]);

  if (bookingConfigQuery.isPending) {
    return <ServiceBookingFlowSkeleton />;
  }

  if (bookingConfigQuery.isError) {
    return (
      <div
        role="alert"
        className="alert alert-error items-start rounded-2xl bg-error/10 text-on-surface"
      >
        <AlertTriangle className="h-5 w-5 shrink-0 text-error" />
        <div className="space-y-0.5">
          <p className="text-sm font-bold text-error">
            Không thể tải cấu hình dịch vụ
          </p>
          <p className="text-xs leading-relaxed text-on-surface-variant">
            Đã xảy ra lỗi khi kết nối. Vui lòng thử lại hoặc liên hệ hỗ trợ nếu
            lỗi tiếp tục.
          </p>
        </div>
        <button
          type="button"
          onClick={() => bookingConfigQuery.refetch()}
          className="btn btn-sm rounded-full border-error/30 bg-error/5 text-[11px] font-black uppercase tracking-widest text-error"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const sections = bookingConfigQuery.data?.sections ?? [];

  return (
    <section className="space-y-4 pb-8">
      <StepsStrip currentStep={currentStep} />

      <QuickModeToggle isQuickMode={isQuickMode} onToggle={setIsQuickMode} />

      <div id="tour-quick-nav">
        <SectionQuickNav sections={sections} counts={sectionCounts} />
      </div>

      {authLoading ? (
        <div className="rounded-2xl bg-surface-container p-4">
          <div className="skeleton h-3 w-32" />
        </div>
      ) : null}

      <div id="tour-sections" className="relative clear-both">
        {sections.map((section, idx) => (
          <div key={section.key}>
            <ServiceSectionCard
              section={section}
              selections={selections}
              entryErrors={entryErrors}
              onAddEntry={handleAddEntry}
              onRemoveEntry={handleRemoveEntry}
              onSelectOptionValue={handleSelectOptionValue}
              onChangeLineNote={handleChangeLineNote}
              onUpdateEntry={handleUpdateEntry}
              isQuickMode={isQuickMode}
            />
            {idx < sections.length - 1 ? (
              <div className="flex items-center justify-center gap-2 py-4">
                <span className="h-1 w-1 rounded-full bg-outline-variant/40" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary/30" />
                <span className="h-1 w-1 rounded-full bg-outline-variant/40" />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div id="tour-appointment">
        <BookingAppointmentSection
          pickupAt={pickupAt}
          setPickupAt={setPickupAt}
          pickupNote={pickupNote}
          setPickupNote={setPickupNote}
        />
      </div>

      <FaqAccordion />

      <TrustSection />

      <ContactCard />

      {globalError ? (
        <p className="text-xs font-bold text-error">{globalError}</p>
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
        pickupAt={pickupAt}
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
