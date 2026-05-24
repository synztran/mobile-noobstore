"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

interface Product {
	id: string;
	name: string;
	product_type: string;
	base_price: number;
	stock_quantity: number | null;
	thumbnail: string | null;
	brand: string | null;
}

interface Props {
	open: boolean;
	onClose: () => void;
	products: Product[];
}

export default function CreateVariantModal({ open, onClose, products }: Props) {
	const router = useRouter();
	const formRef = useRef<HTMLFormElement>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isPreOrder, setIsPreOrder] = useState(false);
	const [attrs, setAttrs] = useState<{ key: string; value: string }[]>([]);
	const [productSearch, setProductSearch] = useState("");
	const [selectedProductId, setSelectedProductId] = useState<string | null>(
		null,
	);
	const [dropdownOpen, setDropdownOpen] = useState(false);

	const selectedProduct =
		products.find((p) => p.id === selectedProductId) ?? null;
	const filteredProducts = productSearch.trim()
		? products.filter((p) =>
				p.name.toLowerCase().includes(productSearch.toLowerCase()),
			)
		: products;

	if (!open) return null;

	function addAttr() {
		setAttrs((prev) => [...prev, { key: "", value: "" }]);
	}

	function removeAttr(i: number) {
		setAttrs((prev) => prev.filter((_, idx) => idx !== i));
	}

	function updateAttr(i: number, field: "key" | "value", val: string) {
		setAttrs((prev) =>
			prev.map((a, idx) => (idx === i ? { ...a, [field]: val } : a)),
		);
	}

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setLoading(true);

		const fd = new FormData(e.currentTarget);
		const product_id = selectedProductId;
		if (!product_id) {
			setError("Please select a product.");
			setLoading(false);
			return;
		}
		const variant_name = fd.get("variant_name") as string;
		const price_adjustment = fd.get("price_adjustment")
			? Number(fd.get("price_adjustment"))
			: null;
		const stock_quantity = fd.get("stock_quantity")
			? Number(fd.get("stock_quantity"))
			: null;
		const product_name =
			products.find((p) => p.id === product_id)?.name ?? null;

		// Build attributes object from pairs (skip empty keys)
		const attributes =
			attrs.length > 0
				? Object.fromEntries(
						attrs
							.filter((a) => a.key.trim())
							.map((a) => [a.key.trim(), a.value.trim()]),
					)
				: null;

		const res = await fetch("/api/variants", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				product_id,
				variant_name,
				price_adjustment,
				stock_quantity,
				is_pre_order: isPreOrder,
				product_name,
				attributes,
			}),
		});

		setLoading(false);

		if (!res.ok) {
			const data = await res.json();
			setError(data.error ?? "Failed to create variant");
			return;
		}

		formRef.current?.reset();
		setAttrs([]);
		setIsPreOrder(false);
		setSelectedProductId(null);
		setProductSearch("");
		onClose();
		router.refresh();
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center !mt-0">
			<div className="absolute inset-0 bg-black/50" onClick={onClose} />
			<div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
				<div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
					<h2 className="text-lg font-semibold text-slate-900">
						Create New Variant
					</h2>
					<button
						onClick={onClose}
						className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
						<X className="w-5 h-5 text-slate-500" />
					</button>
				</div>

				<form
					ref={formRef}
					onSubmit={handleSubmit}
					className="p-6 space-y-4">
					{error && (
						<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
							{error}
						</div>
					)}

					{/* Hidden product_id for form submission */}
					<input
						type="hidden"
						name="product_id"
						value={selectedProductId ?? ""}
					/>

					{/* Product searchable select */}
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-1">
							Product <span className="text-red-500">*</span>
						</label>
						<div className="relative">
							<input
								type="text"
								value={
									selectedProduct
										? selectedProduct.name
										: productSearch
								}
								onFocus={() => {
									setDropdownOpen(true);
									if (selectedProduct) setProductSearch("");
								}}
								onChange={(e) => {
									setProductSearch(e.target.value);
									setSelectedProductId(null);
									setDropdownOpen(true);
								}}
								onBlur={() =>
									setTimeout(
										() => setDropdownOpen(false),
										150,
									)
								}
								placeholder="Search product…"
								className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
							{dropdownOpen && filteredProducts.length > 0 && (
								<ul className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
									{filteredProducts.map((p) => (
										<li
											key={p.id}
											onMouseDown={() => {
												setSelectedProductId(p.id);
												setProductSearch("");
												setDropdownOpen(false);
											}}
											className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer">
											{p.thumbnail ? (
												<img
													src={p.thumbnail}
													alt={p.name}
													className="w-8 h-8 rounded object-cover shrink-0"
												/>
											) : (
												<div className="w-8 h-8 rounded bg-slate-100 shrink-0" />
											)}
											<div className="min-w-0">
												<div className="font-medium text-slate-900 truncate">
													{p.name}
												</div>
												<div className="text-xs text-slate-400">
													{p.product_type}
												</div>
											</div>
										</li>
									))}
								</ul>
							)}
						</div>

						{/* Selected product info card */}
						{selectedProduct && (
							<div className="mt-2 flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
								{selectedProduct.thumbnail ? (
									<img
										src={selectedProduct.thumbnail}
										alt={selectedProduct.name}
										className="w-10 h-10 rounded object-cover shrink-0"
									/>
								) : (
									<div className="w-10 h-10 rounded bg-slate-200 shrink-0" />
								)}
								<div className="flex-1 min-w-0">
									<div className="font-medium text-sm text-slate-900 truncate">
										{selectedProduct.name}
									</div>
									<div className="flex items-center gap-2 mt-0.5 flex-wrap">
										<span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
											{selectedProduct.product_type}
										</span>
										{selectedProduct.brand && (
											<span className="text-xs text-slate-500">
												{selectedProduct.brand}
											</span>
										)}
										<span className="text-xs text-slate-500">
											{selectedProduct.base_price.toLocaleString(
												"vi-VN",
											)}
											₫ base
										</span>
										<span className="text-xs text-slate-500">
											Stock:{" "}
											{selectedProduct.stock_quantity ??
												"—"}
										</span>
									</div>
								</div>
								<button
									type="button"
									onClick={() => setSelectedProductId(null)}
									className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors shrink-0">
									<X className="w-4 h-4" />
								</button>
							</div>
						)}
					</div>

					{/* Variant Name */}
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-1">
							Variant Name <span className="text-red-500">*</span>
						</label>
						<input
							name="variant_name"
							required
							className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="e.g. Red / Large"
						/>
					</div>

					{/* Price Adjustment + Stock */}
					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-1">
								Price Adjustment (₫)
							</label>
							<input
								name="price_adjustment"
								type="number"
								className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="0"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-1">
								Stock Quantity
							</label>
							<input
								name="stock_quantity"
								type="number"
								min="0"
								className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="0"
							/>
						</div>
					</div>

					{/* Pre-order toggle */}
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={() => setIsPreOrder((v) => !v)}
							className={`relative w-10 h-6 rounded-full transition-colors ${isPreOrder ? "bg-purple-600" : "bg-slate-300"}`}>
							<span
								className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPreOrder ? "translate-x-4" : ""}`}
							/>
						</button>
						<span className="text-sm text-slate-700">
							Pre-order
						</span>
					</div>

					{/* Attributes */}
					<div>
						<div className="flex items-center justify-between mb-2">
							<label className="block text-sm font-medium text-slate-700">
								Attributes
							</label>
							<button
								type="button"
								onClick={addAttr}
								className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
								<Plus className="w-3.5 h-3.5" />
								Add attribute
							</button>
						</div>
						{attrs.length === 0 ? (
							<p className="text-xs text-slate-400">
								No attributes — click "Add attribute" to define
								key/value pairs (e.g. color: red).
							</p>
						) : (
							<div className="space-y-2">
								{attrs.map((a, i) => (
									<div
										key={i}
										className="flex items-center gap-2">
										<input
											value={a.key}
											onChange={(e) =>
												updateAttr(
													i,
													"key",
													e.target.value,
												)
											}
											placeholder="Key"
											className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
										/>
										<input
											value={a.value}
											onChange={(e) =>
												updateAttr(
													i,
													"value",
													e.target.value,
												)
											}
											placeholder="Value"
											className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
										/>
										<button
											type="button"
											onClick={() => removeAttr(i)}
											className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
											<Trash2 className="w-4 h-4" />
										</button>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Actions */}
					<div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
							Cancel
						</button>
						<button
							type="submit"
							disabled={loading}
							className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors">
							{loading ? "Creating…" : "Create Variant"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
