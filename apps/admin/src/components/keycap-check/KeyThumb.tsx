"use client";

import { useEffect, useRef } from "react";

import { drawKeyCrop } from "@/lib/keycap-check/crop";
import type { DetectedKey } from "@/lib/keycap-check/types";

interface KeyThumbProps {
  source: HTMLCanvasElement | null;
  item: DetectedKey;
  caption: string;
  size?: number;
  highlighted?: boolean;
}

export default function KeyThumb({
  source,
  item,
  caption,
  size = 64,
  highlighted = false,
}: KeyThumbProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (ref.current && source) {
      drawKeyCrop(ref.current, source, item, size);
    }
  }, [source, item, size]);

  return (
    <figure className="flex w-[72px] shrink-0 flex-col items-center gap-1">
      <canvas
        ref={ref}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className={`rounded-md ring-1 ${
          highlighted ? "ring-2 ring-amber-400" : "ring-slate-200"
        }`}
      />
      <figcaption className="w-full text-center text-[10px] leading-tight text-slate-600">
        {caption}
      </figcaption>
    </figure>
  );
}
