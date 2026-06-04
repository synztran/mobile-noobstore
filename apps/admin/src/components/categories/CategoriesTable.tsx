"use client";

import { ImageOff, Pencil } from "lucide-react";
import { useState } from "react";
import EditCategoryModal, { type CategoryRecord } from "./EditCategoryModal";

interface Props {
	categories: CategoryRecord[];
}

export default function CategoriesTable({ categories }: Props) {
	const [editing, setEditing] = useState<CategoryRecord | null>(null);

	return (
		<>
			<div className="bg-white rounded-lg shadow overflow-hidden">
				<table className="w-full">
					<thead className="bg-slate-50 border-b border-slate-200">
						<tr>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								ID
							</th>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								Category
							</th>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								Slug
							</th>
							<th className="px-6 py-3 text-center text-sm font-semibold text-slate-900">
								Active
							</th>
							<th className="px-6 py-3 text-center text-sm font-semibold text-slate-900">
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-200">
						{categories.length > 0 ? (
							categories.map((cat) => (
								<tr key={cat.id} className="hover:bg-slate-50">
									<td className="px-6 py-4 text-xs font-mono text-slate-400">
										{cat.id}
									</td>
									<td className="px-6 py-4">
										<div className="flex items-center gap-3">
											{cat.thumbnail ? (
												<img
													src={cat.thumbnail}
													alt={cat.name}
													className="w-10 h-10 rounded-lg object-cover shrink-0"
												/>
											) : (
												<div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
													<ImageOff className="w-4 h-4 text-slate-400" />
												</div>
											)}
											<span className="text-sm font-medium text-slate-900">
												{cat.name}
											</span>
										</div>
									</td>
									<td className="px-6 py-4 text-sm font-mono text-slate-500">
										{cat.slug}
									</td>
									<td className="px-6 py-4 text-center">
										<span
											className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cat.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
											{cat.is_active ? "Active" : "Inactive"}
										</span>
									</td>
									<td className="px-6 py-4 text-center">
										<button
											type="button"
											onClick={() => setEditing(cat)}
											className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
											title="Edit">
											<Pencil className="w-4 h-4" />
										</button>
									</td>
								</tr>
							))
						) : (
							<tr>
								<td
									colSpan={5}
									className="px-6 py-8 text-center text-slate-500">
									No categories found
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			<EditCategoryModal
				category={editing}
				onClose={() => setEditing(null)}
			/>
		</>
	);
}
