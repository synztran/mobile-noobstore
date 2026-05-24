"use client";

import type { BookingOption } from "@/app/api/services/booking-config/route";
import { formatVND } from "@/lib/currency";
import clsx from "clsx";
import { useSearchSelect } from "./useSearchSelect";

interface GreaseSearchSelectProps {
	option: BookingOption;
	selectedValueId: number | null;
	onSelect: (valueId: number) => void;
}

export function GreaseSearchSelect({
	option,
	selectedValueId,
	onSelect,
}: GreaseSearchSelectProps) {
	const {
		query,
		open,
		filtered,
		selected,
		handleFocus,
		handleBlur,
		handleInputChange,
		handleSelect,
	} = useSearchSelect(option, selectedValueId);

	return (
		<div className="relative">
			<div
				className={clsx(
					"flex items-center gap-2 rounded-xl border bg-base-100 px-3 py-2",
					open ? "border-primary" : "border-base-200",
				)}>
				<input
					value={open ? query : (selected?.label ?? "")}
					placeholder="Chọn grease..."
					onChange={(e) => handleInputChange(e.target.value)}
					onFocus={handleFocus}
					onBlur={handleBlur}
					className="flex-1 text-sm bg-transparent outline-none"
				/>
				{selected && selected.price_adjustment > 0 ? (
					<span className="text-[11px] text-on-surface-variant whitespace-nowrap">
						+{formatVND(selected.price_adjustment)}/switch
					</span>
				) : null}
			</div>
			{open && filtered.length > 0 ? (
				<div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl border border-base-200 bg-base-100 shadow-lg overflow-auto max-h-48">
					{filtered.map((v) => (
						<button
							key={v.id}
							type="button"
							onMouseDown={() => {
								onSelect(v.id);
								handleSelect();
							}}
							className={clsx(
								"w-full px-3 py-2 text-left text-[11px] flex items-center justify-between",
								selectedValueId === v.id
									? "bg-primary/10 text-primary font-semibold"
									: "hover:bg-surface-container",
							)}>
							<span>{v.label}</span>
							{v.price_adjustment > 0 ? (
								<span className="opacity-60">
									+{formatVND(v.price_adjustment)}/switch
								</span>
							) : null}
						</button>
					))}
				</div>
			) : null}
		</div>
	);
}
