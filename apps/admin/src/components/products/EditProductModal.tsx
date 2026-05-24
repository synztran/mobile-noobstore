"use client";

import { Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const PRODUCT_TYPES = ["standard", "kit", "component"];

type EditableProduct = {
	id: string;
	name: string;
	slug: string;
	base_price: number;
	stock_quantity: number | null;
	product_type: string;
	brand: string | null;
	description?: string | null;
};

type Props = {
	product: EditableProduct;
};

export default function EditProductModal({ product }: Props) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [name, setName] = useState(product.name);
	const [slug, setSlug] = useState(product.slug);
	const [basePrice, setBasePrice] = useState(String(product.base_price));
	const [productType, setProductType] = useState(product.product_type);
	const [stockQuantity, setStockQuantity] = useState(
		product.stock_quantity === null ? "" : String(product.stock_quantity),
	);
	const [brand, setBrand] = useState(product.brand ?? "");
	const [description, setDescription] = useState(product.description ?? "");

	useEffect(() => {
		if (!open) return;
		setError(null);
		setName(product.name);
		setSlug(product.slug);
		setBasePrice(String(product.base_price));
		setProductType(product.product_type);
		setStockQuantity(
			product.stock_quantity === null
				? ""
				: String(product.stock_quantity),
		);
		setBrand(product.brand ?? "");
		setDescription(product.description ?? "");
	}, [open, product]);

	function toSlug(value: string) {
		return value
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9\s-]/g, "")
			.replace(/\s+/g, "-");
	}

	const isKit = productType === "kit";

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setLoading(true);

		const payload = {
			name: name.trim(),
			slug: slug.trim(),
			base_price: Number(basePrice),
			product_type: productType,
			stock_quantity:
				productType === "kit" || !stockQuantity.trim()
					? null
					: Number(stockQuantity),
			brand: brand.trim() || null,
			description: description.trim() || null,
		};

		const res = await fetch(`/api/products/${product.id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		const data = await res.json().catch(() => null);
		setLoading(false);

		if (!res.ok) {
			setError(data?.error ?? "Failed to update product");
			return;
		}

		setOpen(false);
		router.refresh();
	}

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
				<Pencil className="w-3.5 h-3.5" />
				Edit
			</button>

			{open && (
				<div className="fixed inset-0 z-50 flex items-center justify-center !mt-0">
					<div
						className="absolute inset-0 bg-black/50"
						onClick={() => setOpen(false)}
					/>
					<div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
						<div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
							<h2 className="text-lg font-semibold text-slate-900">
								Edit Product
							</h2>
							<button
								onClick={() => setOpen(false)}
								className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
								<X className="w-5 h-5 text-slate-500" />
							</button>
						</div>

						<form onSubmit={handleSubmit} className="p-6 space-y-4">
							{error && (
								<div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
									{error}
								</div>
							)}

							<div className="grid grid-cols-2 gap-4">
								<div className="col-span-2">
									<label className="block text-sm font-medium text-slate-700 mb-1">
										Name{" "}
										<span className="text-red-500">*</span>
									</label>
									<input
										required
										value={name}
										onChange={(e) => {
											setName(e.target.value);
											setSlug(toSlug(e.target.value));
										}}
										className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
										placeholder="Product name"
									/>
								</div>

								<div className="col-span-2">
									<label className="block text-sm font-medium text-slate-700 mb-1">
										Slug{" "}
										<span className="text-red-500">*</span>
									</label>
									<input
										required
										value={slug}
										onChange={(e) =>
											setSlug(e.target.value)
										}
										className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
										placeholder="product-slug"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-slate-700 mb-1">
										Base Price (₫){" "}
										<span className="text-red-500">*</span>
									</label>
									<input
										type="number"
										required
										min={0}
										value={basePrice}
										onChange={(e) =>
											setBasePrice(e.target.value)
										}
										className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-slate-700 mb-1">
										Product Type{" "}
										<span className="text-red-500">*</span>
									</label>
									<select
										required
										value={productType}
										onChange={(e) =>
											setProductType(e.target.value)
										}
										className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
										{PRODUCT_TYPES.map((type) => (
											<option key={type} value={type}>
												{type}
											</option>
										))}
									</select>
								</div>

								<div>
									<label
										className={`block text-sm font-medium mb-1 ${isKit ? "text-slate-400" : "text-slate-700"}`}>
										Stock Quantity
										{isKit && (
											<span className="ml-1 text-xs text-slate-400">
												(N/A for kit)
											</span>
										)}
									</label>
									<input
										type="number"
										min={0}
										disabled={isKit}
										value={stockQuantity}
										onChange={(e) =>
											setStockQuantity(e.target.value)
										}
										placeholder={isKit ? "—" : "0"}
										className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-slate-700 mb-1">
										Brand
									</label>
									<input
										value={brand}
										onChange={(e) =>
											setBrand(e.target.value)
										}
										className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
										placeholder="Brand name"
									/>
								</div>

								<div className="col-span-2">
									<label className="block text-sm font-medium text-slate-700 mb-1">
										Description
									</label>
									<textarea
										rows={3}
										value={description}
										onChange={(e) =>
											setDescription(e.target.value)
										}
										className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
										placeholder="Optional description"
									/>
								</div>
							</div>

							<div className="flex justify-end gap-3 pt-2">
								<button
									type="button"
									onClick={() => setOpen(false)}
									className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
									Cancel
								</button>
								<button
									type="submit"
									disabled={loading}
									className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors">
									{loading ? "Saving…" : "Save Changes"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</>
	);
}
