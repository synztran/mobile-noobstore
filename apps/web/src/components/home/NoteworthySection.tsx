"use client";

import type { ShopProduct } from "@/app/api/products/route";
import { formatVND } from "@/lib/currency";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const CATEGORIES = [
	{ label: "MỚI NHẤT", slug: "" },
	{ label: "BÀN PHÍM", slug: "keyboards" },
	{ label: "SWITCH", slug: "switches" },
	{ label: "PHỤ KIỆN", slug: "accessories" },
  { label: "GIÀY", slug: "sneakers" }
];

function ProductCard({ product }: { product: ShopProduct }) {
	const isNew = product.tags?.some((t) => t.value === "new");
	const isSoldOut = product.stock_quantity === 0;

	return (
		<Link
			href={`/shop/${product.slug}`}
			className="flex-shrink-0 w-[180px] group active:scale-95 transition-transform">
			<div className="aspect-square bg-surface-container-high rounded-2xl overflow-hidden relative mb-3">
				{product.thumbnail ? (
					<Image
						src={product.thumbnail}
						alt={product.name}
						fill
						className="object-cover group-hover:scale-105 transition-transform duration-300"
						unoptimized
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center">
						<span className="text-[5rem] font-black text-on-surface/5 uppercase leading-none">
							{product.name.charAt(0)}
						</span>
					</div>
				)}
				{isNew && !isSoldOut && (
					<div className="absolute top-3 left-3 bg-primary text-on-primary text-[8px] font-black px-2 py-1 uppercase tracking-widest rounded-md">
						MỚI
					</div>
				)}
				{isSoldOut && (
					<div className="absolute inset-0 bg-surface/70 flex items-center justify-center rounded-2xl">
						<p className="text-[10px] font-black uppercase tracking-[0.15em] text-on-surface-variant">
							Hết hàng
						</p>
					</div>
				)}
			</div>
			<p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mt-1">
				{product.category}
			</p>
			<h4 className="font-bold text-sm uppercase tracking-tight leading-tight line-clamp-2 min-h-[35px]">
				{product.name}
			</h4>
			<p className="font-extrabold text-primary text-sm mt-1">
				{formatVND(product.min_price)}
			</p>
		</Link>
	);
}

function ProductSkeleton() {
	return (
		<div className="flex-shrink-0 w-[180px] space-y-3 animate-pulse">
			<div className="aspect-square bg-surface-container rounded-2xl" />
			<div className="h-4 bg-surface-container rounded w-3/4" />
			<div className="h-3 bg-surface-container rounded w-1/2" />
			<div className="h-4 bg-surface-container rounded w-1/3" />
		</div>
	);
}

async function fetchNoteworthyProducts(categorySlug: string) {
	const query = new URLSearchParams({
		limit: "8",
		...(categorySlug ? { category: categorySlug } : {}),
	});

	const response = await fetch(
		`/api/products/noteworthy?${query.toString()}`,
	);
	if (!response.ok) throw new Error("Failed to fetch noteworthy products");

	const data = (await response.json()) as { products?: ShopProduct[] };
	return data.products ?? [];
}

export function NoteworthySection() {
	const [activeCategory, setActiveCategory] = useState("");

	const { data: products = [], isLoading } = useQuery({
		queryKey: ["home-noteworthy-products", activeCategory],
		queryFn: () => fetchNoteworthyProducts(activeCategory),
	});

	const shopHref = activeCategory
		? `/shop?category=${activeCategory}`
		: "/shop";
	const activeCategoryLabel =
		CATEGORIES.find((cat) => cat.slug === activeCategory)?.label ??
		"BỘ LỌC HIỆN TẠI";

	return (
		<section className="py-12 bg-surface">
			{/* Header */}
			<div className="px-6 flex items-baseline justify-between mb-6">
				<h2 className="text-2xl font-black tracking-tight uppercase">
					Sản Phẩm Nổi Bật
				</h2>
				<Link
					href={shopHref}
					className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
					Xem tất cả
					<ArrowRight size={10} />
				</Link>
			</div>

			{/* Category Pills */}
			<div className="flex gap-2 overflow-x-auto hide-scrollbar px-6 mb-8 pb-1">
				{CATEGORIES.map((cat) => (
					<button
						key={cat.slug}
						onClick={() => setActiveCategory(cat.slug)}
						className={`flex-shrink-0 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-full border transition-all ${
							activeCategory === cat.slug
								? "bg-on-surface text-surface border-on-surface"
								: "bg-transparent text-on-surface-variant border-outline-variant"
						}`}>
						{cat.label}
					</button>
				))}
			</div>

			{/* Product Carousel */}
			<div className="flex gap-4 overflow-x-auto hide-scrollbar px-6 pb-2">
				{isLoading
					? Array.from({ length: 3 }, (_, i) => (
							<ProductSkeleton key={i} />
						))
					: products.map((product) => (
							<ProductCard key={product.id} product={product} />
						))}
				{!isLoading && products.length === 0 && (
					<div className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-5 py-6 text-center">
						<p className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant">
							Không có sản phẩm phù hợp
						</p>
						<p className="mt-2 text-sm font-semibold text-on-surface">
							Hiện chưa có sản phẩm cho {activeCategoryLabel}.
						</p>
						<Link
							href="/shop"
							className="mt-4 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary hover:gap-2 transition-all">
							Xem toàn bộ cửa hàng
							<ArrowRight size={10} />
						</Link>
					</div>
				)}
				{!isLoading && products.length > 0 && (
					<Link
						href={shopHref}
						className="flex-shrink-0 w-[120px] flex flex-col items-center justify-center gap-3 bg-surface-container-low rounded-2xl group hover:bg-surface-container transition-colors">
						<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
							<ArrowRight size={18} className="text-primary" />
						</div>
						<p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant text-center px-2">
							Xem tất cả
						</p>
					</Link>
				)}
			</div>
		</section>
	);
}
