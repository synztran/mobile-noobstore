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
        "flex w-max items-center gap-2 rounded-xl border border-outline-variant/20 bg-surface-container-low p-2",
        maxW && "max-w-max"
      )}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, (value ?? min) - 1))}
        className="flex h-6 w-6 items-center justify-center rounded-full text-on-surface transition-colors hover:bg-surface-container-high"
      >
        <Minus size={12} />
      </button>
      <input
        type="number"
        min={min}
        value={value ?? ""}
        placeholder="0"
        onChange={(e) => onChange(parseInt(e.target.value, 10) || undefined)}
        className="w-10 bg-transparent text-center text-sm font-black outline-none"
      />
      <button
        type="button"
        onClick={() => onChange((value ?? 0) + 1)}
        className="flex h-6 w-6 items-center justify-center rounded-full text-on-surface transition-colors hover:bg-surface-container-high"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}
