"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

const PRODUCT_TYPE_OPTIONS = [
	{ label: "All Types", value: "" },
	{ label: "Standard", value: "standard" },
	{ label: "Kit", value: "kit" },
	{ label: "Component", value: "component" },
	{ label: "Gift", value: "gift" },
];

export default function ProductTypeFilter() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [, startTransition] = useTransition();

	const handleChange = useCallback(
		(value: string) => {
			const params = new URLSearchParams(searchParams.toString());
			if (value) {
				params.set("product_type", value);
			} else {
				params.delete("product_type");
			}
			params.delete("page");
			startTransition(() => {
				router.replace(`${pathname}?${params.toString()}`);
			});
		},
		[router, pathname, searchParams],
	);

	return (
		<select
			aria-label="Filter by product type"
			value={searchParams.get("product_type") ?? ""}
			onChange={(e) => handleChange(e.target.value)}
			className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
			{PRODUCT_TYPE_OPTIONS.map((option) => (
				<option key={option.label} value={option.value}>
					{option.label}
				</option>
			))}
		</select>
	);
}
