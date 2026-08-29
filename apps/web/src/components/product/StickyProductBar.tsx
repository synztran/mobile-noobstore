"use client";

import { AddToCartButton } from "@/components/product/AddToCartButton";
import { formatVND } from "@/lib/currency";
import clsx from "clsx";
import Image from "@/components/ui/AdaptiveImage";
import { useEffect, useState } from "react";

interface Props {
  productName: string;
  productThumbnail: string | null;
  displayPrice: number;
  heroRef: React.RefObject<HTMLDivElement | null>;
  isOutOfStock: boolean;
  missingVariantSelection: boolean;
  missingConfiguration: boolean;
  isLoadingAddToCart: boolean;
  isPreOrder: boolean;
  onAddToCart: () => void;
}

export function StickyProductBar({
  productName,
  productThumbnail,
  displayPrice,
  heroRef,
  isOutOfStock,
  missingVariantSelection,
  missingConfiguration,
  isLoadingAddToCart,
  isPreOrder,
  onAddToCart,
}: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = heroRef?.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [heroRef]);

  return (
    <div
      className={clsx(
        "fixed left-0 right-0 top-0 z-[90] flex items-center gap-3 border-b border-outline-variant/20 bg-surface/95 px-4 py-2 backdrop-blur-md transition-transform duration-300",
        visible ? "translate-y-0" : "-translate-y-full"
      )}
      style={{ marginTop: "env(safe-area-inset-top, 0px)" }}
    >
      {productThumbnail && (
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-container">
          <Image
            src={productThumbnail}
            alt=""
            fill
            className="object-cover"
            sizes="40px"
          />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-on-surface">
          {productName}
        </p>
        <p className="text-xs font-black text-primary">
          {formatVND(displayPrice)}
        </p>
      </div>
      <div className="w-28 shrink-0">
        <AddToCartButton
          isOutOfStock={isOutOfStock}
          missingVariantSelection={missingVariantSelection}
          missingConfiguration={missingConfiguration}
          isLoading={isLoadingAddToCart}
          isPreOrder={isPreOrder}
          onClick={onAddToCart}
          className="h-8 rounded-lg text-[10px]"
        />
      </div>
    </div>
  );
}
