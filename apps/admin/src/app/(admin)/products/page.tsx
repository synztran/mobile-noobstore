import ProductCard from "@/components/products/ProductCard";
import ProductsHeader from "@/components/products/ProductsHeader";
import { getAdminClient } from "@/lib/supabase/admin";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
	title: "Products - Huy Store Admin",
};

const PAGE_SIZE = 20;

export default async function ProductsPage({
	searchParams,
}: {
	searchParams: Promise<{ q?: string; page?: string; product_type?: string }>;
}) {
	const { q, page, product_type } = await searchParams;
	const allowedProductTypes = new Set(["standard", "kit", "component"]);
	const selectedProductType = allowedProductTypes.has(product_type ?? "")
		? product_type
		: undefined;
	const currentPage = Math.max(1, parseInt(page ?? "1", 10));
	const from = (currentPage - 1) * PAGE_SIZE;
	const to = from + PAGE_SIZE - 1;

	const supabase = getAdminClient();

	let query = supabase
		.from("products")
		.select(
			`
			id, name, slug, base_price, stock_quantity, product_type, brand, description, is_used, thumbnail, category_id,
			categories(id, name),
			product_variants(
				id, variant_name, price_adjustment, stock_quantity, is_pre_order, attributes
			),
			product_components!product_components_parent_product_id_fkey(
				id, component_group, is_required, max_quantity,
				component_product:products!product_components_component_product_id_fkey(
					id, name, thumbnail,
					product_variants(
						id, variant_name, price_adjustment, stock_quantity, is_pre_order, attributes
					)
				)
			)
		`,
			{ count: "exact" },
		)
		.order("created_at", { ascending: false })
		.range(from, to);

	if (q) {
		query = query.ilike("name", `%${q}%`);
	}

	if (selectedProductType) {
		query = query.eq("product_type", selectedProductType);
	}

	const { data: rows, error, count } = await query;

	const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

	const buildUrl = (p: number) => {
		const params = new URLSearchParams();
		if (q) params.set("q", q);
		if (selectedProductType)
			params.set("product_type", selectedProductType);
		params.set("page", String(p));
		return `/products?${params.toString()}`;
	};

	if (error) {
		console.error("Error fetching products:", error);
	}

	return (
		<div className="space-y-6">
			<ProductsHeader />

			{error && (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
					Failed to load products.
				</div>
			)}

			<div className="grid grid-cols-3 gap-4">
				{(rows ?? []).length > 0
					? (rows ?? []).map((product) => (
							<ProductCard key={product.id} product={product} />
						))
					: !error && (
							<div className="bg-white rounded-lg shadow px-6 py-12 text-center text-slate-500">
								No products found
							</div>
						)}
			</div>

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex items-center justify-between pt-2">
					<span className="text-sm text-slate-500">
						{count} product{count !== 1 ? "s" : ""} · Page{" "}
						{currentPage} of {totalPages}
					</span>
					<div className="flex items-center gap-1">
						<Link
							href={buildUrl(currentPage - 1)}
							aria-disabled={currentPage === 1}
							className={`p-1.5 rounded-lg border border-slate-200 ${
								currentPage === 1
									? "pointer-events-none opacity-40"
									: "hover:bg-slate-100"
							}`}>
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
										className={`min-w-[2rem] h-8 flex items-center justify-center rounded-lg text-sm border ${
											p === currentPage
												? "bg-blue-600 text-white border-blue-600 font-medium"
												: "border-slate-200 hover:bg-slate-100"
										}`}>
										{p}
									</Link>
								),
							)}
						<Link
							href={buildUrl(currentPage + 1)}
							aria-disabled={currentPage === totalPages}
							className={`p-1.5 rounded-lg border border-slate-200 ${
								currentPage === totalPages
									? "pointer-events-none opacity-40"
									: "hover:bg-slate-100"
							}`}>
							<ChevronRight className="w-4 h-4" />
						</Link>
					</div>
				</div>
			)}
		</div>
	);
}
