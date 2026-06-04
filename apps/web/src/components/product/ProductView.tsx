"use client";

import type { ComponentVariantRule, ConfiguratorGroup } from "@/app/api/products/[slug]/configurator/route";
import type { ProductDetail } from "@/app/api/products/[slug]/route";
import { TopNav } from "@/components/layout/TopNav";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import { ProductConfigurator } from "@/components/product/ProductConfigurator";
import Icon from "@/components/ui/Icon";
import WishlistButton from "@/components/wishlist/WishlistButton";
import { useProductViewData } from "@/hooks/useProductViewData";
import { formatVND } from "@/lib/currency";
import clsx from "clsx";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function ProductView({
	product,
	componentGroups = [],
	componentRules = [],
}: {
	product: ProductDetail;
	componentGroups?: ConfiguratorGroup[];
	componentRules?: ComponentVariantRule[];
}) {
	const [activeImageIndex, setActiveImageIndex] = useState(0);
	const touchStartX = useRef<number | null>(null);

	const mediaImages = useMemo(() => {
		const all = [product.thumbnail, ...(product.images ?? [])].filter(
			(img): img is string => Boolean(img),
		);
		return Array.from(new Set(all));
	}, [product.thumbnail, product.images]);

	const goTo = useCallback(
		(idx: number) => {
			setActiveImageIndex(
				(idx + mediaImages.length) % mediaImages.length,
			);
		},
		[mediaImages.length],
	);

	const handleTouchStart = useCallback((e: React.TouchEvent) => {
		touchStartX.current = e.touches[0].clientX;
	}, []);

	const handleTouchEnd = useCallback(
		(e: React.TouchEvent) => {
			if (touchStartX.current === null) return;
			const delta = e.changedTouches[0].clientX - touchStartX.current;
			if (Math.abs(delta) > 40)
				goTo(activeImageIndex + (delta < 0 ? 1 : -1));
			touchStartX.current = null;
		},
		[activeImageIndex, goTo],
	);

	const {
		variants,
		groups,
		selections,
		select,
		selectedVariant,
		selectedPreOrderConfig,
		loadingVariants,
		loadingConfigurator,
		missingVariantSelection,
		missingConfiguration,
		isOutOfStock,
		isLowStock,
		effectiveStockQuantity,
		isLoadingAddToCart,
		handleAddToCart,
		disabledVariantIds,
	} = useProductViewData(product, componentGroups, componentRules);

	const minVariantPrice = useMemo(
		() =>
			variants.length > 0
				? Math.min(...variants.map((v) => v.effective_price))
				: product.min_price,
		[variants, product.min_price],
	);

	const componentAdjustment = useMemo(
		() =>
			groups.reduce((sum, group) => {
				const v = group.variants.find(
					(v) => v.id === selections[group.component_group],
				);
				return sum + (v?.price_adjustment ?? 0);
			}, 0),
		[groups, selections],
	);

	const displayPrice =
		groups.length > 0
			? product.min_price + componentAdjustment
			: (selectedVariant?.effective_price ?? minVariantPrice);

	const heroImage =
		mediaImages[activeImageIndex] ?? product.thumbnail ?? null;

	const productLabel =
		product.product_type === "kit" ? "Curated Build" : "Custom Edition";
	const statusLabel = isOutOfStock
		? "Hết hàng"
		: isLowStock
			? `Chỉ còn ${effectiveStockQuantity} sản phẩm`
			: variants.length > 0
				? `${variants.length} tùy chọn`
				: "Sẵn sàng để giao";

	const specItems = [
		{
			label: "Loại sản phẩm",
			value:
				product.product_type === "kit"
					? "Bộ sưu tập chọn lọc"
					: product.product_type === "component"
						? "Phần tử module"
						: "Sản phẩm độc lập",
		},
		{
			label: "Tình trạng kho",
			value: isOutOfStock
				? "Hết hàng"
				: `${effectiveStockQuantity} sản phẩm có sẵn`,
		},
		{
			label: "Số lượng biến thể",
			value:
				variants.length > 0
					? `${variants.length} tùy chọn`
					: "Phiên bản cấu hình đơn",
		},
		{
			label: "Số lượng thành phần",
			value:
				product.components.length > 0
					? `${product.components.length} thành phần curated`
					: "Không có thành phần đi kèm",
		},
	];

	useEffect(() => {
		setActiveImageIndex(0);
	}, [product.slug]);

	return (
		<>
			<TopNav showBack backHref="/shop" showCart showFavorite />

			<main className="my-auto pb-4 space-y-4">
				{/* ── Hero Image Gallery ── */}
				<section
					className="relative"
					onTouchStart={handleTouchStart}
					onTouchEnd={handleTouchEnd}>
					<div className="p-6 pb-4">
						<div className="relative w-full h-64 overflow-hidden rounded-xl bg-surface-container-low shadow-[0_20px_48px_-20px_rgba(26,28,31,0.12)]">
							{heroImage ? (
								<Image
									src={heroImage}
									alt={product.name}
									fill
									className="object-cover mix-blend-multiply"
									sizes="(max-width: 768px) 100vw, 50vw"
									priority
								/>
							) : (
								<div className="absolute inset-0 flex items-center justify-center">
									<Icon
										name="inventory_2"
										className="text-9xl text-outline-variant opacity-40"
									/>
								</div>
							)}
							<div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent" />
						</div>
					</div>
					{mediaImages.length > 1 && (
						<div className="flex justify-center gap-2 px-6">
							{mediaImages.map((img, i) => (
								<button
									key={`${img}-${i}`}
									type="button"
									onClick={() => setActiveImageIndex(i)}
									aria-label={`View image ${i + 1}`}
									className={clsx(
										"rounded-full transition-all",
										i === activeImageIndex
											? "h-1 w-8 bg-primary"
											: "h-1 w-2 bg-outline-variant",
									)}
								/>
							))}
						</div>
					)}
				</section>

				{/* ── Product Info ── */}
				<section className="px-6 mt-6">
					<div className="flex flex-wrap gap-2 mb-3">
						{/* <span className="text-[10px] font-black tracking-widest text-on-surface-variant bg-surface-container-high px-2 py-1 uppercase">
							{productLabel}
						</span> */}
						<span
							className={clsx(
								"text-[10px] font-black tracking-widest px-2 py-1 uppercase",
								isOutOfStock
									? "bg-surface-container-high text-on-surface-variant"
									: "bg-primary text-white",
							)}>
							{statusLabel}
						</span>
					</div>
					<p className="text-sm text-primary tracking-[0.18em] uppercase mb-1 font-black">
						{product.category}
					</p>
					<h1 className="text-2xl font-black leading-none text-on-surface uppercase">
						{product.name}
					</h1>
					<div className="mt-4 flex items-baseline gap-3">
						<span className="text-3xl font-black text-on-surface leading-none">
							{formatVND(displayPrice)}
						</span>
						{selectedVariant &&
							selectedVariant.price_adjustment !== 0 && (
								<span className="text-sm text-on-surface-variant line-through opacity-60">
									{formatVND(product.min_price)}
								</span>
							)}
					</div>
				</section>

				{/* ── Configurator (variants + component groups) ── */}
				{(loadingVariants ||
					loadingConfigurator ||
					variants.length > 0 ||
					groups.length > 0) && (
					<section className="px-6 mt-10">
						<div className="bg-surface-container-low rounded-2xl p-3 space-y-4">
							{loadingVariants ? (
								<div className="grid grid-cols-2 gap-3">
									{[1, 2].map((i) => (
										<div
											key={i}
											className="h-[88px] rounded-lg bg-surface-container-low animate-pulse"
										/>
									))}
								</div>
							) : (
								<ProductConfigurator
									groups={groups}
									variants={variants}
									selections={selections}
									loadingConfigurator={loadingConfigurator}
									basePrice={product.base_price}
									onSelect={select}
									isHideComppGroup
									disabledVariantIds={disabledVariantIds}
								/>
							)}
						</div>
					</section>
				)}

				{/* ── Pre-order Info Banner ── */}
				{selectedPreOrderConfig && (
					<section className="px-6">
						<div className="flex items-start gap-3 bg-violet-500/10 border border-violet-500/30 rounded-2xl p-4">
							<Icon
								name="schedule"
								className="text-violet-400 text-2xl mt-0.5 shrink-0"
							/>
							<div className="space-y-1">
								<p className="text-xs font-black uppercase tracking-widest text-violet-400">
									Sản phẩm đặt trước
								</p>
								<p className="text-sm font-bold text-on-surface">
									Thời gian giao hàng dự kiến:{" "}
									{selectedPreOrderConfig.estimate}
								</p>
								{selectedPreOrderConfig.available_date && (
									<p className="text-xs text-on-surface-variant">
										Dự kiến có hàng:{" "}
										{selectedPreOrderConfig.available_date}
									</p>
								)}
								{selectedPreOrderConfig.notes && (
									<p className="text-xs text-on-surface-variant">
										{selectedPreOrderConfig.notes}
									</p>
								)}
							</div>
						</div>
					</section>
				)}

				{/* ── Specs ── */}
				<section className="px-6">
					<div className="bg-surface-container-low p-8 rounded-none">
						<h3 className="text-xs tracking-[0.2em] text-on-surface font-black uppercase mb-6">
							Thông số kỹ thuật
						</h3>
						<div className="grid grid-cols-2 gap-y-6 gap-x-4">
							{specItems.map((item) => (
								<div key={item.label}>
									<p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1 font-black">
										{item.label}
									</p>
									<p className="text-sm font-semibold text-on-surface leading-snug">
										{item.value}
									</p>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* ── Editorial ── */}
				<section className="px-6 mt-12 mb-12">
					<h3 className="text-[1.75rem] font-black tracking-tight leading-tight text-on-surface mb-4 max-w-[14ch]">
						Precision engineered for modern setups.
					</h3>
					<p className="text-on-surface-variant leading-relaxed mb-6 font-light text-base">
						{product.name} brings a more curated, hardware-first
						experience to {product.category.toLowerCase()}. The
						tonal layout keeps the focus on material, silhouette,
						and switch feel while the configuration stays
						deliberately simple and tactile.
					</p>
					<div className="relative w-full aspect-video rounded-xl overflow-hidden mb-6 bg-surface-container-low">
						{heroImage ? (
							<Image
								src={heroImage}
								alt={product.name}
								fill
								className="object-cover"
								sizes="(max-width: 768px) 100vw, 50vw"
							/>
						) : (
							<div className="absolute inset-0 flex items-center justify-center">
								<Icon
									name="play_circle"
									className="text-6xl text-outline-variant"
								/>
							</div>
						)}
						<div className="absolute inset-0 bg-black/20 flex items-center justify-center">
							<Icon
								name="play_circle"
								className="text-white text-6xl opacity-80"
							/>
						</div>
					</div>
					<p className="text-on-surface-variant leading-relaxed font-light text-base">
						{product.components.length > 0
							? `Each bundle component has been grouped to keep configuration intentional. Required parts define the core build, while optional parts let the setup stay personal without compromising the product's main character.`
							: `This edition keeps the product presentation minimal and focused. Variant choices remain clear, stock states are visible up front, and the interaction model stays close to the tactile feel established in the quick-pick experience.`}
					</p>
				</section>
			</main>

			{/* ── Bottom Action Bar ── */}
			<div className="fixed bottom-0 left-0 right-0 z-[100] px-6 py-4 bg-surface/95 backdrop-blur-md rounded-tl-3xl rounded-tr-3xl border-t border-outline-variant/20 flex gap-4">
				<WishlistButton
					productId={product.id}
					showLabel
					className="w-14 h-14 rounded-2xl flex-shrink-0"
				/>
				<AddToCartButton
					isOutOfStock={isOutOfStock}
					missingVariantSelection={missingVariantSelection}
					missingConfiguration={missingConfiguration}
					isLoading={isLoadingAddToCart}
					isPreOrder={selectedPreOrderConfig !== null}
					onClick={handleAddToCart}
				/>
			</div>
		</>
	);
}
