"use client";

import { formatVND } from "@/lib/currency";
import type { CartItem } from "@/lib/data";
import Image from "next/image";

interface OrderItemsListProps {
	items: CartItem[];
	oosProductIds?: Set<string>;
	onRemove?: (productId: string, variantId: string | null) => void;
}

export function OrderItemsList({ items, oosProductIds, onRemove }: OrderItemsListProps) {
	if (items.length === 0) {
		return null;
	}

	return (
		<section className="mb-6">
			<h2 className="text-xs font-bold uppercase tracking-[0.2em] text-outline mb-4">
				Đơn hàng của bạn
			</h2>
			<div className="space-y-3">
				{items.map((item) => {
					const isOos = oosProductIds?.has(item.product.id) ?? false;
          const itemKey = item.components?.length
								? `${item.product.id}-kit-${item.components.map((c) => c.variant_id).join("+")}`
								: `${item.product.id}-${item.variant?.id ?? "base"}`;
					return (
					<div
						key={itemKey}
						className={`relative p-4 rounded-3xl overflow-hidden transition-colors ${
							isOos
								? "bg-error/10 ring-1 ring-error/40"
								: "bg-surface-container-lowest"
						}`}>
						{/* OOS banner */}
						{isOos && (
							<div className="flex items-center justify-between mb-3">
								<span className="text-[10px] font-black uppercase tracking-widest text-error">
									Hết hàng
								</span>
								{onRemove && (
									<button
										onClick={() =>
											onRemove(
												item.product.id,
												item.variant?.id ?? null,
											)
										}
										className="text-[10px] font-black uppercase tracking-widest text-error underline underline-offset-2 active:opacity-70">
										Xoá
									</button>
								)}
							</div>
						)}
						{/* Product info */}
						<div className={`flex gap-4 items-start ${isOos ? "opacity-50" : ""}`}>
							{/* Product thumbnail */}
							<div className="relative w-16 h-16 flex-shrink-0 bg-surface-container rounded-lg overflow-hidden">
								{item.product.thumbnail ? (
									<Image
										src={item.product.thumbnail}
										alt={item.product.name}
										fill
										objectFit="cover"
										unoptimized
										className="rounded-lg"
									/>
								) : (
									<div className="w-full h-full flex items-center justify-center text-on-surface-variant">
										<span className="text-xs">
											No Image
										</span>
									</div>
								)}
							</div>

							{/* Product details */}
							<div className="flex-1 min-w-0">
								<h3 className="font-bold text-on-surface text-sm truncate">
									{item.product.name}
								</h3>
								{item.variant && (
									<p className="text-xs text-outline font-semibold mt-0.5">
										{item.variant.variant_name}
									</p>
								)}
								<p className="text-primary font-black mt-1 text-sm">
									{formatVND(
										item.variant?.effective_price ??
											item.product.base_price,
									)}
								</p>
                <div className="inline-flex items-center gap-2">
                  {item.components?.some((c) => c.is_pre_order) && (
                    <span className="text-[10px] font-black uppercase text-white bg-violet-500 rounded-sm px-1 py-0.5">
                      Pre-order
                    </span>
                  )}
                </div>
							</div>
							<span className="text-xs font-bold text-on-surface-variant bg-surface-container rounded-full px-2.5 py-1 flex-shrink-0">
								x{item.quantity}
							</span>
						</div>

						{/* Components breakdown */}
						{item.components &&
							item.components.length > 0 &&
							(() => {
								const itemTotal =
									((item.variant?.effective_price ??
										item.product.base_price) +
										item.components.reduce(
											(sum, comp) =>
												sum + comp.price_adjustment,
											0,
										)) *
									item.quantity;
								return (
									<div className="mt-3 pt-3 border-t border-outline-variant/20 space-y-2">
										{item.components.map((component) => (
											<div
												key={component.variant_id}
												className="flex justify-between items-center text-xs">
												<div className="min-w-0 flex items-center gap-2">
													<p className="min-w-11 text-center text-on-surface-variant text-xs bg-gray-100 rounded-sm px-1.5 py-1">
														{
															component.component_group
														}
													</p>
													<p className="font-semibold text-on-surface truncate">
														{component.variant_name}
													</p>
												</div>
												{component.price_adjustment >
												0 ? (
													<span className="text-primary font-bold flex-shrink-0 ml-2">
														+
														{formatVND(
															component.price_adjustment,
														)}
													</span>
												) : null}
											</div>
										))}
										{/* Total price for item */}
										<div className="flex justify-between items-center pt-2 border-t border-outline-variant/20">
											<p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
												Thành tiền
											</p>
											<span className="text-sm font-black text-primary">
												{formatVND(itemTotal)}
											</span>
										</div>
									</div>
								);
							})()}
					</div>
				); })}
			</div>
		</section>
	);
}
