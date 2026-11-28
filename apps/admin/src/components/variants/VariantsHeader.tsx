"use client";

import CreateVariantModal from "@/components/variants/CreateVariantModal";
import { buildVariantsSearchParams } from "@/lib/variants-search-params";
import { Loader2, Plus, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

interface Product {
	id: string;
	name: string;
	product_type: string;
	base_price: number;
	stock_quantity: number | null;
	thumbnail: string | null;
	brand: string | null;
}

interface Props {
	products: Product[];
	searchBy: string;
}

export default function VariantsHeader({ products, searchBy }: Props) {
	const [modalOpen, setModalOpen] = useState(false);
	const searchParams = useSearchParams();
	// Controlled text so entered text is never lost, even while the URL
	// updates during a transition.
	const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
	const router = useRouter();
	const pathname = usePathname();
	const [isPending, startTransition] = useTransition();

	const handleSearch = useCallback(
		(value: string, by?: string) => {
			const params = buildVariantsSearchParams({
				current: searchParams,
				q: value,
				by: by ?? searchBy,
			});
			startTransition(() => {
				router.replace(`${pathname}?${params.toString()}`);
			});
		},
		[router, pathname, searchParams, searchBy],
	);

	return (
		<>
			<div className="flex items-center gap-4">
				<h1 className="text-3xl font-bold text-slate-900 mr-auto">
					Product Variants
				</h1>
				<div
					className="flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500"
					aria-busy={isPending}
				>
					{/* key={searchBy} remounts both controls when the field
					    switches, so the query text always matches the selected
					    field immediately. */}
					<select
						key={searchBy}
						value={searchBy}
						onChange={(e) => handleSearch(query, e.target.value)}
						aria-label="Search field"
						className="border-r border-slate-300 bg-slate-50 text-sm text-slate-600 px-2 py-2 focus:outline-none">
						<option value="variant">Variant</option>
						<option value="product">Product</option>
					</select>
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
						<input
							key={searchBy}
							type="search"
							value={query}
							onChange={(e) => {
								setQuery(e.target.value);
								handleSearch(e.target.value);
							}}
							placeholder={
								searchBy === "product"
									? "Search by product…"
									: "Search by variant…"
							}
							aria-label={
								searchBy === "product"
									? "Search by product"
									: "Search by variant"
							}
							className="pl-9 pr-8 py-2 text-sm w-56 focus:outline-none"
						/>
						{isPending && (
							<span className="absolute right-2 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center" aria-hidden="true">
								<Loader2 className="h-4 w-4 animate-spin text-slate-400" />
							</span>
						)}
					</div>
					{isPending && (
						<span
							role="status"
							aria-live="polite"
							className="sr-only"
						>
							Loading variants…
						</span>
					)}
				</div>
				<button
					onClick={() => setModalOpen(true)}
					className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0">
					<Plus className="w-4 h-4" />
					Add Variant
				</button>
			</div>

			<CreateVariantModal
				open={modalOpen}
				onClose={() => setModalOpen(false)}
				products={products}
			/>
		</>
	);
}
