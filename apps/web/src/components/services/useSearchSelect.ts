import type { BookingOption } from "@/app/api/services/booking-config/route";
import { useState } from "react";

export function useSearchSelect(
	option: BookingOption,
	selectedValueId: number | null,
) {
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);

	const filtered = query
		? option.values.filter((v) =>
				v.label.toLowerCase().includes(query.toLowerCase()),
			)
		: option.values;

	const selected = option.values.find((v) => v.id === selectedValueId);

	function handleFocus() {
		setQuery("");
		setOpen(true);
	}

	function handleBlur() {
		setTimeout(() => setOpen(false), 150);
	}

	function handleInputChange(value: string) {
		setQuery(value);
		if (!open) setOpen(true);
	}

	function handleSelect() {
		setOpen(false);
		setQuery("");
	}

	return {
		query,
		open,
		filtered,
		selected,
		handleFocus,
		handleBlur,
		handleInputChange,
		handleSelect,
	};
}
