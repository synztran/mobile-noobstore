"use client";

import type { ShopVariant } from "@/modules/products/types";
import Image from "@/components/ui/AdaptiveImage";
import { memo, useMemo } from "react";

const MAX_VISIBLE = 5;

interface ProductSwatchesProps {
  variants: ShopVariant[];
  activeVariantId: string | null;
  onSelect: (variantId: string | null) => void;
  productThumbnail?: string | null;
  layout?: "horizontal" | "vertical";
}

function getColorVariant(variant: ShopVariant): string | null {
  return variant.attributes?.color ?? null;
}

export const ProductSwatches = memo(function ProductSwatches({
  variants,
  activeVariantId,
  onSelect,
  productThumbnail,
  layout = "horizontal",
}: ProductSwatchesProps) {
  const colorVariants = useMemo(() => {
    return variants.filter((v) => getColorVariant(v) !== null);
  }, [variants]);

  if (!colorVariants.length) return null;

  const visible = colorVariants.slice(0, MAX_VISIBLE);
  const overflow = colorVariants.length - MAX_VISIBLE;
  const activeVariant = activeVariantId
    ? colorVariants.find((variant) => variant.id === activeVariantId)
    : null;
  return (
    <div>
      <div className={layout === "vertical" ? "hide-scrollbar absolute right-0.5 top-2 z-20 flex max-h-max flex-col items-center gap-1 overflow-y-auto rounded-2xl border border-outline-variant/50 bg-surface/95 p-1 shadow-ambient-sm" : "hide-scrollbar flex items-center gap-1.5 overflow-x-auto px-0.5 py-2"}>
        {visible.map((variant) => {
          const color = getColorVariant(variant);
          const isActive = variant.id === activeVariantId;
          const imgSrc = variant.thumbnail ?? productThumbnail;

          return (
            <button
              key={variant.id}
              type="button"
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
      {layout === "horizontal" && activeVariant && (
        <p className="truncate text-xs text-on-surface lg:text-sm">
          {activeVariant.variant_name}
        </p>
      )}
    </div>
  );
});
