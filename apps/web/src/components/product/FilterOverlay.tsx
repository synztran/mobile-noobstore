"use client";

import { DualRangeSlider } from "@/components/ui/DualRangeSlider";
import Icon from "@/components/ui/Icon";
import clsx from "clsx";
import { useState } from "react";

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

interface FilterOverlayProps {
	isOpen: boolean;
	onClose: () => void;
	onApply?: (state: FilterState) => void;
	initialState?: Partial<FilterState>;
	categories?: { id: string; slug: string; name: string }[];
}

export function FilterOverlay({
	isOpen,
	onClose,
	onApply,
	initialState,
	categories = [],
}: FilterOverlayProps) {
	const init = { ...DEFAULT_FILTER_STATE, ...initialState };
	const [selectedCategory, setSelectedCategory] = useState<string | null>(
		init.category,
	);
	const [selectedPriceMin, setSelectedPriceMin] = useState<number>(
		init.priceMin,
	);
	const [selectedPriceMax, setSelectedPriceMax] = useState<number>(
		init.priceMax,
	);

	return (
		<>
			{/* Backdrop */}
			<div
				className={`fixed inset-0 bg-on-surface/30 backdrop-blur-sm z-[60] transition-opacity duration-300 ${
					isOpen
						? "opacity-100 pointer-events-auto"
						: "opacity-0 pointer-events-none"
				}`}
				onClick={onClose}
			/>

			{/* Panel — slides from top */}
			<div
				className={`fixed left-0 right-0 z-[70] bg-white rounded-b-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ease-out ${
					isOpen ? "top-0 bottom-[10vh]" : "top-[-110%] bottom-[110%]"
				}`}>
				{/* Header */}
				<div className="flex-none flex justify-between items-center px-6 py-5 border-b border-outline-variant/20">
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

				<div className="flex-1 overflow-y-auto hide-scrollbar px-6 py-4 space-y-6 pb-4">
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
						<DualRangeSlider
							min={selectedPriceMin}
							max={selectedPriceMax}
							onChange={(min, max) => {
								setSelectedPriceMin(min);
								setSelectedPriceMax(max);
							}}
						/>
					</section>
				</div>

				{/* Footer */}
				<div className="flex-none bg-white border-t border-outline-variant/20 flex items-center justify-between px-6 py-4">
					<button
						onClick={() => {
							setSelectedCategory(null);
							setSelectedPriceMin(0);
							setSelectedPriceMax(0);
						}}
						className="font-bold text-on-surface text-sm">
						Đặt lại
					</button>
					<button
						onClick={() => {
							onApply?.({
								category: selectedCategory,
								priceMin: selectedPriceMin,
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
