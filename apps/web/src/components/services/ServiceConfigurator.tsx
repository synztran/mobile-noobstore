"use client";

import type {
	ServiceBookingRequest,
	ServiceBookingResponse,
} from "@/app/api/service-bookings/route";
import type { Service, ServiceOption } from "@/app/api/services/route";
import Icon from "@/components/ui/Icon";
import { formatVND } from "@/lib/currency";
import { useServiceBookingMutation } from "@/lib/react-query/service/api/useServiceQueries";
import { CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// ─── Price summary ────────────────────────────────────────────────────────────

function computeTotal(
	basePrice: number,
	quantity: number,
	selectedIds: Set<number>,
	options: ServiceOption[],
): number {
	let adj = 0;
	for (const opt of options) {
		for (const val of opt.values) {
			if (selectedIds.has(val.id)) {
				adj += val.price_adjustment;
			}
		}
	}
	return (basePrice + adj) * quantity;
}

// ─── Option row ───────────────────────────────────────────────────────────────

function OptionGroup({
	option,
	selectedIds,
	onToggle,
}: {
	option: ServiceOption;
	selectedIds: Set<number>;
	onToggle: (id: number) => void;
}) {
	return (
		<div className="space-y-2">
			<div className="flex items-center gap-1">
				<p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
					{option.label}
				</p>
				{option.is_required && (
					<span className="text-[10px] text-error font-bold">*</span>
				)}
			</div>
			<div className="flex flex-wrap gap-2">
				{option.values.map((val) => {
					const active = selectedIds.has(val.id);
					return (
						<button
							key={val.id}
							type="button"
							onClick={() => onToggle(val.id)}
							className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
								active
									? "bg-primary text-primary-content border-primary"
									: "bg-surface-container text-on-surface border-transparent"
							}`}>
							{val.label}
							{val.price_adjustment !== 0 && (
								<span className="ml-1 opacity-70">
									{val.price_adjustment > 0 ? "+" : ""}
									{formatVND(val.price_adjustment)}
								</span>
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
}

// ─── Confirmation screen ──────────────────────────────────────────────────────

function ConfirmationScreen({
	orderNumber,
	onBack,
}: {
	orderNumber: string;
	onBack: () => void;
}) {
	return (
		<div className="flex flex-col items-center justify-center py-20 gap-6 text-center px-6">
			<CheckCircle className="w-16 h-16 text-success" />
			<div className="space-y-1">
				<p className="text-lg font-black text-on-surface uppercase tracking-tight">
					Đặt dịch vụ thành công!
				</p>
				<p className="text-sm text-on-surface-variant">
					Mã đơn hàng của bạn là
				</p>
				<p className="text-base font-black text-primary">
					{orderNumber}
				</p>
			</div>
			<p className="text-sm text-on-surface-variant">
				Chúng tôi sẽ liên hệ để xác nhận chi tiết và lịch hẹn.
			</p>
			<button
				type="button"
				onClick={onBack}
				className="btn btn-primary btn-sm rounded-full px-6">
				Xem thêm dịch vụ
			</button>
		</div>
	);
}

// ─── Main configurator ────────────────────────────────────────────────────────

export function ServiceConfigurator({ service }: { service: Service }) {
	const router = useRouter();
	const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
	const [quantity, setQuantity] = useState(1);
	const [note, setNote] = useState("");
	const [pickupAt, setPickupAt] = useState("");
	const [validationError, setValidationError] = useState<string | null>(null);

	const toggleValue = (id: number) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
		setValidationError(null);
	};

	const total = computeTotal(
		service.base_price,
		quantity,
		selectedIds,
		service.options,
	);

	const mutation = useServiceBookingMutation();

	const handleSubmit = () => {
		if (!pickupAt) {
			setValidationError("Vui lòng chọn thời gian nhận dịch vụ");
			return;
		}

		// Validate required options
		for (const opt of service.options) {
			if (!opt.is_required) continue;
			const hasSelection = opt.values.some((v) => selectedIds.has(v.id));
			if (!hasSelection) {
				setValidationError(`Vui lòng chọn "${opt.label}"`);
				return;
			}
		}

		mutation.mutate({
			pickup_at: new Date(pickupAt).toISOString(),
			selections: [
				{
					service_id: service.id,
					quantity,
					selected_option_value_ids: Array.from(selectedIds),
					line_note: note || undefined,
				},
			],
			customer_note: note || undefined,
		});
	};

	if (mutation.isSuccess && mutation.data) {
		return (
			<ConfirmationScreen
				orderNumber={mutation.data.order_number}
				onBack={() => router.push("/middleman")}
			/>
		);
	}

	return (
		<div className="space-y-6">
			{/* Options */}
			{service.options.length > 0 && (
				<div className="space-y-5">
					{service.options.map((opt) => (
						<OptionGroup
							key={opt.id}
							option={opt}
							selectedIds={selectedIds}
							onToggle={toggleValue}
						/>
					))}
				</div>
			)}

			{/* Quantity */}
			<div className="space-y-2">
				<p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
					Số lượng
				</p>
				<div className="flex items-center gap-3">
					<button
						type="button"
						disabled={quantity <= 1}
						onClick={() => setQuantity((q) => Math.max(1, q - 1))}
						className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center disabled:opacity-40">
						<Icon
							name="minus"
							className="text-base text-on-surface"
						/>
					</button>
					<span className="text-base font-black text-on-surface w-6 text-center">
						{quantity}
					</span>
					<button
						type="button"
						onClick={() => setQuantity((q) => q + 1)}
						className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center">
						<Icon
							name="add"
							className="text-base text-on-surface"
						/>
					</button>
				</div>
			</div>

			{/* Customer note */}
			<div className="space-y-2">
				<p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
					Ghi chú (tuỳ chọn)
				</p>
				<textarea
					value={note}
					onChange={(e) => setNote(e.target.value)}
					placeholder="Ví dụ: Gateron Yellow, chỉ lube linear..."
					rows={3}
					className="w-full text-sm rounded-2xl bg-surface-container p-3 text-on-surface placeholder:text-on-surface-variant resize-none outline-none focus:ring-2 focus:ring-primary/30"
				/>
			</div>

			{/* Pickup time */}
			<div className="space-y-2">
				<p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
					Thời gian nhận dịch vụ
				</p>
				<input
					type="datetime-local"
					value={pickupAt}
					onChange={(e) => setPickupAt(e.target.value)}
					className="w-full text-sm rounded-2xl bg-surface-container px-4 py-3 text-on-surface placeholder:text-on-surface-variant outline-none focus:ring-2 focus:ring-primary/30"
				/>
			</div>

			{/* Validation / API errors */}
			{(validationError ?? mutation.error) && (
				<p className="text-sm text-error font-medium">
					{validationError ?? mutation.error?.message}
				</p>
			)}

			{/* Fixed bottom bar */}
			<div className="fixed bottom-0 left-0 right-0 bg-base-100/90 backdrop-blur-sm border-t border-base-200 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
				<div className="flex items-center justify-between mb-3">
					<span className="text-xs text-on-surface-variant">
						Tổng dự kiến
					</span>
					<span className="text-base font-black text-primary">
						{formatVND(total)}
					</span>
				</div>
				<button
					type="button"
					onClick={handleSubmit}
					disabled={mutation.isPending}
					className="btn btn-primary w-full rounded-full font-black uppercase tracking-wide">
					{mutation.isPending ? (
						<span className="loading loading-spinner loading-sm" />
					) : (
						"Đặt dịch vụ"
					)}
				</button>
			</div>
		</div>
	);
}
