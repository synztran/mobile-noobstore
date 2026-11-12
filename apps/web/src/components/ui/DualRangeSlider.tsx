"use client";

import { formatShortVND } from "@/lib/currency";
import { Infinity as InfinityIcon } from "lucide-react";
import { memo, useRef } from "react";

const PRICE_MAX_LIMIT = 10_000_000;
const PRICE_STEP = 100_000;

interface DualRangeSliderProps {
  min: number;
  max: number;
  onChange: (min: number, max: number) => void;
  desktop?: boolean;
}

export const DualRangeSlider = memo(function DualRangeSlider({
  min,
  max,
  onChange,
  desktop = false,
}: DualRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"min" | "max" | null>(null);

  const effectiveMax = max === 0 ? PRICE_MAX_LIMIT : max;
  const leftPct = (min / PRICE_MAX_LIMIT) * 100;
  const rightPct = (effectiveMax / PRICE_MAX_LIMIT) * 100;

  const snapToStep = (raw: number) => Math.round(raw / PRICE_STEP) * PRICE_STEP;

  const valueFromPointer = (e: React.PointerEvent) => {
    const rect = trackRef.current!.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
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
    <div className={desktop ? "space-y-3 px-1" : "space-y-2 px-4"}>
      {/* Price labels */}
      <div
        className={`flex items-center ${desktop ? "gap-2" : "justify-between"}`}
      >
        <div
          className={`flex min-h-[3.5rem] min-w-0 flex-1 flex-col justify-center rounded-xl bg-surface-container px-2.5 py-1 text-center ${desktop ? "" : "min-w-[88px]"}`}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Từ
          </p>
          <p className="text-sm font-black tabular-nums leading-5 text-primary">
            {min === 0 ? "0₫" : formatShortVND(min)}
          </p>
        </div>
        <div className="h-px w-3 shrink-0 bg-outline-variant" />
        <div
          className={`flex min-h-[3.5rem] min-w-0 flex-1 flex-col justify-center rounded-xl bg-surface-container px-2.5 py-1 text-center ${desktop ? "" : "min-w-[88px]"}`}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Đến
          </p>
          <p className="flex h-5 items-center justify-center text-sm font-black tabular-nums leading-5 text-primary">
            {max === 0 ? (
              <InfinityIcon aria-label="Không giới hạn" role="img" size={18} />
            ) : (
              formatShortVND(max)
            )}
          </p>
        </div>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className={`relative flex touch-none select-none items-center ${desktop ? "h-9 cursor-pointer" : "h-7 cursor-pointer"}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Background track */}
        <div className="absolute left-0 right-0 h-1.5 rounded-full bg-surface-container-high" />
        {/* Active range highlight */}
        <div
          className="pointer-events-none absolute h-1.5 rounded-full bg-primary"
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />
        {/* Min handle */}
        <div
          className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 rounded-full border-2 border-primary bg-white shadow-md"
          style={{ left: `${leftPct}%` }}
        />
        {/* Max handle */}
        <div
          className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 rounded-full border-2 border-primary bg-white shadow-md"
          style={{ left: `${rightPct}%` }}
        />
      </div>

      {/* Tick labels */}
      <div className="flex justify-between px-0.5 text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">
        <span>0₫</span>
        <span>2.5tr</span>
        <span>5tr</span>
        <span>7.5tr</span>
        <span>10tr+</span>
      </div>
    </div>
  );
});
