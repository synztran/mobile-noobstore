"use client";

import clsx from "clsx";
import { Minus, Plus } from "lucide-react";

export interface QuantityStepperProps {
	value: number | undefined;
	onChange: (val: number | undefined) => void;
	unit: string;
	min?: number;
	maxW?: boolean;
}

export function QuantityStepper({
	value,
	onChange,
	unit: _unit,
	min = 1,
	maxW = false,
}: QuantityStepperProps) {
	return (
		<div
			className={clsx(
				"flex items-center gap-2 rounded-xl border border-base-200 bg-base-100 px-3 py-2 max-w-max",
				maxW && "max-w-max",
			)}>
			<button
				type="button"
				onClick={() => onChange(Math.max(min, (value ?? min) - 1))}
				className="btn btn-ghost btn-xs rounded-full min-w-6 px-0">
				<Minus size={12} />
			</button>
			<input
				type="number"
				min={min}
				value={value ?? ""}
				placeholder="0"
				onChange={(e) =>
					onChange(parseInt(e.target.value, 10) || undefined)
				}
				className="w-10 text-center text-sm font-black bg-transparent outline-none"
			/>
			<button
				type="button"
				onClick={() => onChange((value ?? 0) + 1)}
				className="btn btn-ghost btn-xs rounded-full min-w-6 px-0">
				<Plus size={12} />
			</button>
		</div>
	);
}
