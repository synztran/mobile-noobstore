"use client";

import clsx from "clsx";
import Image from "@/components/ui/AdaptiveImage";
import Icon from "@/components/ui/Icon";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const count = images.length;

  const goTo = useCallback(
    (delta: 1 | -1) => {
      onSelect((activeIndex + delta + count) % count);
    },
    [activeIndex, count, onSelect]
  );

  // Keep active thumb in view when index changes
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const active = container.querySelector(`[data-index="${activeIndex}"]`) as
      | HTMLElement
      | undefined;
    if (active) {
      const offset =
        active.offsetLeft - container.offsetWidth / 2 + active.offsetWidth / 2;
      container.scrollTo({ left: offset, behavior: "smooth" });
    }
  }, [activeIndex]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - (touchStartY.current ?? 0);
      // Horizontal-dominant swipe → next/prev
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        goTo(dx < 0 ? 1 : -1);
      }
      touchStartX.current = null;
      touchStartY.current = null;
    },
    [goTo]
  );

  if (count <= 1) return null;

  return (
    <div className="relative flex items-center gap-1 px-4">
      {/* Previous */}
      <button
        type="button"
        aria-label="Ảnh trước"
        onClick={() => goTo(-1)}
        className="absolute left-0 top-1/2 z-10 flex h-8 w-8 shrink-0 !-translate-y-1/2 items-center justify-center rounded-full border bg-surface-container text-on-surface shadow-lg transition-all active:scale-90"
      >
        <ChevronLeft size={14} />
      </button>

      {/* Scrollable thumbnail strip */}
      <div
        ref={scrollRef}
        className="hide-scrollbar flex flex-1 gap-2 overflow-x-auto py-0.5"
        style={{ touchAction: "pan-y" }}
        onTouchStart={(e) => {
          handleTouchStart(e);
          e.stopPropagation();
        }}
        onTouchEnd={(e) => {
          handleTouchEnd(e);
          e.stopPropagation();
        }}
      >
        {images.map((img, i) => (
          <button
            key={`${img}-${i}`}
            data-index={i}
            type="button"
            onClick={() => onSelect(i)}
            className={clsx(
              "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all",
              i === activeIndex
                ? "border-primary shadow-ambient-sm"
                : "border-transparent opacity-60 hover:opacity-100"
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
                loaded[i] ? "opacity-100" : "opacity-0"
              )}
              sizes="64px"
              onLoad={() => setLoaded((prev) => ({ ...prev, [i]: true }))}
            />
          </button>
        ))}
      </div>

      {/* Next */}
      <button
        type="button"
        aria-label="Ảnh tiếp theo"
        onClick={() => goTo(1)}
        className="active:scale-9 absolute right-0 top-1/2 flex h-8 w-8 !-translate-y-1/2 items-center justify-center rounded-full border bg-surface-container text-on-surface shadow-sm transition-all"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
