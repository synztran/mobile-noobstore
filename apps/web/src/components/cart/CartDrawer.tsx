"use client";

import Icon from "@/components/ui/Icon";
import { useIsMounted } from "@/hooks/useIsMounted";
import { usePreventScroll } from "@/hooks/usePreventScroll";
import { formatVND } from "@/lib/currency";
import type { CartItem } from "@/lib/data";
import { useCartStore } from "@/store";
import { Trash } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

function itemUnitPrice(item: CartItem) {
	const base = item.variant?.effective_price ?? item.product.base_price;
	const components =
		item.components?.reduce((s, c) => s + c.price_adjustment, 0) ?? 0;
	return base + components;
}

export function CartDrawer() {
	const mounted = useIsMounted();
	const { items, isOpen, closeCart, updateQty, removeItem, total } =
		useCartStore();
	const subtotal = mounted ? total() : 0;
	const visibleItems = mounted ? items : [];
	const drawerOpen = mounted && isOpen;

	const [pendingRemoval, setPendingRemoval] = useState<{
		productId: string;
		variantId: string | null;
	} | null>(null);
	const confirmDialogRef = useRef<HTMLDialogElement>(null);

	const handleRemoveClick = (productId: string, variantId: string | null) => {
		setPendingRemoval({ productId, variantId });
		confirmDialogRef.current?.showModal();
	};

	const confirmRemove = () => {
		if (pendingRemoval) {
			removeItem(pendingRemoval.productId, pendingRemoval.variantId);
			setPendingRemoval(null);
		}
		confirmDialogRef.current?.close();
	};

	const cancelRemove = () => {
		setPendingRemoval(null);
		confirmDialogRef.current?.close();
	};

	const handleMinus = (item: CartItem) => {
		if (item.quantity === 1) {
			handleRemoveClick(item.product.id, item.variant?.id ?? null);
		} else {
			updateQty(item.product.id, item.variant?.id ?? null, -1);
		}
	};

	usePreventScroll(drawerOpen);

	return (
		<>
			<div
				className={`fixed inset-0 bg-on-surface/30 backdrop-blur-sm z-[60] transition-opacity duration-300 ${
					drawerOpen
						? "opacity-100 pointer-events-auto"
						: "opacity-0 pointer-events-none"
				}`}
				onClick={closeCart}
			/>

			{/* Drawer */}
			<div
				className={`fixed left-0 right-0 z-[999] bg-surface rounded-t-5xl max-h-[80vh] h-full flex flex-col transition-all duration-250 ease-out ${
					drawerOpen ? "top-[20vh]" : "top-[110vh]"
				}`}>
				{/* Handle */}
				<div className="flex justify-center pt-3 pb-2">
					<div className="w-10 h-1 bg-outline-variant rounded-full" />
				</div>

				{/* Header */}
				<div className="flex justify-between items-center px-6 py-4">
					<h2 className="text-xl font-black tracking-tight text-on-surface">
						Giỏ hàng của bạn
					</h2>
					<button
						onClick={closeCart}
						className="text-on-surface hover:opacity-70 transition-opacity active:scale-95">
						<Icon name="close" className="text-on-surface" />
					</button>
				</div>

				{/* Items */}
				<div className="flex-1 overflow-y-auto px-6 space-y-4 pb-4">
					{visibleItems.length === 0 ? (
						<div className="text-center py-12">
							<Icon
								name="shopping_bag"
								className="text-5xl text-outline-variant flex justify-center"
							/>
							<p className="mt-3 text-on-surface-variant font-semibold">
								Giỏ hàng trống
							</p>
						</div>
					) : (
						visibleItems.map((item) => (
							<div
								key={`${item.product.id}-${item.variant?.id ?? "base"}`}
								className="relative flex gap-4 items-center bg-surface-container-low rounded-3xl p-3">
								{/* Remove button */}
								<button
									onClick={() =>
										handleRemoveClick(
											item.product.id,
											item.variant?.id ?? null,
										)
									}
									className="absolute top-2 right-2 w-7 h-7 rounded-full bg-surface-container flex items-center justify-center active:scale-90 transition-transform z-10">
									<Trash className="text-red-400" size={14} />
								</button>
								{/* Thumbnail */}
								<div className="w-20 h-20 rounded-2xl overflow-hidden bg-surface-container flex-shrink-0 relative">
									{item.product.thumbnail ? (
										<Image
											src={item.product.thumbnail}
											alt={item.product.name}
											fill
											className="object-cover"
											unoptimized
										/>
									) : (
										<div className="absolute inset-0 flex items-center justify-center">
											<Icon
												name="inventory_2"
												className="text-3xl text-outline-variant"
											/>
										</div>
									)}
								</div>
								<div className="flex-1 min-w-0">
									<p className="font-bold text-on-surface text-base leading-tight truncate">
										{item.product.name}
									</p>
									{item.variant && (
										<p className="text-sm text-on-surface-variant font-semibold tracking-wide mt-0.5">
											{item.variant.variant_name}
										</p>
									)}
									{item.components &&
										item.components.length > 0 && (
											<div className="flex flex-wrap gap-1 mt-1">
												{item.components.map((c) => (
													<span
														key={c.variant_id}
														className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-surface-container text-on-surface-variant rounded-full px-2 py-0.5">
														{c.component_group}:{" "}
														<strong>
															{c.variant_name}
														</strong>
													</span>
												))}
											</div>
										)}
									<div className="flex items-center justify-between mt-2">
										<div className="flex items-center gap-3 bg-surface-container rounded-full px-3 py-1.5">
											<button
												onClick={() =>
													handleMinus(item)
												}
												className="text-on-surface font-bold text-base leading-none active:scale-90 transition-transform">
												−
											</button>
											<span className="text-sm font-bold text-on-surface w-4 text-center">
												{item.quantity}
											</span>
											<button
												onClick={() =>
													updateQty(
														item.product.id,
														item.variant?.id ??
															null,
														1,
													)
												}
												className="text-on-surface font-bold text-base leading-none active:scale-90 transition-transform">
												+
											</button>
										</div>
										<div className="flex items-center gap-2">
											<p className="text-primary font-black">
												{formatVND(
													itemUnitPrice(item) *
														item.quantity,
												)}
											</p>
										</div>
									</div>
								</div>
							</div>
						))
					)}

					{/* Sustainable packaging badge */}
					{visibleItems.length > 0 && (
						<div className="flex items-center gap-3 bg-secondary/10 rounded-2xl px-4 py-3">
							<Icon
								name="eco"
								className="text-secondary text-sm"
							/>
							<p className="text-secondary text-xs font-bold uppercase tracking-wider">
								Đơn hàng này được đóng gói thân thiện với môi
								trường.
							</p>
						</div>
					)}
				</div>

				{/* Footer */}
				{visibleItems.length > 0 && (
					<div className="px-6 py-4 border-t border-outline-variant/20 bg-surface">
						<div className="space-y-2 mb-4">
							<div className="flex justify-between items-center">
								<span className="text-on-surface-variant text-sm">
									Tạm tính
								</span>
								<span className="font-semibold text-on-surface">
									{formatVND(subtotal)}
								</span>
							</div>
							<div className="flex justify-between items-center">
								<span className="text-on-surface-variant text-sm">
									Phí vận chuyển dự kiến
								</span>
								<span className="font-semibold text-secondary text-xs">
									Chi tiết ở bước thanh toán
								</span>
							</div>
							<div className="flex justify-between pt-2">
								<span className="font-bold text-on-surface">
									Tổng cộng
								</span>
								<span className="text-primary font-black text-xl">
									{formatVND(subtotal)}
								</span>
							</div>
						</div>

						<Link
							href="/checkout/shipping"
							onClick={closeCart}
							className="btn w-full primary-gradient text-white border-0 rounded-full font-bold tracking-widest uppercase py-4 h-auto text-base shadow-ambient-sm active:scale-[0.98] transition-transform">
							THANH TOÁN →
						</Link>
						<p className="text-center text-xs text-on-surface-variant mt-3 font-semibold uppercase tracking-widest">
							Thanh toán bảo mật & mã hóa
						</p>
					</div>
				)}
			</div>

			{/* Confirmation Modal */}
			<dialog
				ref={confirmDialogRef}
				className="modal modal-bottom sm:modal-middle backdrop-blur-sm">
				<div className="modal-box bg-surface">
					<h3 className="font-black text-lg text-on-surface mb-2">
						Xóa sản phẩm?
					</h3>
					<p className="text-sm text-on-surface-variant font-semibold mb-6">
						Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?
					</p>
					<div className="modal-action flex gap-3">
						<button
							onClick={cancelRemove}
							className="btn bg-surface-container text-on-surface border-outline-variant hover:bg-surface-container-high rounded-full normal-case font-bold">
							Hủy
						</button>
						<button
							onClick={confirmRemove}
							className="btn bg-error text-white border-0 hover:bg-error/90 rounded-full normal-case font-bold">
							Xóa
						</button>
					</div>
				</div>
			</dialog>
		</>
	);
}
