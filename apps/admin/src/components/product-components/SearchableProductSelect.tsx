"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ProductOption } from "./types";

type Props = {
	label: string;
	placeholder: string;
	products: ProductOption[];
	value: string;
	onChange: (value: string) => void;
	required?: boolean;
	disabledIds?: string[];
};

export default function SearchableProductSelect({
	label,
	placeholder,
	products,
	value,
	onChange,
	required = false,
	disabledIds = [],
}: Props) {
	const wrapperRef = useRef<HTMLDivElement>(null);
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");

	const selectedProduct =
		products.find((product) => product.id === value) ?? null;
	const selectedLabel = selectedProduct
		? `${selectedProduct.name} • ${selectedProduct.id}`
		: "";

	const selectedMeta = selectedProduct
		? [selectedProduct.product_type || null, selectedProduct.brand || null]
				.filter(Boolean)
				.join(" • ")
		: "";

	useEffect(() => {
		function handleOutsideClick(event: MouseEvent) {
			if (!wrapperRef.current?.contains(event.target as Node)) {
				setOpen(false);
				setSearch("");
			}
		}

		document.addEventListener("mousedown", handleOutsideClick);
		return () =>
			document.removeEventListener("mousedown", handleOutsideClick);
	}, []);

	const filteredProducts = useMemo(() => {
		const query = search.trim().toLowerCase();
		const visibleProducts = products.filter(
			(product) =>
				!disabledIds.includes(product.id) || product.id === value,
		);
		if (!query) return visibleProducts;
		return visibleProducts.filter((product) =>
			`${product.name} ${product.id}`.toLowerCase().includes(query),
		);
	}, [products, search, disabledIds, value]);

	return (
		<div ref={wrapperRef} className="relative">
			<label className="block text-sm font-medium text-slate-700 mb-1">
				{label} {required && <span className="text-red-500">*</span>}
			</label>
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
				<input
					type="text"
					value={open ? search : selectedLabel}
					onFocus={() => {
						setOpen(true);
						setSearch("");
					}}
					onChange={(event) => {
						setSearch(event.target.value);
						setOpen(true);
					}}
					placeholder={placeholder}
					readOnly={!open}
					className="w-full border border-slate-300 rounded-lg pl-9 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
				<div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
					{selectedProduct && (
						<button
							type="button"
							onClick={() => {
								onChange("");
								setSearch("");
								setOpen(true);
							}}
							className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
							aria-label="Clear selection">
							<X className="w-3.5 h-3.5" />
						</button>
					)}
					<ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none" />
				</div>
			</div>

			{open && (
				<div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-64 overflow-y-auto">
					<div className="px-3 py-2 border-b border-slate-100 text-xs text-slate-500 flex items-center gap-2">
						<Search className="w-3.5 h-3.5" />
						Search by name
					</div>
					{filteredProducts.length > 0 ? (
						filteredProducts.map((product) => (
							<button
								key={product.id}
								type="button"
								onMouseDown={(event) => event.preventDefault()}
								onClick={() => {
									onChange(product.id);
									setSearch("");
									setOpen(false);
								}}
								className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center gap-3 border-b border-slate-50 last:border-b-0">
								{product.thumbnail ? (
									<img
										src={product.thumbnail}
										alt={product.name}
										className="w-8 h-8 rounded object-cover shrink-0"
									/>
								) : (
									<div className="w-8 h-8 rounded bg-slate-100 shrink-0" />
								)}
								<div className="min-w-0">
									<div className="text-sm font-medium text-slate-900 truncate">
										{product.name}
									</div>
									<div className="text-xs text-slate-500 font-mono truncate">
										{product.id}
									</div>
								</div>
							</button>
						))
					) : (
						<div className="px-3 py-4 text-sm text-slate-500">
							No matching products found.
						</div>
					)}
				</div>
			)}

			{!open && selectedProduct && (
				<div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 flex items-center gap-3">
					{selectedProduct.thumbnail ? (
						<img
							src={selectedProduct.thumbnail}
							alt={selectedProduct.name}
							className="w-10 h-10 rounded object-cover shrink-0"
						/>
					) : (
						<div className="w-10 h-10 rounded bg-slate-200 shrink-0" />
					)}
					<div className="min-w-0 flex-1">
						<div className="text-sm font-semibold text-slate-900 truncate">
							{selectedProduct.name}
						</div>
						<div className="text-xs text-slate-500 font-mono truncate">
							{selectedProduct.id}
						</div>
						{selectedMeta && (
							<div className="text-xs text-slate-600 truncate mt-0.5">
								{selectedMeta}
							</div>
						)}
					</div>
					<div className="text-right text-xs text-slate-600 shrink-0">
						{selectedProduct.base_price !== undefined &&
							selectedProduct.base_price !== null && (
								<div>Price: {selectedProduct.base_price}</div>
							)}
						{selectedProduct.stock_quantity !== undefined &&
							selectedProduct.stock_quantity !== null && (
								<div>
									Stock: {selectedProduct.stock_quantity}
								</div>
							)}
					</div>
				</div>
			)}
		</div>
	);
}
