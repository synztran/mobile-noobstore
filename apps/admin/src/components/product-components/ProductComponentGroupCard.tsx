"use client";

import UpdateProductComponentModal from "@/components/product-components/UpdateProductComponentModal";
import Tag from "@/components/ui/Tag";
import { Pencil } from "lucide-react";
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
	const [editingComponent, setEditingComponent] =
		useState<ProductComponentRow | null>(null);

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
								<button
									type="button"
									onClick={() =>
										setEditingComponent(component)
									}
									className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shrink-0">
									<Pencil className="w-3.5 h-3.5" />
									Edit
								</button>
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
