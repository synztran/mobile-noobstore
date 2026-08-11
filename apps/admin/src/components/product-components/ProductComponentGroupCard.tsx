"use client";

import UpdateProductComponentModal from "@/components/product-components/UpdateProductComponentModal";
import Tag from "@/components/ui/Tag";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
	ProductComponentGroup,
	ProductComponentRow,
	ProductOption,
} from "./types";

type Props = {
	group: ProductComponentGroup;
	products: ProductOption[];
};

export default function ProductComponentGroupCard({ group, products }: Props) {
	const router = useRouter();
	const [editingComponent, setEditingComponent] =
		useState<ProductComponentRow | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	async function handleDelete(component: ProductComponentRow) {
		const componentName =
			component.component_product?.name ?? "this component";
		if (
			!window.confirm(
				`Delete "${componentName}" from this product? This cannot be undone.`
			)
		)
			return;

		setDeletingId(component.id);
		try {
			const res = await fetch(`/api/product-components/${component.id}`, {
				method: "DELETE",
			});
			if (!res.ok) throw new Error("Failed to delete");
			router.refresh();
		} catch {
			alert("Failed to delete component");
			setDeletingId(null);
		}
	}

	return (
		<>
			<div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
				<div className="flex items-center justify-between gap-3 p-4 bg-slate-50 border-b border-slate-200">
					<div className="min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<h2 className="text-lg font-semibold text-slate-900 truncate">
								{group.parent_product?.name ??
									"Unknown Parent Product"}
							</h2>
							<Tag tone="blue">
								{group.parent_product?.product_type ?? "—"}
							</Tag>
							<Tag tone="slate">
								{group.components.length} components
							</Tag>
						</div>
						<p className="text-xs text-slate-500 font-mono mt-1 truncate">
							Parent ID: {group.parent_product_id}
						</p>
					</div>
				</div>

				<div className="p-4 space-y-3">
					{group.components.map((component) => (
						<div
							key={component.id}
							className="rounded-lg border border-slate-200 bg-slate-50 p-3">
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0">
									<div className="flex items-center gap-2 flex-wrap">
										<p className="font-medium text-slate-900">
											{component.component_product
												?.name ?? "Unknown"}
										</p>
										<Tag tone="indigo">
											{component.component_group}
										</Tag>
										<Tag
											tone={
												component.is_required
													? "red"
													: "blue"
											}>
											{component.is_required
												? "Required"
												: "Optional"}
										</Tag>
										{component.max_quantity !== null && (
											<Tag tone="slate">
												Max {component.max_quantity}
											</Tag>
										)}
									</div>
									<p className="text-xs text-slate-500 mt-1 font-mono truncate">
										Component ID: {component.id}
									</p>
								</div>
								<div className="flex shrink-0 items-center gap-2">
									<button
										type="button"
										onClick={() =>
											setEditingComponent(component)
										}
										className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700">
										<Pencil className="w-3.5 h-3.5" />
										Edit
									</button>
									<button
										type="button"
										onClick={() => handleDelete(component)}
										disabled={deletingId === component.id}
										className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 disabled:opacity-50">
										<Trash2 className="w-3.5 h-3.5" />
										{deletingId === component.id
											? "Deleting…"
											: "Delete"}
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>

			<UpdateProductComponentModal
				open={Boolean(editingComponent)}
				onClose={() => setEditingComponent(null)}
				products={products}
				component={editingComponent}
			/>
		</>
	);
}
