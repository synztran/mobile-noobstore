"use client";

import { ServiceBookingSuccessDrawer } from "./ServiceBookingSuccessDrawer";
import { ServiceBookingSummaryBar } from "./ServiceBookingSummaryBar";
import { ServiceSectionCard } from "./ServiceSectionCard";
import { BookingAppointmentSection } from "./BookingAppointmentSection";
import { GroupAnchors } from "./GroupAnchors";
import { useServiceBookingFlow } from "./useServiceBookingFlow";
import type { BookingSection } from "@/app/api/services/booking-config/route";
import type { ServiceEntryDraft } from "./types";
import { getSectionIcon } from "./sectionIcons";
import {
  AlertTriangle,
  CalendarClock,
  PackageCheck,
  Plus,
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

// ─── DaisyUI Steps Strip (dynamic highlight) ─────────────────────────────────

function StepsStrip({ currentStep }: { currentStep: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="rounded-2xl bg-surface-container p-4"
    >
      <p className="mb-4 text-xs font-bold uppercase tracking-[0.08em] text-primary">
        Cách đặt lịch
      </p>
      {/*
        DaisyUI's own step markers, which number themselves. The previous
        version drew a second icon badge inside every step on top of the
        built-in numbered circle, so each step showed two markers and the
        active one overlapped both. The sequence number is the one that
        carries information here, so the icon moved inline with the label
        instead of being a second badge.
      */}
      <ul className="steps steps-horizontal w-full">
        {STEPS.map((step, idx) => {
          const isActive = idx === currentStep;
          const isCompleted = idx < currentStep;
          const StepIcon = step.icon;
          return (
            <li
              key={step.title}
              className={`step ${isCompleted || isActive ? "step-primary" : ""}`}
            >
              <span className="flex flex-col items-center gap-0.5 pt-1 text-center">
                <span
                  className={`flex items-center gap-1 text-xs font-bold uppercase tracking-[0.08em] ${
                    isActive ? "text-primary" : "text-on-surface"
                  }`}
                >
                  <StepIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="leading-tight">{step.title}</span>
                </span>
                <span className="hidden text-xs leading-tight text-on-surface-variant sm:block">
                  {step.caption}
                </span>
              </span>
            </li>
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
        <span className="block text-xs text-on-surface-variant">
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
      <span className="shrink-0 text-xs font-black uppercase tracking-widest text-on-surface-variant">
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
              transition={{
                delay: 0.04 * idx,
                type: "spring",
                stiffness: 260,
                damping: 20,
              }}
              whileTap={{ scale: 0.94 }}
              className="btn btn-sm h-8 shrink-0 gap-1.5 rounded-full border-outline-variant/30 bg-surface-container text-xs font-bold text-on-surface"
            >
              <IconComponent className="h-3.5 w-3.5 text-on-surface-variant" />
              {label}
              {count > 0 ? (
                <span className="badge indicator-item badge-primary badge-xs font-black">
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

export function ServiceBookingFlow({
  sectionKeys = [],
}: {
  /**
   * Group keys, for the anchors below. The flow renders its own group cards
   * with these ids once the config lands; until then it renders zero-height
   * markers in their place, so a showcase link never targets a missing
   * fragment (which sends the browser to the top of the page).
   */
  sectionKeys?: string[];
}) {
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
          (selections[service.id] as ServiceEntryDraft[] | undefined)?.length ??
          0;
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
        (document.getElementById("tour-appointment")?.getBoundingClientRect()
          .top ?? 0) <
        window.innerHeight * 0.5
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
  }, [
    bookingConfigQuery.data?.sections,
    sectionCounts,
    bookingMutation.isPending,
  ]);

  if (bookingConfigQuery.isPending) {
    return (
      <>
        <GroupAnchors sectionKeys={sectionKeys} />
        <ServiceBookingFlowSkeleton />
      </>
    );
  }

  if (bookingConfigQuery.isError) {
    return (
      <>
        <GroupAnchors sectionKeys={sectionKeys} />
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
              Đã xảy ra lỗi khi kết nối. Vui lòng thử lại hoặc liên hệ hỗ trợ
              nếu lỗi tiếp tục.
            </p>
          </div>
          <button
            type="button"
            onClick={() => bookingConfigQuery.refetch()}
            className="btn btn-sm rounded-full border-error/30 bg-error/5 text-xs font-bold uppercase tracking-[0.08em] text-error"
          >
            Thử lại
          </button>
        </div>
      </>
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
