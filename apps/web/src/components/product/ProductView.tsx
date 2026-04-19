"use client";

import type { ProductDetail } from "@/app/api/products/[slug]/route";
import { TopNav } from "@/components/layout/TopNav";
import Icon from "@/components/ui/Icon";
import { formatVND } from "@/lib/currency";
import type { Product } from "@/lib/data";
import { toast } from "@/lib/toast";
import { useCartStore } from "@/store";
import clsx from "clsx";
import { useState } from "react";

export function ProductView({ product }: { product: ProductDetail }) {
	const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
		product.variants.length === 1 ? product.variants[0].id : null,
	);
	const [saved, setSaved] = useState(false);

	const { addItem, openCart } = useCartStore();

	const selectedVariant =
		product.variants.find((v) => v.id === selectedVariantId) ?? null;
	const displayPrice = selectedVariant?.effective_price ?? product.min_price;

	const handleAddToCart = () => {
		if (product.variants.length > 0 && !selectedVariant) {
			toast.error("Please select a variant");
			return;
		}

		const cartProduct: Product = {
			id: product.id,
			name: product.name,
			category: product.category,
			base_price: product.base_price,
			stock_quantity: product.stock_quantity,
		};

		addItem(cartProduct, selectedVariant);
		toast.success("Added to cart!");
		openCart();
	};

	return (
		<>
			<TopNav showBack backHref="/shop" showCart showFavorite />

			<main className="my-auto pb-32">
				{/* Product Hero Placeholder */}
				<section className="relative mx-6 mb-10 overflow-hidden rounded-3xl bg-gradient-to-b from-surface-container-low to-surface-container shadow-sm aspect-square flex items-center justify-center">
					<Icon
						name="inventory_2"
						className="text-9xl text-outline-variant opacity-40"
					/>
					<div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent" />
				</section>

				{/* Product Info */}
				<div className="px-6 space-y-6">
					{/* Identity */}
					<div>
						<p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-1">
							{product.category}
						</p>
						<h1 className="text-2xl font-black uppercase tracking-tight leading-tight text-on-surface">
							{product.name}
						</h1>
						<p className="text-2xl font-black text-primary mt-3">
							{formatVND(displayPrice)}
						</p>
					</div>

					{/* Variant selection */}
					{product.variants.length > 0 && (
						<section className="space-y-3">
							<p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
								Options
							</p>
							<div className="grid grid-cols-2 gap-3">
								{product.variants.map((v) => (
									<button
										key={v.id}
										onClick={() =>
											setSelectedVariantId(v.id)
										}
										className={clsx(
											"py-4 px-4 rounded-2xl text-sm font-bold transition-all text-left",
											selectedVariantId === v.id
												? "bg-primary text-white shadow-lg"
												: "bg-surface-container text-on-surface hover:bg-surface-container-high",
										)}>
										<p className="font-black truncate">
											{v.variant_name}
										</p>
										{v.price_adjustment !== 0 && (
											<p className="text-xs opacity-70 mt-0.5">
												{v.price_adjustment > 0
													? `+${formatVND(v.price_adjustment)}`
													: `-${formatVND(Math.abs(v.price_adjustment))}`}
											</p>
										)}
									</button>
								))}
							</div>
						</section>
					)}

					{/* Components / bundle parts */}
					{product.components.length > 0 && (
						<section className="space-y-3">
							<p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
								Bundle Components
							</p>
							<div className="space-y-2">
								{product.components.map((c) => (
									<div
										key={c.id}
										className="bg-surface-container rounded-2xl px-4 py-3 flex items-center justify-between">
										<div>
											<p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
												{c.component_group}{" "}
												{c.is_required ? "(Required)" : "(Optional)"}
											</p>
											<p className="font-bold text-on-surface text-sm mt-0.5">
												{c.component_product.name}
											</p>
										</div>
										<span className="font-black text-primary text-sm">
											{formatVND(c.component_product.base_price)}
										</span>
									</div>
								))}
							</div>
						</section>
					)}

					{/* Stock */}
					{product.stock_quantity <= 5 && product.stock_quantity > 0 && (
						<div className="bg-error/10 rounded-2xl px-4 py-3 flex items-center gap-2">
							<Icon name="warning" className="text-error text-sm" />
							<p className="text-error text-xs font-bold">
								Only {product.stock_quantity} left in stock
							</p>
						</div>
					)}
					{product.stock_quantity === 0 && (
						<div className="bg-surface-container rounded-2xl px-4 py-3 flex items-center gap-2">
							<Icon name="block" className="text-outline text-sm" />
							<p className="text-outline text-xs font-bold">
								Out of stock
							</p>
						</div>
					)}
				</div>
			</main>

			{/* Bottom Action Bar */}
			<div className="fixed bottom-0 left-0 right-0 z-[100] px-6 py-4 bg-white/90 backdrop-blur-md rounded-tl-2xl rounded-tr-2xl border-t border-outline-variant/20 flex gap-4">
				<button
					onClick={() => setSaved(!saved)}
					className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform">
					<Icon
						name="bookmark"
						className={clsx(
							"text-2xl",
							saved && "text-primary",
						)}
					/>
				</button>
				<button
					onClick={handleAddToCart}
					disabled={product.stock_quantity === 0}
					className="flex-1 h-14 bg-gradient-to-r from-primary to-primary-container text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed">
					<Icon name="shopping_bag" className="text-xl" />
					ADD TO CART
				</button>
			</div>
		</>
	);
}
