"use client";

import type { ServiceOrderDetail } from "@/app/api/user/service-orders/[id]/route";
import { formatVND } from "@/lib/currency";
import {
	Calendar,
	CheckCircle2,
	CircleX,
	ClipboardList,
	Clock,
	HourglassIcon,
	MapPin,
	ScanBarcode,
	Wrench,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";

const STATUS_CONFIG: Record<
	string,
	{ label: string; Icon: React.ElementType; color: string; bg: string }
> = {
	pending: {
		label: "Chờ xác nhận",
		Icon: HourglassIcon,
		color: "text-amber-600",
		bg: "bg-amber-50",
	},
	confirmed: {
		label: "Đã xác nhận",
		Icon: CheckCircle2,
		color: "text-emerald-600",
		bg: "bg-emerald-50",
	},
	in_progress: {
		label: "Đang xử lý",
		Icon: Wrench,
		color: "text-sky-700",
		bg: "bg-sky-50",
	},
	completed: {
		label: "Hoàn thành",
		Icon: CheckCircle2,
		color: "text-primary",
		bg: "bg-primary/5",
	},
	cancelled: {
		label: "Đã hủy",
		Icon: CircleX,
		color: "text-error",
		bg: "bg-error/5",
	},
};

function fmtDate(iso: string | null, withTime = false) {
	if (!iso) return "—";
	return new Date(iso).toLocaleString("vi-VN", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
	});
}

interface Props {
	orderId: string | null;
	onClose: () => void;
}

