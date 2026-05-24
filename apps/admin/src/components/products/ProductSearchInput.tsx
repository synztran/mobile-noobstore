"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

export default function ProductSearchInput() {
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
		<div className="relative">
			<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
			<input
				type="search"
				defaultValue={searchParams.get("q") ?? ""}
				onChange={(e) => handleSearch(e.target.value)}
				placeholder="Search products..."
				className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
			/>
		</div>
	);
}
