"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

interface Props {
	open: boolean;
	onClose: () => void;
}

const PRODUCT_TYPES = ["standard", "kit", "component"];

export default function CreateProductModal({ open, onClose }: Props) {
	const router = useRouter();
	const formRef = useRef<HTMLFormElement>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [productType, setProductType] = useState("standard");
	const [slug, setSlug] = useState("");

	function toSlug(value: string) {
		return value
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9\s-]/g, "")
			.replace(/\s+/g, "-");
	}

	const isKit = productType === "kit";
	if (!open) return null;

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setLoading(true);

		const fd = new FormData(e.currentTarget);
		const name = fd.get("name") as string;
		const slug = fd.get("slug") as string;
		const base_price = Number(fd.get("base_price"));
		const product_type = fd.get("product_type") as string;
		const stock_quantity =
			product_type === "kit" || !fd.get("stock_quantity")
				? null
				: Number(fd.get("stock_quantity"));
		const brand = (fd.get("brand") as string) || null;
		const description = (fd.get("description") as string) || null;

		const res = await fetch("/api/products", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name,
				slug,
				base_price,
				stock_quantity,
				product_type,
				brand,
				description,
			}),
		});
		const data = await res.json();
		const insertError = res.ok ? null : { message: data.error as string };

		setLoading(false);

		if (insertError) {
			setError(insertError.message);
			return;
		}

		formRef.current?.reset();
		onClose();
		router.refresh();
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center !mt-0">
			{/* Backdrop */}
			<div className="absolute inset-0 bg-black/50" onClick={onClose} />

			{/* Modal */}
			<div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
				<div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
					<h2 className="text-lg font-semibold text-slate-900">
						Create New Product
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
						<div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
							{error}
						</div>
					)}

					<div className="grid grid-cols-2 gap-4">
						<div className="col-span-2">
							<label className="block text-sm font-medium text-slate-700 mb-1">
								Name <span className="text-red-500">*</span>
							</label>
							<input
								name="name"
								required
								className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="Product name"
								onChange={(e) =>
									setSlug(toSlug(e.target.value))
								}
							/>
						</div>

						<div className="col-span-2">
							<label className="block text-sm font-medium text-slate-700 mb-1">
								Slug <span className="text-red-500">*</span>
							</label>
							<input
								name="slug"
								required
								className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="product-slug"
								value={slug}
								onChange={(e) => setSlug(e.target.value)}
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-slate-700 mb-1">
								Base Price (₫){" "}
								<span className="text-red-500">*</span>
							</label>
							<input
								name="base_price"
								type="number"
								required
								min={0}
								className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="0"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-slate-700 mb-1">
								Product Type{" "}
								<span className="text-red-500">*</span>
							</label>
							<select
								name="product_type"
								required
								value={productType}
								onChange={(e) => setProductType(e.target.value)}
								className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
								{PRODUCT_TYPES.map((t) => (
									<option key={t} value={t}>
										{t}
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
								name="stock_quantity"
								type="number"
								min={0}
								disabled={isKit}
								className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
								placeholder={isKit ? "—" : "0"}
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-slate-700 mb-1">
								Brand
							</label>
							<input
								name="brand"
								className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="Brand name"
							/>
						</div>

						<div className="col-span-2">
							<label className="block text-sm font-medium text-slate-700 mb-1">
								Description
							</label>
							<textarea
								name="description"
								rows={3}
								className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
								placeholder="Optional description"
							/>
						</div>
					</div>

					<div className="flex justify-end gap-3 pt-2">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
							Cancel
						</button>
						<button
							type="submit"
							disabled={loading}
							className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors">
							{loading ? "Creating…" : "Create Product"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
