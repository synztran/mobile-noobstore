"use client";

import { formatVND } from "@/lib/currency";
import { memo, useRef } from "react";

const PRICE_MAX_LIMIT = 10_000_000;
const PRICE_STEP = 100_000;

interface DualRangeSliderProps {
	min: number;
	max: number;
	onChange: (min: number, max: number) => void;
}

export const DualRangeSlider = memo(function DualRangeSlider({
	min,
	max,
	onChange,
}: DualRangeSliderProps) {
	const trackRef = useRef<HTMLDivElement>(null);
	const dragging = useRef<"min" | "max" | null>(null);

	const effectiveMax = max === 0 ? PRICE_MAX_LIMIT : max;
	const leftPct = (min / PRICE_MAX_LIMIT) * 100;
	const rightPct = (effectiveMax / PRICE_MAX_LIMIT) * 100;

	const snapToStep = (raw: number) =>
		Math.round(raw / PRICE_STEP) * PRICE_STEP;

	const valueFromPointer = (e: React.PointerEvent) => {
		const rect = trackRef.current!.getBoundingClientRect();
		const pct = Math.max(
			0,
			Math.min(1, (e.clientX - rect.left) / rect.width),
		);
		return snapToStep(pct * PRICE_MAX_LIMIT);
	};

	const handlePointerDown = (e: React.PointerEvent) => {
		const val = valueFromPointer(e);
		const distMin = Math.abs(val - min);
		const distMax = Math.abs(val - effectiveMax);
		dragging.current = distMin <= distMax ? "min" : "max";
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	};

	const handlePointerMove = (e: React.PointerEvent) => {
		if (!dragging.current) return;
		const val = valueFromPointer(e);
		if (dragging.current === "min") {
			const newMin = Math.min(val, effectiveMax - PRICE_STEP);
			onChange(Math.max(0, newMin), max);
		} else {
			const raw = Math.max(val, min + PRICE_STEP);
			const newMax = raw >= PRICE_MAX_LIMIT ? 0 : raw;
			onChange(min, newMax);
		}
	};

	const handlePointerUp = () => {
		dragging.current = null;
	};

	return (
		<div className="space-y-2">
			{/* Price labels */}
			<div className="flex justify-between items-center">
				<div className="bg-surface-container rounded-xl px-2.5 py-1 text-center min-w-[88px]">
					<p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
						Từ
					</p>
					<p className="text-sm font-black text-primary">
						{min === 0 ? "0₫" : formatVND(min)}
					</p>
				</div>
				<div className="w-4 h-px bg-outline-variant" />
				<div className="bg-surface-container rounded-xl px-2.5 py-1 text-center min-w-[88px]">
					<p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
						Đến
					</p>
					<p className="text-sm font-black text-primary">
						{max === 0 ? "Không giới hạn" : formatVND(max)}
					</p>
				</div>
			</div>

			{/* Track */}
			<div
				ref={trackRef}
				className="relative h-7 flex items-center select-none touch-none cursor-pointer"
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onPointerCancel={handlePointerUp}>
				{/* Background track */}
				<div className="absolute left-0 right-0 h-1.5 bg-surface-container-high rounded-full" />
				{/* Active range highlight */}
				<div
					className="absolute h-1.5 bg-primary rounded-full pointer-events-none"
					style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
				/>
				{/* Min handle */}
				<div
					className="absolute w-5 h-5 bg-white border-2 border-primary rounded-full shadow-md pointer-events-none -translate-x-1/2"
					style={{ left: `${leftPct}%` }}
				/>
				{/* Max handle */}
				<div
					className="absolute w-5 h-5 bg-white border-2 border-primary rounded-full shadow-md pointer-events-none -translate-x-1/2"
					style={{ left: `${rightPct}%` }}
				/>
			</div>

			{/* Tick labels */}
			<div className="flex justify-between text-[9px] font-bold text-on-surface-variant uppercase tracking-wider px-0.5">
				<span>0₫</span>
				<span>2.5tr</span>
				<span>5tr</span>
				<span>7.5tr</span>
				<span>10tr+</span>
			</div>
		</div>
	);
});
