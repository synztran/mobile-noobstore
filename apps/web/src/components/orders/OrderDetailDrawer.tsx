"use client";

import type { OrderDetail } from "@/app/api/user/orders/[id]/route";
import { OrderPaymentPanel } from "@/components/orders/OrderPaymentPanel";
import { VoucherInfo } from "@/components/voucher/VoucherInfo";
import { formatVND } from "@/lib/currency";
import {
	CheckCircle2,
	CircleX,
	HourglassIcon,
	PackageCheck,
	Truck,
	X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

const STATUS_CONFIG: Record<
	string,
	{ label: string; Icon: React.ElementType; color: string; bg: string }
> = {
	pending: {
		label: "Đang kiểm tra",
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
	preparing: {
		label: "Đang chuẩn bị hàng",
		Icon: PackageCheck,
		color: "text-sky-700",
		bg: "bg-sky-50",
	},
	delivering: {
		label: "Đang vận chuyển",
		Icon: Truck,
		color: "text-blue-600",
		bg: "bg-blue-50",
	},
	paid: {
		label: "Đã thanh toán",
		Icon: CheckCircle2,
		color: "text-emerald-600",
		bg: "bg-emerald-50",
	},
	shipped: {
		label: "Đang vận chuyển",
		Icon: Truck,
		color: "text-blue-600",
		bg: "bg-blue-50",
	},
	delivered: {
		label: "Đã giao hàng",
		Icon: PackageCheck,
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

interface Props {
	orderId: string | null;
	onClose: () => void;
}

export function OrderDetailDrawer({ orderId, onClose }: Props) {
	const [detail, setDetail] = useState<OrderDetail | null>(null);
	const [loading, setLoading] = useState(false);
	const isOpen = orderId !== null;

	useEffect(() => {
		if (!isOpen) {
			setDetail(null);
			return;
		}
		setLoading(true);
		fetch(`/api/user/orders/${orderId}`)
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
	const voucherDiscount = detail?.voucher_discount_amount ?? 0;
	const shippingDiscount = detail?.shipping_discount_amount ?? 0;
	const totalDiscount = voucherDiscount + shippingDiscount;
	const cancelledAtLabel = detail?.cancelled_at
		? new Date(detail.cancelled_at).toLocaleString("vi-VN", {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			})
		: null;

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
							Chi tiết đơn hàng
						</p>
						<p className="font-black text-primary tracking-widest text-base">
							{detail?.order_number ??
								(loading ? "…" : `#${orderId}`)}
						</p>
					</div>
					<button
						onClick={onClose}
						className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center active:scale-90 transition-transform">
						<X size={18} className="text-on-surface" />
					</button>
				</div>

				{/* Scrollable body */}
				<div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
					{loading ? (
						<div className="animate-pulse space-y-4">
							<div className="h-14 bg-surface-container rounded-2xl" />
							<div className="h-28 bg-surface-container rounded-2xl" />
							<div className="space-y-3">
								{[1, 2].map((i) => (
									<div key={i} className="flex gap-3">
										<div className="w-16 h-16 bg-surface-container rounded-2xl flex-shrink-0" />
										<div className="flex-1 space-y-2 pt-1">
											<div className="h-3 bg-surface-container rounded-full w-3/4" />
											<div className="h-3 bg-surface-container rounded-full w-1/2" />
										</div>
									</div>
								))}
							</div>
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
									<div className="space-y-1">
										<p className="text-sm text-on-surface-variant">
											Ghi chú hủy
										</p>
										<p className="rounded-xl bg-surface px-3 py-2 text-sm text-on-surface leading-relaxed">
											{detail.cancelled_note?.trim() ||
												"Không có ghi chú hủy từ hệ thống."}
										</p>
									</div>
								</div>
							)}

							{/* Order items */}
							{detail.items.length > 0 && (
								<div className="space-y-2">
									<p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
										Sản phẩm ({detail.items.length})
									</p>
									{detail.items.map((item) => (
										<div
											key={item.id}
											className="bg-surface-container-lowest rounded-2xl p-3 flex gap-3 items-start">
											<div className="w-16 h-16 bg-surface-container rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden relative">
												{item.thumbnail ? (
													<Image
														src={item.thumbnail}
														alt={item.product_name}
														fill
														className="object-cover"
														sizes="64px"
													/>
												) : (
													<PackageCheck
														size={24}
														className="text-outline-variant"
													/>
												)}
											</div>
											<div className="flex-1 min-w-0 space-y-1">
												<p className="font-bold text-on-surface text-sm truncate">
													{item.product_name}
												</p>
												{item.components.length > 0 && (
													<div className="flex flex-wrap items-center gap-2">
														{item.components.map(
															(component) => (
																<p
																	key={`${item.id}-${component.variant_id}`}
																	className="text-[11px] text-on-surface-variant leading-snug truncate rounded-md bg-gray-200 px-2 py-1">
																	{
																		component.component_group
																	}
																	:{" "}
																	<span className="font-semibold text-on-surface">
																		{
																			component.variant_name
																		}
																	</span>
																</p>
															),
														)}
													</div>
												)}
												<div className="flex items-center justify-between mt-1.5">
													<span className="text-xs text-on-surface-variant">
														x{item.quantity}
													</span>
													<span className="font-black text-primary text-sm">
														{formatVND(
															item.unit_price *
																item.quantity,
														)}
													</span>
												</div>
											</div>
										</div>
									))}
								</div>
							)}

							{/* Payment panel — only shown for pending (unpaid) orders */}
							{detail.status === "pending" && (
								<OrderPaymentPanel
									orderNumber={detail.order_number}
									totalPrice={detail.total_price}
									shippingFee={detail.shipping_fee}
									voucherDiscount={voucherDiscount}
									shippingDiscount={shippingDiscount}
								/>
							)}

							{/* Voucher Info */}
							{(detail.voucher_code || totalDiscount > 0) && (
								<VoucherInfo
									voucherCode={detail.voucher_code}
									discountAmount={voucherDiscount}
									shippingDiscountAmount={shippingDiscount}
								/>
							)}

							{/* Price summary */}
							{["confirmed", "delivering", "delivered"].includes(
								detail.status,
							) && (
								<div className="bg-surface-container rounded-2xl px-4 py-3 space-y-2">
									<p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3">
										Tổng cộng
									</p>
									<div className="flex justify-between text-sm">
										<span className="text-on-surface-variant">
											Tạm tính
										</span>
										<span className="font-bold text-on-surface">
											{formatVND(
												detail.items.reduce(
													(s, i) =>
														s +
														i.unit_price *
															i.quantity,
													0,
												),
											)}
										</span>
									</div>
									<div className="flex justify-between text-sm">
										<span className="text-on-surface-variant">
											Vận chuyển
										</span>
										<span className="font-bold text-on-surface">
											{formatVND(detail.shipping_fee)}
										</span>
									</div>
									{voucherDiscount > 0 ? (
										<div className="flex justify-between text-sm">
											<span className="text-on-surface-variant">
												Giảm giá voucher
											</span>
											<span className="font-bold text-secondary">
												-{formatVND(voucherDiscount)}
											</span>
										</div>
									) : null}
									{shippingDiscount > 0 ? (
										<div className="flex justify-between text-sm">
											<span className="text-on-surface-variant">
												Giảm phí vận chuyển
											</span>
											<span className="font-bold text-secondary">
												-{formatVND(shippingDiscount)}
											</span>
										</div>
									) : null}
									<div className="h-px bg-outline-variant/30" />
									<div className="flex justify-between">
										<span className="font-black text-on-surface">
											Tổng đơn hàng
										</span>
										<div className="text-right">
											<span className="font-black text-primary text-base block">
												{formatVND(detail.total_price)}
											</span>
											{totalDiscount > 0 ? (
												<span className="text-xs text-on-surface-variant line-through">
													{formatVND(
														detail.total_price +
															totalDiscount,
													)}
												</span>
											) : null}
										</div>
									</div>
								</div>
							)}

							{/* Order number footer */}
							<div className="flex items-center gap-2 text-xs text-on-surface-variant pb-4">
								<span>Order #{detail.order_number}</span>
							</div>
						</>
					) : (
						<div className="flex items-center justify-center py-20 text-on-surface-variant text-sm">
							Không thể tải chi tiết đơn hàng
						</div>
					)}
				</div>
			</div>
		</>
	);
}
