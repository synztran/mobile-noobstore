"use client";

import Icon from "@/components/ui/Icon";
import { useIsMounted } from "@/hooks/useIsMounted";
import { usePreventScroll } from "@/hooks/usePreventScroll";
import { formatVND } from "@/lib/currency";
import type { CartItem } from "@/lib/data";
import { toast } from "@/lib/toast";
import { useCartStore } from "@/store";
import { Trash } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo, useRef, useState } from "react";

function itemUnitPrice(item: CartItem) {
	const base = item.variant?.effective_price ?? item.product.base_price;
	const components =
		item.components?.reduce((s, c) => s + c.price_adjustment, 0) ?? 0;
	return base + components;
}

// ─── Cart Item Row ────────────────────────────────────────────────────────────

type CartItemRowProps = {
	item: CartItem;
	onRemove: (productId: string, variantId: string | null) => void;
	onMinus: (item: CartItem) => void;
	onPlus: (item: CartItem) => void;
};

const CartItemRow = memo(function CartItemRow({
	item,
	onRemove,
	onMinus,
	onPlus,
}: CartItemRowProps) {
	const unitTotal = useMemo(
		() => itemUnitPrice(item) * item.quantity,
		[item],
	);
	const isPreOrderComponent = useMemo(
		() => item.components?.some((c) => c.is_pre_order) ?? false,
		[item.components],
	);

	return (
		<div className="relative flex gap-2 items-start bg-surface-container-low rounded-3xl p-2">
			{/* Remove button */}
			<button
				onClick={() =>
					onRemove(item.product.id, item.variant?.id ?? null)
				}
				className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-400 flex items-center justify-center active:scale-90 transition-transform z-10">
				<Trash className="text-white" size={14} />
			</button>
			{/* Thumbnail */}
			<div className="w-20 h-20 bg-surface-container flex-shrink-0 relative mt-2">
				{item.product.thumbnail ? (
					<Image
						src={item.product.thumbnail}
						alt={item.product.name}
						fill
						className="object-cover rounded-lg"
						sizes="80px"
					/>
				) : (
					<div className="absolute inset-0 flex items-center justify-center">
						<Icon
							name="inventory_2"
							className="text-3xl text-outline-variant"
						/>
					</div>
				)}
				{isPreOrderComponent && (
					<span className="absolute min-w-16 text-center text-nowrap -top-2 left-1/2 transform -translate-x-1/2 text-[8px] font-black uppercase text-white bg-violet-500 rounded-sm px-1 py-0.5 truncate">
						Pre-order
					</span>
				)}
			</div>
			<div className="flex-1 min-w-0">
				<p className="font-bold text-on-surface text-base leading-tight truncate line-clamp-1 mr-6">
					{item.product.name}
				</p>
				{item.variant && (
					<p className="text-xs text-on-surface-variant font-semibold tracking-wide mt-0.5">
						{item.variant.variant_name}
					</p>
				)}
				{item.variant?.is_pre_order && (
					<span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white bg-violet-500 rounded-full px-2 py-0.5 mt-1">
						<Icon name="schedule" className="text-xs" />
						Đặt trước
					</span>
				)}
				{item.components && item.components.length > 0 && (
					<div className="flex flex-wrap gap-1 mt-1">
						{item.components.map((c) => (
							<span
								key={c.variant_id}
								className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-gray-200 text-on-surface-variant rounded-full px-2 py-0.5">
								{c.component_group}:{" "}
								<strong>{c.variant_name}</strong>
							</span>
						))}
					</div>
				)}
				<div className="flex items-center justify-between mt-2">
					<div className="flex items-center gap-3 bg-gray-200 rounded-full px-3 py-1.5">
						<button
							onClick={() => onMinus(item)}
							className="text-on-surface font-bold text-base leading-none active:scale-90 transition-transform">
							−
						</button>
						<span className="text-sm font-bold text-on-surface w-4 text-center">
							{item.quantity}
						</span>
						<button
							onClick={() => onPlus(item)}
							className="text-on-surface font-bold text-base leading-none active:scale-90 transition-transform">
							+
						</button>
					</div>
					<p className="text-primary font-black">
						{formatVND(unitTotal)}
					</p>
				</div>
			</div>
		</div>
	);
});

// ─── Cart Drawer ──────────────────────────────────────────────────────────────

