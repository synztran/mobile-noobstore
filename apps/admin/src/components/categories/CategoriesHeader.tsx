"use client";

import CreateCategoryModal from "@/components/categories/CreateCategoryModal";
import { Plus, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

export default function CategoriesHeader() {
	const [modalOpen, setModalOpen] = useState(false);
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [, startTransition] = useTransition();

	const handleSearch = useCallback(
		(value: string) => {
			const params = new URLSearchParams(searchParams.toString());
			if (value) {
				params.set("q", value);
			} else {
				params.delete("q");
			}
			params.delete("page");
			startTransition(() => {
				router.replace(`${pathname}?${params.toString()}`);
			});
		},
		[router, pathname, searchParams],
	);

	return (
		<>
			<div className="flex items-center gap-4">
				<h1 className="text-3xl font-bold text-slate-900 mr-auto">
					Categories
				</h1>
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
					<input
						type="search"
						defaultValue={searchParams.get("q") ?? ""}
						onChange={(e) => handleSearch(e.target.value)}
						placeholder="Search categories…"
						className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg w-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<button
					onClick={() => setModalOpen(true)}
					className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0">
					<Plus className="w-4 h-4" />
					Add Category
				</button>
			</div>

			<CreateCategoryModal
				open={modalOpen}
				onClose={() => setModalOpen(false)}
			/>
		</>
	);
}
