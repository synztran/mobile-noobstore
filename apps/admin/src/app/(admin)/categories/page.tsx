import CategoriesHeader from "@/components/categories/CategoriesHeader";
import { getAdminClient } from "@/lib/supabase/admin";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
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
		.select("id, name, slug, thumbnail", { count: "exact" })
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
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-200">
						{categories && categories.length > 0 ? (
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
								</tr>
							))
						) : (
							<tr>
								<td
									colSpan={3}
									className="px-6 py-8 text-center text-slate-500">
									No categories found
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

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
