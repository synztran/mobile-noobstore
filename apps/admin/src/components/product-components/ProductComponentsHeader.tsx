"use client";

import CreateProductComponentModal from "@/components/product-components/CreateProductComponentModal";
import { Plus, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import type { ProductOption } from "./types";

type Props = {
	products: ProductOption[];
	searchBy: "parent" | "component";
};

export default function ProductComponentsHeader({ products, searchBy }: Props) {
	const [modalOpen, setModalOpen] = useState(false);
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [, startTransition] = useTransition();

	const handleSearch = useCallback(
		(value: string, by?: string) => {
			const params = new URLSearchParams(searchParams.toString());
			if (value) params.set("q", value);
			else params.delete("q");
			params.set("by", by ?? searchBy);
			params.delete("page");
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
					Product Components
				</h1>
				<div className="flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
					<select
						defaultValue={searchBy}
						onChange={(e) =>
							handleSearch(
								searchParams.get("q") ?? "",
								e.target.value,
							)
						}
						className="border-r border-slate-300 bg-slate-50 text-sm text-slate-600 px-2 py-2 focus:outline-none">
						<option value="parent">Parent Product</option>
						<option value="component">Component Name</option>
					</select>
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
						<input
							type="search"
							defaultValue={searchParams.get("q") ?? ""}
							onChange={(e) => handleSearch(e.target.value)}
							placeholder={
								searchBy === "component"
									? "Search by component name…"
									: "Search by parent product…"
							}
							className="pl-9 pr-4 py-2 text-sm w-72 focus:outline-none"
						/>
					</div>
				</div>
				<button
					onClick={() => setModalOpen(true)}
					className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0">
					<Plus className="w-4 h-4" />
					Add New
				</button>
			</div>

			<CreateProductComponentModal
				open={modalOpen}
				onClose={() => setModalOpen(false)}
				products={products}
			/>
		</>
	);
}
