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
	const isEmpty = selectedCount === 0;

	return (
		<div className="fixed left-0 right-0 bottom-0 z-[60] border-t border-outline-variant/20 bg-surface/80 backdrop-blur-xl px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
			{isEmpty ? (
				<p className="mb-2 text-center text-[10px] font-bold text-on-surface-variant">
					Chọn dịch vụ bên trên để bắt đầu đặt lịch
				</p>
			) : (
				<>
			<div className="flex items-center justify-between mb-2">
				<div>
					<p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
						Đã chọn
					</p>
					<p className="text-sm font-black text-on-surface">
						{selectedCount} mục dịch vụ
					</p>
				</div>
				<div className="text-right">
					<p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
						Tổng tạm tính
					</p>
					<p className="text-base font-black text-primary">
						{formatVND(totalPrice)}
					</p>
				</div>
			</div>

			<div className="flex items-center justify-between mb-2">
				<p className="text-[10px] text-on-surface-variant">
					Tổng thời gian xử lý:{" "}
					<span className="font-bold text-on-surface">
						{totalHandlingDays}
					</span>{" "}
					ngày
				</p>
				<button
					type="button"
					onClick={() => setExpanded((v) => !v)}
					className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant transition-colors hover:bg-surface-container-high"
				>
					{expanded ? (
						<>
							Thu gọn <ChevronUp size={12} />
						</>
					) : (
						<>
							Chi tiết <ChevronDown size={12} />
						</>
					)}
				</button>
			</div>

			{expanded ? (
				<div className="mb-3 max-h-36 overflow-y-auto rounded-2xl border border-outline-variant/20 bg-surface-container-low p-3 space-y-2">
					{summaryItems.length === 0 ? (
						<p className="text-xs text-on-surface-variant">
							Chưa có mục được chọn.
						</p>
					) : (
						summaryItems.map((item) => (
							<div
								key={item.serviceId}
								className="flex items-center justify-between gap-2"
							>
								<div className="min-w-0">
									<p className="text-xs font-bold text-on-surface truncate">
										{item.serviceName}
										<span className="ml-1 text-on-surface-variant font-normal">
											x{item.count}
										</span>
									</p>
									<p className="text-[10px] text-on-surface-variant">
										{item.handlingDays} ngày
									</p>
								</div>
								<p className="text-sm font-black text-primary shrink-0">
									{formatVND(item.price)}
								</p>
							</div>
						))
					)}
				</div>
			) : null}
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
