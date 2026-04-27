"use client";

import type { ConfiguratorGroup } from "@/app/api/products/[slug]/configurator/route";
import type { ShopVariant } from "@/app/api/products/route";
import Icon from "@/components/ui/Icon";
import { formatVND } from "@/lib/currency";
import clsx from "clsx";
import Image from "next/image";

// ─── Thumbnail ────────────────────────────────────────────────────────────────

export function Thumbnail({
	src,
	alt,
	className = "",
}: {
	src: string | null | undefined;
	alt: string;
	className?: string;
}) {
	return (
		<div
			className={`relative overflow-hidden bg-surface-container-high flex-shrink-0 ${className}`}>
			{src ? (
				<Image
					src={src}
					alt={alt}
					fill
					className="object-cover mix-blend-darken"
					unoptimized
				/>
			) : (
				<div className="absolute inset-0 flex items-center justify-center">
					<Icon
						name="inventory_2"
						className="text-2xl text-outline-variant"
					/>
				</div>
			)}
		</div>
	);
}

// ─── Props ────────────────────────────────────────────────────────────────────

export type ProductConfiguratorProps = {
	groups: ConfiguratorGroup[];
	variants: ShopVariant[];
	selections: Record<string, string>;
	loadingConfigurator: boolean;
	onSelect: (group: string, variantId: string) => void;
	isHideComppGroup?: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductConfigurator({
	groups,
	variants,
	selections,
	loadingConfigurator,
	onSelect,
}: ProductConfiguratorProps) {
	const hasComponents = groups.length > 0;

	if (loadingConfigurator) {
		return (
			<div className="space-y-4">
				{[1, 2].map((i) => (
					<div key={i} className="space-y-2 animate-pulse">
						<div className="h-3 w-32 bg-surface-container rounded-full" />
						<div className="flex gap-2">
							{[1, 2, 3].map((j) => (
								<div
									key={j}
									className="h-14 w-24 bg-surface-container rounded-xl"
								/>
							))}
						</div>
					</div>
				))}
			</div>
		);
	}

	return (
		<div className="space-y-5">
			{/* Component group selectors */}
			{groups.map((group) => (
				<div key={group.component_group} className={`space-y-2`}>
					<div className="flex items-center gap-2">
						<p
							className={`text-xs font-black uppercase tracking-widest text-on-surface-variant`}>
							{group.component_group}
						</p>
						{group.is_required && (
							<span className="text-[10px] font-black text-error bg-error/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
								Bắt buộc
							</span>
						)}
					</div>
					<div className="flex flex-wrap gap-2">
						{group.variants.map((v) => {
							const selected =
								selections[group.component_group] === v.id;
							const soldOut = v.stock_quantity === 0;
							return (
								<button
									key={v.id}
									type="button"
									disabled={soldOut}
									onClick={() =>
										onSelect(group.component_group, v.id)
									}
									className={clsx(
										"flex items-center gap-2 py-2 px-3 rounded-xl text-sm font-bold transition-all border",
										soldOut
											? "opacity-40 cursor-not-allowed bg-surface-container border-transparent"
											: selected
												? "bg-primary text-white border-primary shadow-lg"
												: "bg-surface-container text-on-surface border-transparent hover:border-outline-variant",
									)}>
									{v.thumbnail && (
										<Thumbnail
											src={v.thumbnail}
											alt={v.variant_name}
											className="w-12 h-12 rounded-lg"
										/>
									)}
									<div className="text-left">
										<p className="font-black text-sm leading-none">
											{v.variant_name}
										</p>
										{soldOut ? (
											<p className="text-[10px] font-black text-error uppercase tracking-wide mt-0.5">
												Hết hàng
											</p>
										) : v.price_adjustment !== 0 ? (
											<p
												className={clsx(
													"text-xs mt-0.5 text-red-400",
													// selected
													// 	? "opacity-80"
													// 	: "opacity-60",
												)}>
												+{formatVND(v.price_adjustment)}
											</p>
										) : null}
									</div>
								</button>
							);
						})}
					</div>
				</div>
			))}

			{/* Simple variant selector (non-composite products) */}
			{!hasComponents && variants.length > 0 && (
				<div className="space-y-2">
					<p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
						Chọn tùy chọn
					</p>
					<div className="grid grid-cols-2 gap-2">
						{variants.map((v) => {
							const isSelected =
								selections["__variant__"] === v.id;
							const soldOut = v.stock_quantity === 0;
							return (
								<button
									key={v.id}
									type="button"
									disabled={soldOut}
									onClick={() =>
										onSelect("__variant__", v.id)
									}
									className={clsx(
										"py-3 px-4 rounded-xl text-sm font-bold transition-all text-left",
										soldOut
											? "opacity-40 cursor-not-allowed bg-surface-container"
											: isSelected
												? "bg-primary text-white shadow-lg"
												: "bg-surface-container text-on-surface hover:bg-surface-container-high",
									)}>
									<p className="font-black truncate">
										{v.variant_name}
									</p>
									{soldOut ? (
										<p className="text-[10px] font-black text-error mt-0.5 uppercase tracking-wide">
											Hết hàng
										</p>
									) : (
										<p className="text-xs opacity-70 mt-0.5">
											{formatVND(v.effective_price)}
										</p>
									)}
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
