import { CalendarArrowUp, ArrowDown01, ArrowDown10 } from "lucide-react";
import type { ReactElement } from "react";
import type { SortOption } from "@/app/api/products/route";

export const SORT_OPTIONS: {
	value: SortOption;
	label: string;
	icon: ReactElement;
}[] = [
	{ value: "newest", label: "Mới nhất", icon: <CalendarArrowUp size={16} /> },
	{
		value: "price_asc",
		label: "Giá: Thấp đến Cao",
		icon: <ArrowDown01 size={16} />,
	},
	{
		value: "price_desc",
		label: "Giá: Cao đến Thấp",
		icon: <ArrowDown10 size={16} />,
	},
];
