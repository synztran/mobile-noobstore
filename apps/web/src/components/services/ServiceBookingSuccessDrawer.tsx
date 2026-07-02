"use client";

import { usePreventScroll } from "@/hooks/usePreventScroll";
import clsx from "clsx";
import { CheckCircle2, X } from "lucide-react";

interface ServiceBookingSuccessDrawerProps {
	open: boolean;
	orderNumber: string | null;
	onClose: () => void;
	onBookMore: () => void;
}

export function ServiceBookingSuccessDrawer({
	open,
	orderNumber,
	onClose,
	onBookMore,
}: ServiceBookingSuccessDrawerProps) {
	usePreventScroll(open);

	return (
		<>
			<div
				className={clsx(
					"fixed inset-0 bg-on-surface/35 backdrop-blur-sm z-[78] transition-opacity duration-300",
					open
						? "opacity-100 pointer-events-auto"
						: "opacity-0 pointer-events-none",
				)}
				onClick={onClose}
			/>

			<div
				className={clsx(
					"fixed left-0 right-0 z-[79] bg-surface-container-lowest rounded-t-3xl transition-all duration-300 ease-out p-5",
					open ? "bottom-0" : "-bottom-full",
				)}>
				<div className="flex justify-between items-center mb-5">
					<div className="w-8" />
					<div className="w-12 h-1 bg-outline-variant rounded-full" />
					<button
						type="button"
						onClick={onClose}
						className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center">
						<X size={16} />
					</button>
				</div>

				<div className="text-center space-y-3 pb-5">
					<CheckCircle2 className="mx-auto h-14 w-14 text-success" />
					<h3 className="text-lg font-black text-on-surface uppercase tracking-wide">
						Đặt lịch thành công
					</h3>
					<p className="text-sm text-on-surface-variant">
						Mã đơn của bạn:
					</p>
					<p className="text-base font-black text-primary">
						{orderNumber ?? "--"}
					</p>
				</div>

				<div className="space-y-2">
					<button
						type="button"
						onClick={onBookMore}
						className="w-full rounded-full bg-primary-gradient py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20">
						Đặt thêm dịch vụ
					</button>
					<button
						type="button"
						onClick={onClose}
						className="w-full rounded-full border border-outline-variant/30 bg-surface-container py-3 text-xs font-black uppercase tracking-widest text-on-surface">
						Đóng
					</button>
				</div>
			</div>
		</>
	);
}