export function ServiceOrderDetailDrawer({ orderId, onClose }: Props) {
	const [detail, setDetail] = useState<ServiceOrderDetail | null>(null);
	const [loading, setLoading] = useState(false);
	const isOpen = orderId !== null;

	useEffect(() => {
		if (!isOpen) {
			setDetail(null);
			return;
		}
		setLoading(true);
		fetch(`/api/user/service-orders/${orderId}`)
			.then((r) => r.json())
			.then((d) => setDetail(d?.error ? null : d))
			.catch(() => {})
			.finally(() => setLoading(false));
	}, [orderId, isOpen]);

	useEffect(() => {
		document.body.style.overflow = isOpen ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	const cfg = detail
		? (STATUS_CONFIG[detail.status] ?? STATUS_CONFIG.pending)
		: null;

	const cancelledAtLabel = detail?.cancelled_at
		? fmtDate(detail.cancelled_at, true)
		: null;

	// Shared pickup info (from first line)
	const firstLine = detail?.lines[0];

	return (
		<>
			{/* Backdrop */}
			<div
				className={`fixed inset-0 bg-on-surface/30 backdrop-blur-sm z-[60] transition-opacity duration-300 !mt-0 ${
					isOpen
						? "opacity-100 pointer-events-auto"
						: "opacity-0 pointer-events-none"
				}`}
				onClick={onClose}
			/>

			{/* Drawer */}
			<div
				className={`fixed left-0 right-0 z-[999] bg-surface rounded-t-5xl max-h-[85vh] flex flex-col transition-all duration-250 ease-out ${
					isOpen ? "bottom-0" : "-bottom-full"
				}`}
				style={{ height: "85vh" }}>
				{/* Handle */}
				<div className="flex justify-center pt-3 pb-1 flex-shrink-0">
					<div className="w-10 h-1 bg-outline-variant rounded-full" />
				</div>

				{/* Header */}
				<div className="flex items-center justify-between px-5 py-3 flex-shrink-0 border-b border-outline-variant/20">
					<div>
						<p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
							Chi tiết đơn dịch vụ
						</p>
						<p className="font-black text-primary tracking-widest text-base">
							{detail?.order_number ??
								(loading ? "…" : `#${orderId}`)}
						</p>
					</div>
					<button
						onClick={onClose}
						className="rounded-xl border border-outline-variant/40 bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface transition-all active:scale-90">
						Đóng
					</button>
				</div>

				{/* Scrollable body */}
				<div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
					{loading ? (
						<div className="animate-pulse space-y-4">
							<div className="h-14 bg-surface-container rounded-2xl" />
							<div className="h-24 bg-surface-container rounded-2xl" />
							{[1, 2].map((i) => (
								<div
									key={i}
									className="h-28 bg-surface-container rounded-2xl"
								/>
							))}
						</div>
					) : detail ? (
						<>
							{/* Status */}
							{(() => {
								const StatusIcon = cfg!.Icon;
								return (
									<div
										className={`rounded-2xl px-4 py-3 flex items-center gap-3 ${cfg!.bg}`}>
										<StatusIcon
											size={22}
											className={cfg!.color}
										/>
										<p
											className={`font-black text-sm ${cfg!.color}`}>
											{cfg!.label}
										</p>
									</div>
								);
							})()}

							{/* Cancelled details */}
							{detail.status === "cancelled" && (
								<div className="rounded-2xl border border-error/20 bg-error/5 px-4 py-3 space-y-2">
									<p className="text-[10px] font-black uppercase tracking-widest text-error">
										Chi tiết hủy đơn
									</p>
									<div className="flex items-start justify-between gap-3 text-sm">
										<span className="text-on-surface-variant">
											Thời gian hủy
										</span>
										<span className="font-bold text-on-surface text-right">
											{cancelledAtLabel ??
												"Không có thông tin"}
										</span>
									</div>
									{detail.cancelled_note?.trim() ? (
										<div className="space-y-1">
											<p className="text-sm text-on-surface-variant">
												Ghi chú hủy
											</p>
											<p className="rounded-xl bg-surface px-3 py-2 text-sm text-on-surface leading-relaxed">
												{detail.cancelled_note}
											</p>
										</div>
									) : null}
								</div>
							)}

							{/* Pickup info */}
							{firstLine && (
								<div className="rounded-2xl bg-surface-container px-4 py-3 space-y-2.5">
									<p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
										Thông tin lấy hàng
									</p>
									<div className="flex items-start gap-2.5 text-sm">
										<Calendar
											size={14}
											className="text-primary mt-0.5 flex-shrink-0"
										/>
										<div>
											<p className="text-on-surface-variant text-xs">
												Thời gian lấy hàng
											</p>
											<p className="font-semibold text-on-surface">
												{firstLine.pickup_at
													? fmtDate(
															firstLine.pickup_at,
															true,
														)
													: "Chưa đặt lịch"}
											</p>
										</div>
									</div>
									{firstLine.pickup_note ? (
										<div className="flex items-start gap-2.5 text-sm">
											<MapPin
												size={14}
												className="text-primary mt-0.5 flex-shrink-0"
											/>
											<div>
												<p className="text-on-surface-variant text-xs">
													Ghi chú lấy hàng
												</p>
												<p className="font-semibold text-on-surface">
													{firstLine.pickup_note}
												</p>
											</div>
										</div>
									) : null}
								</div>
							)}

							{/* Service lines */}
							{detail.lines.length > 0 && (
								<div className="space-y-2">
									<p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
										Dịch vụ ({detail.lines.length})
									</p>
									{detail.lines.map((line, idx) => (
										<div
											key={line.id}
											className="bg-surface-container-lowest rounded-2xl p-3.5 space-y-2.5">
											{/* Service name + price */}
											<div className="flex items-start justify-between gap-2">
												<div className="flex items-center gap-2">
													<span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary flex-shrink-0">
														{idx + 1}
													</span>
													<p className="font-bold text-on-surface text-sm leading-snug">
														{line.service_name ??
															"Dịch vụ"}
													</p>
												</div>
												<span className="font-black text-primary text-sm whitespace-nowrap">
													{formatVND(
														line.price *
															line.quantity,
													)}
												</span>
											</div>

											{/* Meta */}
											<div className="flex flex-wrap gap-2">
												<span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant">
													<ClipboardList size={10} />
													SL: {line.quantity}
												</span>
												<span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant">
													<Clock size={10} />
													{
														line.handling_days_snapshot
													}{" "}
													ngày
												</span>
												{line.inbound_tracking_number ? (
													<span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
														<ScanBarcode
															size={10}
														/>
														{
															line.inbound_tracking_number
														}
													</span>
												) : null}
											</div>

											{/* Customer note */}
											{line.customer_note ? (
												<p className="rounded-xl bg-surface-container px-3 py-2 text-xs text-on-surface-variant leading-relaxed">
													{line.customer_note}
												</p>
											) : null}

											{/* Received timestamp */}
											{line.received_at ? (
												<p className="text-[11px] text-emerald-600 font-semibold">
													Đã nhận hàng:{" "}
													{fmtDate(
														line.received_at,
														true,
													)}
												</p>
											) : null}
										</div>
									))}
								</div>
							)}

							{/* Total */}
							<div className="bg-surface-container rounded-2xl px-4 py-3 space-y-2">
								<p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1">
									Tổng cộng
								</p>
								<div className="flex justify-between">
									<span className="font-black text-on-surface">
										Tổng đơn dịch vụ
									</span>
									<span className="font-black text-primary text-base">
										{formatVND(detail.total_price)}
									</span>
								</div>
							</div>

							{/* Footer */}
							<div className="flex items-center gap-2 text-xs text-on-surface-variant pb-4">
								<span>Order #{detail.order_number}</span>
								<span>·</span>
								<span>{fmtDate(detail.created_at, true)}</span>
							</div>
						</>
					) : (
						<div className="flex items-center justify-center py-20 text-on-surface-variant text-sm">
							Không thể tải chi tiết đơn dịch vụ
						</div>
					)}
				</div>
			</div>
		</>
	);
}
