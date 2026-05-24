"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import SearchableProductSelect from "./SearchableProductSelect";
import type { ProductComponentRow, ProductOption } from "./types";

type Mode = "create" | "update";

type Props = {
	open: boolean;
	onClose: () => void;
	products: ProductOption[];
	mode: Mode;
	component?: ProductComponentRow | null;
};

export default function ProductComponentFormModal({
	open,
	onClose,
	products,
	mode,
	component,
}: Props) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [parentProductId, setParentProductId] = useState("");
	const [componentProductId, setComponentProductId] = useState("");
	const [componentGroup, setComponentGroup] = useState("");
	const [isRequired, setIsRequired] = useState(false);
	const [maxQuantity, setMaxQuantity] = useState("");

	const title =
		mode === "create" ? "Create New Component" : "Update Component";
	const submitLabel =
		mode === "create" ? "Create Component" : "Update Component";

	useEffect(() => {
		if (!open) return;
		setError(null);
		setParentProductId(component?.parent_product_id ?? "");
		setComponentProductId(component?.component_product_id ?? "");
		setComponentGroup(component?.component_group ?? "");
		setIsRequired(Boolean(component?.is_required));
		setMaxQuantity(
			component?.max_quantity === null ||
				component?.max_quantity === undefined
				? ""
				: String(component.max_quantity),
		);
	}, [open, component]);

	const parentOptions = useMemo(
		() =>
			products.filter(
				(product) =>
					product.product_type === "kit" &&
					product.id !== componentProductId,
			),
		[products, componentProductId],
	);

	const componentOptions = useMemo(
		() => products.filter((product) => product.id !== parentProductId),
		[products, parentProductId],
	);

	if (!open) return null;

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setLoading(true);

		const payload = {
			parent_product_id: parentProductId || null,
			component_product_id: componentProductId || null,
			component_group: componentGroup.trim(),
			is_required: isRequired,
			max_quantity: maxQuantity.trim() ? Number(maxQuantity) : null,
		};

		const url =
			mode === "create"
				? "/api/product-components"
				: `/api/product-components/${component?.id ?? ""}`;

		const res = await fetch(url, {
			method: mode === "create" ? "POST" : "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		setLoading(false);

		if (!res.ok) {
			const data = await res.json().catch(() => null);
			setError(data?.error ?? `Failed to ${mode} component`);
			return;
		}

		onClose();
		router.refresh();
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center !mt-0">
			<div className="absolute inset-0 bg-black/50" onClick={onClose} />
			<div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
				<div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
					<h2 className="text-lg font-semibold text-slate-900">
						{title}
					</h2>
					<button
						onClick={onClose}
						className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
						<X className="w-5 h-5 text-slate-500" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="p-6 space-y-4">
					{error && (
						<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
							{error}
						</div>
					)}

					<div className="grid grid-cols-1 gap-4">
						<SearchableProductSelect
							label="Parent Product"
							placeholder="Search parent product by name…"
							products={parentOptions}
							value={parentProductId}
							onChange={setParentProductId}
							required
						/>

						<SearchableProductSelect
							label="Component Product"
							placeholder="Search component product by name…"
							products={componentOptions}
							value={componentProductId}
							onChange={setComponentProductId}
							required
						/>

						<div>
							<label className="block text-sm font-medium text-slate-700 mb-1">
								Component Group{" "}
								<span className="text-red-500">*</span>
							</label>
							<input
								value={componentGroup}
								onChange={(e) =>
									setComponentGroup(e.target.value)
								}
								required
								placeholder="e.g. body, plate, accessory"
								className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-slate-700 mb-1">
								Max Quantity
							</label>
							<input
								type="number"
								min={1}
								value={maxQuantity}
								onChange={(e) => setMaxQuantity(e.target.value)}
								placeholder="Optional"
								className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
					</div>

					<label className="flex items-center gap-2 text-sm text-slate-700">
						<input
							type="checkbox"
							checked={isRequired}
							onChange={(e) => setIsRequired(e.target.checked)}
							className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
						/>
						Required component
					</label>

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
							{loading ? `${submitLabel}…` : submitLabel}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
