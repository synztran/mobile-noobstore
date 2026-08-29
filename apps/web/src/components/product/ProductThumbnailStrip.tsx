"use client";

import clsx from "clsx";
import Image from "@/components/ui/AdaptiveImage";
import { useState } from "react";

interface Props {
  images: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
  productName: string;
}

export function ProductThumbnailStrip({
  images,
  activeIndex,
  onSelect,
  productName,
}: Props) {
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});

  if (images.length <= 1) return null;

  return (
    <div className="hide-scrollbar flex gap-2 overflow-x-auto px-4">
      {images.map((img, i) => (
        <button
          key={`${img}-${i}`}
          type="button"
          onClick={() => onSelect(i)}
          className={clsx(
            "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all active:scale-90",
            i === activeIndex
              ? "border-primary shadow-ambient-sm"
              : "border-transparent opacity-60 hover:opacity-100",
          )}
        >
          {!loaded[i] && (
            <div className="absolute inset-0 animate-pulse bg-surface-container-high" />
          )}
          <Image
            src={img}
            alt={`${productName} - ${i + 1}`}
            fill
            className={clsx(
              "object-cover transition-opacity duration-300",
              loaded[i] ? "opacity-100" : "opacity-0",
            )}
            sizes="64px"
            onLoad={() => setLoaded((prev) => ({ ...prev, [i]: true }))}
          />
        </button>
      ))}
    </div>
  );
}
