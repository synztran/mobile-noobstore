"use client";

import Icon from "@/components/ui/Icon";
import { formatVND } from "@/lib/currency";
import clsx from "clsx";
import { useEffect, useState } from "react";

export interface FilterState {
	category: string | null;
	priceMin: number;
	priceMax: number;
}

const DEFAULT_FILTER_STATE: FilterState = {
	category: null,
	priceMin: 0,
	priceMax: 0,
};

// Price steps in VND (0 = no limit)
const PRICE_OPTIONS = [
	{ label: "Tất cả", max: 0 },
	{ label: "Dưới 500K", max: 500_000 },
	{ label: "Dưới 1 triệu", max: 1_000_000 },
	{ label: "Dưới 2 triệu", max: 2_000_000 },
	{ label: "Dưới 5 triệu", max: 5_000_000 },
	{ label: "Trên 5 triệu", max: 99_999_999 },
];

interface FilterOverlayProps {
	onClose: () => void;
	onApply?: (state: FilterState) => void;
	initialState?: Partial<FilterState>;
	categories?: { id: string; slug: string; name: string }[];
}

export function FilterOverlay({
	onClose,
	onApply,
	initialState,
	categories = [],
}: FilterOverlayProps) {
	const init = { ...DEFAULT_FILTER_STATE, ...initialState };
	const [selectedCategory, setSelectedCategory] = useState<string | null>(
		init.category,
	);
	const [selectedPriceMax, setSelectedPriceMax] = useState<number>(
		init.priceMax,
	);

	useEffect(() => {
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = "";
		};
	}, []);

	return (
		<>
			<div
				className="fixed inset-0 bg-on-surface/30 backdrop-blur-sm z-[60]"
				onClick={onClose}
			/>
			<div className="fixed inset-x-4 top-16 bottom-4 z-[70] bg-white rounded-3xl overflow-y-auto shadow-2xl hide-scrollbar">
				{/* Header */}
				<div className="sticky top-0 bg-white flex justify-between items-center px-6 py-5 border-b border-outline-variant/20">
					<h2 className="text-xl font-black text-on-surface">
						Lọc sản phẩm
					</h2>
					<button
						onClick={onClose}
						className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors">
						<Icon
							name="close"
							className="text-on-surface text-xl"
						/>
					</button>
				</div>

				<div className="px-6 py-4 space-y-6 pb-28">
					{/* Category */}
					{categories.length > 0 && (
						<section>
							<h3 className="font-black text-on-surface text-base mb-3">
								Danh mục
							</h3>
							<div className="flex flex-wrap gap-2">
								<button
									onClick={() => setSelectedCategory(null)}
									className={clsx(
										"px-4 py-2 rounded-xl text-sm font-bold transition-all",
										selectedCategory === null
											? "bg-primary text-on-primary"
											: "bg-surface-container text-on-surface",
									)}>
									Tất cả
								</button>
								{categories.map((cat) => (
									<button
										key={cat.id}
										onClick={() =>
											setSelectedCategory(
												cat.slug === selectedCategory
													? null
													: cat.slug,
											)
										}
										className={clsx(
											"px-4 py-2 rounded-xl text-sm font-bold transition-all",
											selectedCategory === cat.slug
												? "bg-primary text-on-primary"
												: "bg-surface-container text-on-surface",
										)}>
										{cat.name}
									</button>
								))}
							</div>
						</section>
					)}

					{/* Price range */}
					<section>
						<h3 className="font-black text-on-surface text-base mb-3">
							Khoảng giá
						</h3>
						<div className="grid grid-cols-2 gap-2">
							{PRICE_OPTIONS.map((opt) => (
								<button
									key={opt.max}
									onClick={() =>
										setSelectedPriceMax(opt.max)
									}
									className={clsx(
										"px-4 py-3 rounded-xl text-sm font-bold transition-all text-left",
										selectedPriceMax === opt.max
											? "bg-primary text-on-primary"
											: "bg-surface-container text-on-surface",
									)}>
									{opt.label}
									{opt.max > 0 && opt.max < 99_999_999 && (
										<span className="block text-xs font-normal opacity-70">
											≤ {formatVND(opt.max)}
										</span>
									)}
								</button>
							))}
						</div>
					</section>
				</div>

				{/* Footer */}
				<div className="absolute w-full bottom-0 bg-white border-t border-outline-variant/20 flex items-center justify-between px-6 py-4">
					<button
						onClick={() => {
							setSelectedCategory(null);
							setSelectedPriceMax(0);
						}}
						className="font-bold text-on-surface text-sm">
						Đặt lại
					</button>
					<button
						onClick={() => {
							onApply?.({
								category: selectedCategory,
								priceMin: 0,
								priceMax: selectedPriceMax,
							});
							onClose();
						}}
						className="btn primary-gradient text-white border-0 rounded-2xl normal-case font-bold px-8 py-3 h-auto">
						Áp dụng
					</button>
				</div>
			</div>
		</>
	);
}
