import VariantsHeader from "@/components/variants/VariantsHeader";
import { getAdminClient } from "@/lib/supabase/admin";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
	title: "Product Variants - Huy Store Admin",
};

const PAGE_SIZE = 25;

export default async function ProductVariantsPage({
	searchParams,
}: {
	searchParams: Promise<{ q?: string; page?: string; by?: string }>;
}) {
	const { q, page, by } = await searchParams;
	const searchBy = by === "product" ? "product" : "variant";
	const currentPage = Math.max(1, parseInt(page ?? "1", 10));
	const from = (currentPage - 1) * PAGE_SIZE;
	const to = from + PAGE_SIZE - 1;

	const supabase = getAdminClient();

	const { data: products } = await supabase
		.from("products")
		.select(
			"id, name, product_type, base_price, stock_quantity, thumbnail, brand",
		)
		.eq("product_type", "component")
		.order("name", { ascending: true });

	let query = supabase
		.from("product_variants")
		.select(
			`
			id, variant_name, price_adjustment, stock_quantity, is_pre_order, attributes,
			products(id, name, product_type)
		`,
			{ count: "exact" },
		)
		.order("variant_name", { ascending: true })
		.range(from, to);

	if (q) {
		if (searchBy === "product") {
			// Resolve matching product IDs first, then filter variants
			const { data: matchedProducts } = await supabase
				.from("products")
				.select("id")
				.ilike("name", `%${q}%`);
			const ids = (matchedProducts ?? []).map((p) => p.id);
			if (ids.length === 0) {
				query = query.in("product_id", ["__no_match__"]);
			} else {
				query = query.in("product_id", ids);
			}
		} else {
			query = query.ilike("variant_name", `%${q}%`);
		}
	}

	const { data: variants, error, count } = await query;

	const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

	const buildUrl = (p: number) => {
		const params = new URLSearchParams();
		if (q) params.set("q", q);
		params.set("by", searchBy);
		params.set("page", String(p));
		return `/products/variants?${params.toString()}`;
	};

	if (error) {
		console.error("Error fetching product variants:", error);
	}

	return (
		<div className="space-y-6">
			<VariantsHeader products={products ?? []} searchBy={searchBy} />

			{error && (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
					Failed to load variants.
				</div>
			)}

			<div className="bg-white rounded-lg shadow overflow-hidden">
				<table className="w-full">
					<thead className="bg-slate-50 border-b border-slate-200">
						<tr>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								Variant
							</th>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								Product
							</th>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								Price Adj.
							</th>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								Stock
							</th>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								Attributes
							</th>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								Pre-order
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-200">
						{variants && variants.length > 0 ? (
							variants.map((v) => {
								const product = v.products as {
									name: string;
									product_type: string;
								} | null;
								const attrs =
									v.attributes &&
									typeof v.attributes === "object" &&
									!Array.isArray(v.attributes)
										? (v.attributes as Record<
												string,
												string
											>)
										: null;
								return (
									<tr
										key={v.id}
										className="hover:bg-slate-50">
										<td className="px-6 py-4 text-sm font-medium text-slate-900">
											{v.variant_name}
										</td>
										<td className="px-6 py-4 text-sm text-slate-600">
											<div>{product?.name ?? "—"}</div>
											{product?.product_type && (
												<div className="text-xs text-slate-400">
													{product.product_type}
												</div>
											)}
										</td>
										<td className="px-6 py-4 text-sm font-medium">
											{v.price_adjustment === null ||
											v.price_adjustment === 0 ? (
												<span className="text-slate-400">
													—
												</span>
											) : (
												<span
													className={
														v.price_adjustment > 0
															? "text-green-600"
															: "text-red-600"
													}>
													{v.price_adjustment > 0
														? "+"
														: ""}
													{v.price_adjustment.toLocaleString(
														"vi-VN",
													)}
													₫
												</span>
											)}
										</td>
										<td className="px-6 py-4 text-sm text-slate-600">
											{v.stock_quantity ?? "—"}
										</td>
										<td className="px-6 py-4 text-sm text-slate-600">
											{attrs
												? Object.entries(attrs)
														.map(
															([k, val]) =>
																`${k}: ${val}`,
														)
														.join(", ")
												: "—"}
										</td>
										<td className="px-6 py-4 text-sm">
											{v.is_pre_order ? (
												<span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 font-medium">
													Yes
												</span>
											) : (
												<span className="text-slate-400">
													—
												</span>
											)}
										</td>
									</tr>
								);
							})
						) : (
							<tr>
								<td
									colSpan={6}
									className="px-6 py-8 text-center text-slate-500">
									No product variants found
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{totalPages > 1 && (
				<div className="flex items-center justify-between pt-2">
					<span className="text-sm text-slate-500">
						{count} variant{count !== 1 ? "s" : ""} · Page{" "}
						{currentPage} of {totalPages}
					</span>
					<div className="flex items-center gap-1">
						<Link
							href={buildUrl(currentPage - 1)}
							aria-disabled={currentPage === 1}
							className={`p-1.5 rounded-lg border border-slate-200 ${currentPage === 1 ? "pointer-events-none opacity-40" : "hover:bg-slate-100"}`}>
							<ChevronLeft className="w-4 h-4" />
						</Link>
						{Array.from({ length: totalPages }, (_, i) => i + 1)
							.filter(
								(p) =>
									p === 1 ||
									p === totalPages ||
									Math.abs(p - currentPage) <= 1,
							)
							.reduce<(number | "…")[]>((acc, p, idx, arr) => {
								if (idx > 0 && p - (arr[idx - 1] as number) > 1)
									acc.push("…");
								acc.push(p);
								return acc;
							}, [])
							.map((p, i) =>
								p === "…" ? (
									<span
										key={`ellipsis-${i}`}
										className="px-2 text-slate-400 text-sm">
										…
									</span>
								) : (
									<Link
										key={p}
										href={buildUrl(p)}
										className={`min-w-[2rem] h-8 flex items-center justify-center rounded-lg text-sm border ${p === currentPage ? "bg-blue-600 text-white border-blue-600 font-medium" : "border-slate-200 hover:bg-slate-100"}`}>
										{p}
									</Link>
								),
							)}
						<Link
							href={buildUrl(currentPage + 1)}
							aria-disabled={currentPage === totalPages}
							className={`p-1.5 rounded-lg border border-slate-200 ${currentPage === totalPages ? "pointer-events-none opacity-40" : "hover:bg-slate-100"}`}>
							<ChevronRight className="w-4 h-4" />
						</Link>
					</div>
				</div>
			)}
		</div>
	);
}
