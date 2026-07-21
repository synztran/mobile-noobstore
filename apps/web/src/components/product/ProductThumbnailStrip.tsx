"use client";

import clsx from "clsx";
import Image from "next/image";

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
          <Image
            src={img}
            alt={`${productName} - ${i + 1}`}
            fill
            className="object-cover"
            sizes="64px"
          />
        </button>
      ))}
    </div>
  );
}