export function CartDrawer() {
	const router = useRouter();
	const mounted = useIsMounted();
	const { items, isOpen, closeCart, updateQty, removeItem, total } =
		useCartStore();

	const visibleItems = useMemo(
		() => (mounted ? items : []),
		[mounted, items],
	);
	// `total` is a stable fn ref in Zustand — `items` must be in deps so this
	// recomputes whenever the cart contents change.
	const subtotal = useMemo(
		() => (mounted ? total() : 0),
		[mounted, total, items],
	);
	const drawerOpen = mounted && isOpen;

	const [pendingRemoval, setPendingRemoval] = useState<{
		productId: string;
		variantId: string | null;
	} | null>(null);
	const [checkingOut, setCheckingOut] = useState(false);
	const confirmDialogRef = useRef<HTMLDialogElement>(null);

	const hasPreOrderItem = useMemo(
		() =>
			visibleItems.some(
				(i) =>
					i.components?.some((c) => c.is_pre_order) ||
					i.variant?.is_pre_order,
			),
		[visibleItems],
	);

	const handleRemoveClick = useCallback(
		(productId: string, variantId: string | null) => {
			setPendingRemoval({ productId, variantId });
			confirmDialogRef.current?.showModal();
		},
		[],
	);

	const confirmRemove = useCallback(() => {
		if (pendingRemoval) {
			removeItem(pendingRemoval.productId, pendingRemoval.variantId);
			setPendingRemoval(null);
		}
		confirmDialogRef.current?.close();
	}, [pendingRemoval, removeItem]);

	const cancelRemove = useCallback(() => {
		setPendingRemoval(null);
		confirmDialogRef.current?.close();
	}, []);

	const handleMinus = useCallback(
		(item: CartItem) => {
			if (item.quantity === 1) {
				handleRemoveClick(item.product.id, item.variant?.id ?? null);
			} else {
				updateQty(item.product.id, item.variant?.id ?? null, -1);
			}
		},
		[handleRemoveClick, updateQty],
	);

	const handlePlus = useCallback(
		(item: CartItem) => {
			if (item.quantity >= item.product.stock_quantity) {
				toast.warning(
					`Chỉ còn ${item.product.stock_quantity} sản phẩm trong kho`,
				);
				return;
			}
			updateQty(item.product.id, item.variant?.id ?? null, 1);
		},
		[updateQty],
	);

	const handleCheckout = useCallback(async () => {
		if (checkingOut) return;
		setCheckingOut(true);
		await router.push("/checkout/shipping");
		closeCart();
		setCheckingOut(false);
	}, [checkingOut, router, closeCart]);

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
				className={`fixed left-0 right-0 z-[999] bg-surface rounded-t-5xl max-h-[90dvh] h-full flex flex-col transition-all duration-250 ease-out ${
					drawerOpen ? "top-[10vh]" : "top-[110vh]"
				}`}>
				{/* Handle */}
				<div className="flex justify-center pt-3 pb-2">
					<div className="w-10 h-1 bg-outline-variant rounded-full" />
				</div>

				{/* Header */}
				<div className="flex justify-between items-center px-4 py-2">
					<h2 className="text-xl font-black tracking-tight text-on-surface">
						Giỏ hàng của bạn
					</h2>
					<button
						onClick={closeCart}
						className="text-on-surface hover:opacity-70 transition-opacity active:scale-95">
						<Icon name="close" className="text-on-surface" />
					</button>
				</div>

				{/* Pre-order notice */}
				{/* {hasPreOrderItem && (
					<div className="mx-4 mb-2 flex items-center gap-2 bg-violet-500/10 border border-violet-500/30 rounded-2xl px-4 py-2.5">
						<Icon
							name="schedule"
							className="text-violet-400 text-base shrink-0"
						/>
						<p className="text-xs font-black uppercase tracking-widest text-violet-400">
							Giỏ hàng có sản phẩm đặt trước
						</p>
					</div>
				)} */}

				{/* Items */}
				<div
					data-allow-scroll
					className="flex-1 overflow-y-auto px-4 space-y-4 pb-4 overscroll-contain min-h-0 max-h-full">
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
						visibleItems.map((item) => {
							const itemKey = item.components?.length
								? `${item.product.id}-kit-${item.components.map((c) => c.variant_id).join("+")}`
								: `${item.product.id}-${item.variant?.id ?? "base"}`;
							return (
								<CartItemRow
									key={itemKey}
									item={item}
									onRemove={handleRemoveClick}
									onMinus={handleMinus}
									onPlus={handlePlus}
								/>
							);
						})
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
					<div
						className="px-4 pt-4 border-t border-outline-variant/20 bg-surface space-y-2"
						style={{
							paddingBottom:
								"max(2rem, env(safe-area-inset-bottom))",
						}}>
						<div className="space-y-1">
							<div className="flex justify-between items-center">
								<span className="text-on-surface-variant text-sm">
									Tạm tính
								</span>
								<span className="font-semibold text-on-surface">
									{formatVND(subtotal)}
								</span>
							</div>
							{/* <div className="flex justify-between items-center">
								<span className="text-on-surface-variant text-sm">
									Phí vận chuyển dự kiến
								</span>
								<span className="font-semibold text-secondary text-xs">
									Chi tiết ở bước thanh toán
								</span>
							</div> */}
							<div className="flex justify-between">
								<span className="font-bold text-on-surface">
									Tổng cộng
								</span>
								<span className="text-primary font-black text-xl">
									{formatVND(subtotal)}
								</span>
							</div>
						</div>

						<button
							onClick={handleCheckout}
							disabled={checkingOut}
							className="btn btn-md w-full primary-gradient text-white border-0 rounded-full font-bold tracking-widest uppercase !h-[40px] !min-h-[40px] text-xs shadow-ambient-sm active:scale-[0.98] transition-transform disabled:opacity-70 disabled:scale-100">
							{checkingOut ? (
								<span className="loading loading-spinner loading-sm" />
							) : (
								"THANH TOÁN →"
							)}
						</button>
						<p className="text-center text-[10px] text-on-surface-variant mt-2 font-semibold uppercase tracking-widest">
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
							className="btn bg-surface-container text-on-surface border-outline-variant hover:bg-surface-container-high rounded-full normal-case font-bold min-w-32">
							Hủy
						</button>
						<button
							onClick={confirmRemove}
							className="btn bg-error text-white border-0 hover:bg-error/90 rounded-full normal-case font-bold min-w-32">
							Xóa
						</button>
					</div>
				</div>
			</dialog>
		</>
	);
}
