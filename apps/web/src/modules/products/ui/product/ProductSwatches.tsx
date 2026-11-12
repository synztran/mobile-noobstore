"use client";

import type { ShopVariant } from "@/modules/products/types";
import Image from "@/components/ui/AdaptiveImage";
import { memo, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const MAX_VISIBLE = 5;

interface ProductSwatchesProps {
  variants: ShopVariant[];
  activeVariantId: string | null;
  onSelect: (variantId: string | null) => void;
  productThumbnail?: string | null;
}

function getColorVariant(variant: ShopVariant): string | null {
  return variant.attributes?.color ?? null;
}

export const ProductSwatches = memo(function ProductSwatches({
  variants,
  activeVariantId,
  onSelect,
  productThumbnail,
}: ProductSwatchesProps) {
  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number } | null>(null);
  const colorVariants = useMemo(() => {
    return variants.filter((v) => getColorVariant(v) !== null);
  }, [variants]);

  if (!colorVariants.length) return null;

  const visible = colorVariants.slice(0, MAX_VISIBLE);
  const overflow = colorVariants.length - MAX_VISIBLE;
  return (
    <div>
      <div className="hide-scrollbar absolute right-0.5 top-2 z-20 flex max-h-max flex-col items-center gap-1 overflow-y-auto rounded-2xl border border-outline-variant/50 bg-surface/95 p-1 shadow-ambient-sm">
        {visible.map((variant) => {
          const color = getColorVariant(variant);
          const isActive = variant.id === activeVariantId;
          const imgSrc = variant.thumbnail ?? productThumbnail;

          return (
            <button
              key={variant.id}
              type="button"
              onPointerEnter={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setTooltip({ name: variant.variant_name, x: rect.left + rect.width / 2, y: rect.top });
              }}
              onPointerLeave={() => setTooltip(null)}
              onFocus={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setTooltip({ name: variant.variant_name, x: rect.left + rect.width / 2, y: rect.top });
              }}
              onBlur={() => setTooltip(null)}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(isActive ? null : variant.id);
              }}
              aria-label={`Chon ${variant.variant_name}`}
              className={`relative h-6 w-6 shrink-0 overflow-hidden rounded-full border-2 transition-all ${
                isActive
                  ? "border-primary ring-2 ring-primary/40"
                  : "border-outline-variant hover:border-primary/70"
              }`}
            >
              {imgSrc ? (
                <Image
                  src={imgSrc}
                  alt={color ?? variant.variant_name}
                  fill
                  className="object-cover"
                  sizes="24px"
                />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{ backgroundColor: color ?? "#ccc" }}
                />
              )}
            </button>
          );
        })}
        {overflow > 0 && (
          <span className="text-[10px] font-bold text-on-surface-variant">
            +{overflow}
          </span>
        )}
      </div>
      {tooltip && typeof document !== "undefined" && createPortal(
        <span
          role="tooltip"
          className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-neutral px-2 py-1 text-xs font-semibold text-neutral-content shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y - 8 }}
        >
          {tooltip.name}
        </span>,
        document.body
      )}
    </div>
  );
});
