"use client";

import type { SubmitOrderResponse } from "@/app/api/checkout/submit/route";
import type { ValidateStockResponse } from "@/app/api/checkout/validate-stock/route";
import { OrderItemsList } from "@/components/checkout/OrderItemsList";
import { useIsMounted } from "@/hooks/useIsMounted";
import { formatVND } from "@/lib/currency";
import { toast } from "@/lib/toast";
import { useCartStore, useCheckoutStore } from "@/store";
import { ArrowRight, ShoppingBag, Truck } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function SummaryPage() {
	const router = useRouter();
	const mounted = useIsMounted();
	const [submitting, setSubmitting] = useState(false);
	const [oosProductIds, setOosProductIds] = useState<Set<string>>(new Set());

	const {
		items: rawItems,
		cartId,
		subtotal: getSubtotal,
		clearCart,
		removeItem,
	} = useCartStore();
	const { shippingCost, shipping, setOrder } = useCheckoutStore();

	const items = mounted ? rawItems : [];
	const subtotal = mounted ? getSubtotal() : 0;
	const orderTotal = subtotal + shippingCost;

	if (!mounted) {
		return (
			<div className="animate-pulse space-y-6">
				<div className="h-32 bg-surface-container rounded-3xl" />
				<div className="h-12 bg-surface-container rounded-full" />
				<div className="space-y-3">
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className="h-24 bg-surface-container rounded-2xl"
						/>
					))}
				</div>
				<div className="h-32 bg-surface-container rounded-3xl" />
				<div className="h-14 bg-surface-container rounded-full" />
			</div>
		);
	}

	const handleConfirmOrder = async () => {
		setSubmitting(true);
		try {
			// ── Pre-check: validate stock before deducting ──────────────────
			const stockRes = await fetch("/api/checkout/validate-stock", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					items: items.map((i) => ({
						product_id: i.product.id,
						product_name: i.product.name,
						variant_id: i.variant?.id ?? null,
						quantity: i.quantity,
            components: i.components
					})),
				}),
			});
			const stockData: ValidateStockResponse = await stockRes.json();

			if (!stockData.valid) {
				setOosProductIds(new Set(stockData.oos_items.map((o) => o.product_id)));
				for (const oos of stockData.oos_items) {
					if (oos.available === 0) {
						toast.error(`"${oos.product_name}" đã hết hàng`);
					} else {
						toast.warning(
							`"${oos.product_name}" chỉ còn ${oos.available} sản phẩm (bạn đang đặt ${oos.requested})`,
						);
					}
				}
				setSubmitting(false);
				return;
			}
			// Clear any previous OOS markers on successful validation
			setOosProductIds(new Set());
			// ────────────────────────────────────────────────────────────────
			const res = await fetch("/api/checkout/submit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					cart_id: cartId,
					total_price: orderTotal,
					shipping_cost: shippingCost,
					items: items.map((i) => ({
						product_id: i.product.id,
						product_name: i.product.name,
						unit_price:
							i.variant?.effective_price ?? i.product.base_price,
						thumbnail:
							i.variant?.thumbnail ??
							i.components?.find((c) => c.thumbnail)?.thumbnail ??
							i.product.thumbnail ??
							null,
						quantity: i.quantity,
						components: i.components?.map((c) => ({
							variant_id: c.variant_id,
							variant_name: c.variant_name,
							component_group: c.component_group,
							price_adjustment: c.price_adjustment,
							thumbnail: c.thumbnail,
						})),
					})),
				}),
			});
			const data = await res.json();
			if (!res.ok) {
				toast.error(data.error ?? "Không thể tạo đơn hàng");
				setSubmitting(false);
				return;
			}
			const result = data as SubmitOrderResponse;
			setOrder(result.order_id, result.order_number, orderTotal, items);
			clearCart();
			router.push(`/checkout/checking/${result.order_id}`);
		} catch {
			toast.error("Lỗi kết nối, vui lòng thử lại");
			setSubmitting(false);
		}
	};

	const handleEditShipping = () => {
		router.back();
	};

	return (
		<div className="space-y-4">
			{/* ── Header ───────────────────────────────────────────── */}
			<div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-surface-container to-surface-container-low p-4">
				<div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
				<div className="absolute -bottom-6 -left-6 w-24 h-24 bg-secondary/10 rounded-full blur-xl pointer-events-none" />
				<div className="relative flex items-center gap-4">
					<div className="w-14 h-14 rounded-2xl primary-gradient flex items-center justify-center shadow-ambient-sm flex-shrink-0">
						<ShoppingBag className="text-white" />
					</div>
					<div>
						<p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-0.5">
							Bước 02 / 03
						</p>
						<h2 className="text-2xl font-black text-on-surface tracking-tight">
							Kiểm tra đơn hàng
						</h2>
						<p className="text-xs text-on-surface-variant mt-0.5">
							Xem lại thông tin trước khi xác nhận
						</p>
					</div>
				</div>
				{/* Progress bar */}
				<div className="mt-5 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
					<div className="h-full w-2/3 primary-gradient rounded-full" />
				</div>
			</div>

			{/* ── Order Items ──────────────────────────────────────── */}
			<div className="space-y-4">
				<OrderItemsList
					items={items}
					oosProductIds={oosProductIds}
					onRemove={(productId, variantId) => {
						removeItem(productId, variantId);
						setOosProductIds((prev) => {
							const next = new Set(prev);
							next.delete(productId);
							return next;
						});
					}}
				/>
			</div>

			{/* ── Shipping Information ──────────────────────────────── */}
			<div className="bg-surface-container-low rounded-3xl p-4 space-y-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
							<Truck className="text-primary text-lg" />
						</div>
						<div>
							<p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
								Phương thức giao hàng
							</p>
							<p className="text-sm font-bold text-on-surface">
								{shipping?.deliverySpeed === "express"
									? "Giao hàng hỏa tốc"
									: "Giao hàng tiêu chuẩn"}
							</p>
						</div>
					</div>
					<button
						onClick={handleEditShipping}
						className="text-primary text-xs font-black uppercase tracking-widest hover:opacity-70 transition-opacity">
						Sửa
					</button>
				</div>
			</div>

			{/* ── Order Summary ────────────────────────────────────── */}
			<div className="rounded-3xl overflow-hidden bg-surface-container-low">
				<div className="px-4 pt-4 pb-3 space-y-4">
					<p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
						Tóm tắt đơn hàng
					</p>

					<div className="space-y-3">
						<div className="flex justify-between items-center text-sm">
							<span className="text-on-surface-variant">
								Tạm tính
							</span>
							<span className="font-bold text-on-surface">
								{formatVND(subtotal)}
							</span>
						</div>

						<div className="flex justify-between items-center text-sm">
							<span className="text-on-surface-variant">
								Phí vận chuyển
							</span>
							<span className="font-bold text-on-surface">
								{shippingCost === 0
									? "Miễn phí"
									: formatVND(shippingCost)}
							</span>
						</div>

						<div className="h-px bg-outline-variant/30" />

						<div className="flex justify-between items-center">
							<span className="font-black text-on-surface">
								Tổng cộng
							</span>
							<span className="text-2xl font-black text-on-surface">
								{formatVND(orderTotal)}
							</span>
						</div>
					</div>
				</div>

				<button
					onClick={handleConfirmOrder}
					disabled={submitting}
					className="w-full primary-gradient text-white font-black uppercase tracking-widest py-4 flex items-center justify-center gap-2 text-sm active:opacity-90 transition-opacity disabled:opacity-60">
					{submitting ? (
						<span className="loading loading-spinner loading-sm" />
					) : (
						<>
							Xác nhận đơn hàng
							<ArrowRight className="text-lg" />
						</>
					)}
				</button>
			</div>
		</div>
	);
}
