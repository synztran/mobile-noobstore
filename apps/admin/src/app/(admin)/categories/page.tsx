import CategoriesHeader from "@/components/categories/CategoriesHeader";
import CategoriesTable from "@/components/categories/CategoriesTable";
import { getAdminClient } from "@/lib/supabase/admin";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
	title: "Categories - Admin",
};

const PAGE_SIZE = 20;

export default async function CategoriesPage({
	searchParams,
}: {
	searchParams: Promise<{ q?: string; page?: string }>;
}) {
	const { q, page } = await searchParams;
	const currentPage = Math.max(1, parseInt(page ?? "1", 10));
	const from = (currentPage - 1) * PAGE_SIZE;
	const to = from + PAGE_SIZE - 1;

	const supabase = getAdminClient();

	let query = supabase
		.from("categories")
		.select("id, name, slug, thumbnail, is_active", { count: "exact" })
		.order("name", { ascending: true })
		.range(from, to);

	if (q) {
		query = query.ilike("name", `%${q}%`);
	}

	const { data: categories, error, count } = await query;

	const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

	const buildUrl = (p: number) => {
		const params = new URLSearchParams();
		if (q) params.set("q", q);
		params.set("page", String(p));
		return `/categories?${params.toString()}`;
	};

	if (error) {
		console.error("Error fetching categories:", error);
	}

	return (
		<div className="space-y-6">
			<CategoriesHeader />

			{error && (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
					Failed to load categories.
				</div>
			)}

			<CategoriesTable categories={categories ?? []} />

			{totalPages > 1 && (
				<div className="flex items-center justify-between pt-2">
					<span className="text-sm text-slate-500">
						{count} categor{count !== 1 ? "ies" : "y"} · Page{" "}
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
