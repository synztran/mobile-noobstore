"use client";

import { formatVND } from "@/lib/currency";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export interface BookingSummaryItem {
	serviceId: string;
	serviceName: string;
	count: number;
	handlingDays: number;
	price: number;
}

interface ServiceBookingSummaryBarProps {
	totalPrice: number;
	totalHandlingDays: number;
	selectedCount: number;
	summaryItems: BookingSummaryItem[];
	disabled: boolean;
	isSubmitting: boolean;
	onSubmit: () => void;
}

export function ServiceBookingSummaryBar({
	totalPrice,
	totalHandlingDays,
	selectedCount,
	summaryItems,
	disabled,
	isSubmitting,
	onSubmit,
}: ServiceBookingSummaryBarProps) {
	const [expanded, setExpanded] = useState(false);

	return (
		<div className="fixed left-0 right-0 z-[60] border-t border-base-200 bg-base-100/95 backdrop-blur px-4 py-3 bottom-0">
			<div className="flex items-center justify-between mb-2">
				<div>
					<p className="text-[11px] uppercase tracking-wider text-on-surface-variant">
						Đã chọn
					</p>
					<p className="text-sm font-black text-on-surface">
						{selectedCount} mục dịch vụ
					</p>
				</div>
				<div className="text-right">
					<p className="text-[11px] uppercase tracking-wider text-on-surface-variant">
						Tổng tạm tính
					</p>
					<p className="text-base font-black text-primary">
						{formatVND(totalPrice)}
					</p>
				</div>
			</div>

			<div className="flex items-center justify-between mb-2">
				<p className="text-xs text-on-surface-variant">
					Tổng thời gian xử lý dự kiến:{" "}
					<span className="font-bold text-on-surface">
						{totalHandlingDays}
					</span>{" "}
					ngày
				</p>
				<button
					type="button"
					onClick={() => setExpanded((v) => !v)}
					className="btn btn-ghost btn-xs rounded-full">
					{expanded ? (
						<>
							Thu gọn <ChevronUp size={14} />
						</>
					) : (
						<>
							Chi tiết <ChevronDown size={14} />
						</>
					)}
				</button>
			</div>

			{expanded ? (
				<div className="mb-3 max-h-36 overflow-y-auto rounded-xl border border-base-200 bg-base-100 p-2 space-y-1.5">
					{summaryItems.length === 0 ? (
						<p className="text-xs text-on-surface-variant">
							Chưa có mục được chọn.
						</p>
					) : (
						summaryItems.map((item) => (
							<div
								key={item.serviceId}
								className="flex items-center justify-between text-xs gap-2">
								<div className="text-left shrink-0">
									<p className="font-semibold text-on-surface truncate">
										{item.serviceName}
										<span className="ml-1 text-on-surface-variant font-normal">
											x{item.count}
										</span>
									</p>
									<p className="text-[10px] text-on-surface-variant">
										{item.handlingDays} ngày
									</p>
								</div>

								<p className="font-black text-sm text-primary">
									{formatVND(item.price)}
								</p>
							</div>
						))
					)}
				</div>
			) : null}

			<button
				type="button"
				onClick={onSubmit}
				disabled={disabled || isSubmitting}
				className="btn btn-primary w-full rounded-full font-black uppercase tracking-wide disabled:opacity-50">
				{isSubmitting ? (
					<span className="loading loading-spinner loading-sm" />
				) : (
					"Đặt lịch dịch vụ"
				)}
			</button>
		</div>
	);
}
