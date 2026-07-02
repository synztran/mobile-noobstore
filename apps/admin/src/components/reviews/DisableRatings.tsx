"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ProductItem {
	id: string;
	name: string;
	slug: string;
	thumbnail: string | null;
	disable_ratings: boolean;
	review_count: number;
	avg_rating: number | null;
}

interface ProductsResponse {
	products: ProductItem[];
	total: number;
	page: number;
	totalPages: number;
}

const PAGE_SIZE = 20;

export function DisableRatings() {
	const queryClient = useQueryClient();
	const router = useRouter();
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [disabledOnly, setDisabledOnly] = useState(false);
	const [toggling, setToggling] = useState<string | null>(null);

	const { data, isLoading } = useQuery<ProductsResponse>({
		queryKey: ["products-ratings", search, page, disabledOnly],
		queryFn: async () => {
			const params = new URLSearchParams();
			params.set("page", String(page));
			params.set("limit", String(PAGE_SIZE));
			if (search) params.set("search", search);
			if (disabledOnly) params.set("disabledOnly", "true");
			const res = await fetch(`/api/products/ratings?${params}`);
			if (!res.ok) throw new Error("Failed to fetch products");
			return res.json();
		},
	});

	async function toggleDisableRatings(product: ProductItem) {
		setToggling(product.id);
		const res = await fetch("/api/products/ratings", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				product_id: product.id,
				disable_ratings: !product.disable_ratings,
			}),
		});
		setToggling(null);
		if (!res.ok) {
			alert("Failed to update product");
			return;
		}
		queryClient.invalidateQueries({ queryKey: ["products-ratings"] });
		router.refresh();
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
					<input
						type="text"
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
						placeholder="Tìm kiếm sản phẩm..."
						className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<label className="flex items-center gap-2 text-sm text-slate-600">
					<input
						type="checkbox"
						checked={disabledOnly}
						onChange={(e) => {
							setDisabledOnly(e.target.checked);
							setPage(1);
						}}
						className="checkbox checkbox-sm checkbox-primary"
					/>
					Chỉ sản phẩm đã tắt
				</label>
			</div>

			<div className="overflow-hidden rounded-lg bg-white shadow">
				<table className="w-full">
					<thead className="border-b border-slate-200 bg-slate-50">
						<tr>
							<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
								Sản phẩm
							</th>
							<th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">
								Số đánh giá
							</th>
							<th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">
								Điểm TB
							</th>
							<th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">
								Trạng thái
							</th>
							<th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
								Thao tác
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-100">
						{isLoading ? (
							<tr>
								<td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
									Đang tải...
								</td>
							</tr>
						) : data && data.products.length > 0 ? (
							data.products.map((product) => (
								<tr key={product.id} className="hover:bg-slate-50">
									<td className="px-4 py-3">
										<div className="flex items-center gap-3">
											{product.thumbnail ? (
												<img
													src={product.thumbnail}
													alt={product.name}
													className="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
												/>
											) : (
												<div className="h-10 w-10 flex-shrink-0 rounded-lg bg-slate-100" />
											)}
											<div className="min-w-0">
												<p className="text-sm font-medium text-slate-900 truncate max-w-[280px]">
													{product.name}
												</p>
												<p className="text-xs text-slate-400 truncate">
													/{product.slug}
												</p>
											</div>
										</div>
									</td>
									<td className="px-4 py-3 text-center text-sm text-slate-600">
										{product.review_count}
									</td>
									<td className="px-4 py-3 text-center">
										{product.avg_rating ? (
											<span className="text-sm font-medium text-amber-600">
												{product.avg_rating.toFixed(1)}
											</span>
										) : (
											<span className="text-xs text-slate-400">—</span>
										)}
									</td>
									<td className="px-4 py-3 text-center">
										<span
											className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
												product.disable_ratings
													? "bg-red-100 text-red-700"
													: "bg-green-100 text-green-700"
											}`}
										>
											{product.disable_ratings ? "Đã tắt" : "Đang mở"}
										</span>
									</td>
									<td className="px-4 py-3 text-right">
										<button
											onClick={() => toggleDisableRatings(product)}
											disabled={toggling === product.id}
											className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
												product.disable_ratings
													? "bg-green-50 text-green-700 hover:bg-green-100"
													: "bg-red-50 text-red-700 hover:bg-red-100"
											}`}
										>
											{toggling === product.id
												? "Đang xử lý..."
												: product.disable_ratings
													? "Bật lại"
													: "Tắt đánh giá"}
										</button>
									</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
									Không tìm thấy sản phẩm
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{data && data.totalPages > 1 && (
				<div className="flex items-center justify-center gap-2">
					<button
						onClick={() => setPage((p) => Math.max(1, p - 1))}
						disabled={page === 1}
						className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
					>
						Trước
					</button>
					<span className="text-sm text-slate-500">
						Trang {page} / {data.totalPages}
					</span>
					<button
						onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
						disabled={page === data.totalPages}
						className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
					>
						Sau
					</button>
				</div>
			)}
		</div>
	);
}
