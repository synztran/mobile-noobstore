"use client";

import { AlertTriangle, Calendar, RefreshCcw } from "lucide-react";
import { ServiceBookingSuccessDrawer } from "./ServiceBookingSuccessDrawer";
import { ServiceBookingSummaryBar } from "./ServiceBookingSummaryBar";
import { ServiceSectionCard } from "./ServiceSectionCard";
import { useServiceBookingFlow } from "./useServiceBookingFlow";

function ServiceBookingFlowSkeleton() {
	return (
		<section className="space-y-4 animate-pulse">
			<div className="rounded-2xl bg-surface-container p-4">
				<div className="h-3 w-24 bg-surface-container-high rounded-full" />
				<div className="h-3 w-3/4 bg-surface-container-high rounded-full mt-3" />
			</div>

			{Array.from({ length: 4 }).map((_, idx) => (
				<div key={idx} className="rounded-2xl bg-surface-container p-4">
					<div className="h-4 w-32 bg-surface-container-high rounded-full" />
					<div className="h-3 w-3/4 bg-surface-container-high rounded-full mt-3" />
					<div className="h-3 w-1/2 bg-surface-container-high rounded-full mt-2" />
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

	if (bookingConfigQuery.isPending) {
		return <ServiceBookingFlowSkeleton />;
	}

	if (bookingConfigQuery.isError) {
		return (
			<section className="rounded-2xl border border-error/30 bg-error/5 p-5 space-y-4">
				<div className="flex items-start gap-3">
					<span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-error/15">
						<AlertTriangle size={18} className="text-error" />
					</span>
					<div className="space-y-0.5">
						<p className="text-sm font-bold text-error">
							Không thể tải cấu hình dịch vụ
						</p>
						<p className="text-xs text-on-surface-variant leading-relaxed">
							Đã xảy ra lỗi khi kết nối. Vui lòng thử lại hoặc
							liên hệ hỗ trợ nếu lỗi tiếp tục.
						</p>
					</div>
				</div>
				<button
					type="button"
					onClick={() => bookingConfigQuery.refetch()}
					className="btn btn-sm rounded-full border-error/40 bg-error/10 text-error hover:bg-error/20 gap-1.5 w-full">
					<RefreshCcw size={14} />
					Thử lại
				</button>
			</section>
		);
	}

	const sections = bookingConfigQuery.data?.sections ?? [];

	return (
		<section className="space-y-4 pb-40">
			<div className="rounded-2xl bg-surface-container p-4">
				<strong className="text-sm text-primary">
					Quy trình dịch vụ
				</strong>
				<p className="text-xs text-on-surface-variant leading-relaxed">
					Chọn tất cả các mục dịch vụ bạn cần trong một đơn booking.
					Mỗi mục sẽ được xử lý riêng biệt nhưng cùng chung một thời
					gian nhận hàng và ghi chú.
				</p>
			</div>

			<div className="space-y-3 rounded-2xl bg-surface-container p-4">
				<p className="text-sm tracking-wide flex items-center gap-1 text-primary">
					<Calendar size={16} />
					<strong>Lịch hẹn và ghi chú</strong>
				</p>

				<hr className="border-t border-gray-300" />

				<div className="space-y-1.5">
					<label className="text-xs font-semibold text-on-surface-variant">
						Thời gian lấy hàng&nbsp;
						{/* <span className="text-red-400">*</span> */}
					</label>
					<input
						type="datetime-local"
						value={pickupAt}
						onChange={(e) => setPickupAt(e.target.value)}
						className="w-full rounded-xl border border-base-200 bg-base-100 px-3 py-2 text-sm"
					/>
					<small className="text-[10px] text-gray-600 leading-[1] mt-0">
						Thời gian nhân viên ghé để lấy sản phẩm từ khách hàng
					</small>
				</div>

				<div className="space-y-1.5">
					<label className="text-xs font-semibold text-on-surface-variant">
						Ghi chú nhận hàng
					</label>
					<textarea
						rows={3}
						value={pickupNote}
						onChange={(e) => setPickupNote(e.target.value)}
						placeholder="Ví dụ: Nhận sau 18:00 tại cửa hàng"
						className="w-full rounded-xl border border-base-200 bg-base-100 px-3 py-2 text-sm placeholder:text-xs"
					/>
				</div>
			</div>

			{authLoading ? (
				<div className="rounded-2xl bg-surface-container p-4 animate-pulse">
					<div className="h-3 w-32 bg-surface-container-high rounded-full" />
				</div>
			) : null}

			{!authLoading && !user ? (
				<div className="rounded-2xl bg-warning/10 border border-warning/30 p-4">
					<p className="text-sm text-on-surface">
						Bạn cần đăng nhập trước khi gửi booking dịch vụ.
					</p>
				</div>
			) : null}

			<div className="space-y-3">
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
				<p className="text-sm text-error font-semibold">
					{validationError}
				</p>
			) : null}

			{bookingMutation.error ? (
				<p className="text-sm text-error font-semibold">
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
