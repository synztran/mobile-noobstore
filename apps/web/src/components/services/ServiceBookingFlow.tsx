"use client";

import { ServiceBookingSuccessDrawer } from "./ServiceBookingSuccessDrawer";
import { ServiceBookingSummaryBar } from "./ServiceBookingSummaryBar";
import { ServiceSectionCard } from "./ServiceSectionCard";
import { BookingAppointmentSection } from "./BookingAppointmentSection";
import { useServiceBookingFlow } from "./useServiceBookingFlow";

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

  console.log(user);

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
      <div className="space-y-2 rounded-2xl bg-surface-container p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
          Quy trình dịch vụ
        </p>
        <p className="text-xs leading-relaxed text-on-surface-variant">
          Chọn tất cả các mục dịch vụ bạn cần trong một đơn booking. Mỗi mục sẽ
          được xử lý riêng biệt nhưng cùng chung một thời gian nhận hàng và ghi
          chú.
        </p>
      </div>

      <BookingAppointmentSection
        pickupAt={pickupAt}
        setPickupAt={setPickupAt}
        pickupNote={pickupNote}
        setPickupNote={setPickupNote}
      />

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
