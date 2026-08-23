"use client";

import { ProductThumbnailStrip } from "@/components/product/ProductThumbnailStrip";
import Icon from "@/components/ui/Icon";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { SaleCountdown } from "@/components/product/SaleCountdown";

interface HeroImageGalleryProps {
  images: string[];
  productName: string;
  activeIndex: number;
  onSelect: (index: number) => void;
  hasDiscount: boolean;
  discountPercent: number;
  saleEndsAt?: string | null;
  onImageClick: () => void;
}

export function HeroImageGallery({
  images,
  productName,
  activeIndex,
  onSelect,
  hasDiscount,
  discountPercent,
  saleEndsAt,
  onImageClick,
}: HeroImageGalleryProps) {
  const touchStartX = useRef<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  const heroImage = images[activeIndex] ?? null;

  useEffect(() => {
    setLoaded(false);
  }, [activeIndex]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const delta = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(delta) > 40) {
        onSelect(
          (activeIndex + (delta < 0 ? 1 : -1) + images.length) % images.length
        );
      }
      touchStartX.current = null;
    },
    [activeIndex, images.length, onSelect]
  );

  return (
    <section
      className="relative space-y-3 p-4"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative h-80 w-full overflow-hidden rounded-2xl bg-surface-container-low shadow-ambient-sm">
        <button
          type="button"
          aria-label="Xem ảnh sản phẩm"
          onClick={onImageClick}
          className="relative h-full w-full"
        >
          {!loaded && heroImage && (
            <div className="absolute inset-0 animate-pulse bg-surface-container-high" />
          )}
          {heroImage ? (
            <Image
              src={heroImage}
              alt={productName}
              fill
              className={`object-cover mix-blend-multiply transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
              onLoad={() => setLoaded(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon
                name="inventory_2"
                className="text-9xl text-outline-variant opacity-40"
              />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent" />
          {images.length > 0 && (
            <div
              aria-hidden="true"
              className="absolute bottom-2 right-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm"
            >
              {activeIndex + 1}/{images.length}
            </div>
          )}
          {hasDiscount && (
            <div
              aria-hidden="true"
              className="absolute right-3 top-3 rounded-md bg-red-500 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg"
            >
              -{discountPercent}%
            </div>
          )}
          {saleEndsAt && (
            <div className="absolute left-3 top-3" aria-hidden="true">
              <SaleCountdown endsAt={saleEndsAt} />
            </div>
          )}
        </button>
      </div>
      <ProductThumbnailStrip
        images={images}
        activeIndex={activeIndex}
        onSelect={onSelect}
        productName={productName}
      />
    </section>
  );
}
