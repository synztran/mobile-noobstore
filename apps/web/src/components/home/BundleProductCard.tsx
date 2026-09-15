"use client";

import type { ShopProduct } from "@/modules/products/types";
import { formatVND } from "@/lib/currency";
import { ArrowRight } from "lucide-react";
import Image from "@/components/ui/AdaptiveImage";
import Link from "next/link";
import DiscountBadge from "@/modules/products/ui/product/DiscountBadge";
import ProductComponentTags from "@/modules/products/ui/product/ProductComponentTags";
import { ProductTags } from "@/modules/products/ui/product/ProductTags";

interface Props {
  product: ShopProduct;
  showNewBadge?: boolean;
  showSoldOutOverlay?: boolean;
  showComponentTags?: boolean;
}

export function BundleProductCard({
  product,
  showNewBadge,
  showSoldOutOverlay,
  showComponentTags,
}: Props) {
  const isNew = showNewBadge && product.tags?.some((t) => t.value === "new");
  const isSoldOut = showSoldOutOverlay && product.stock_quantity === 0;
  const hasDiscount = product.discount_price && product.discount_price > 0;
  const isPreOrder = product.is_pre_order;
  const isUsed = product.is_used;
  const isBestseller = product.sold_count >= 50;

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group w-[180px] lg:w-[220px] flex-shrink-0 transition-transform active:scale-95"
    >
      <div className="relative mb-2 aspect-[4/3] overflow-hidden rounded-2xl bg-surface-container-high">
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-[5rem] font-black uppercase leading-none text-on-surface/5">
              {product.name.charAt(0)}
            </span>
          </div>
        )}
        {/* <div className="pointer-events-none absolute left-2 top-2 z-10 flex flex-col gap-1">
          <ProductTags
            soldOut={isSoldOut}
            preOrder={isPreOrder}
            used={isUsed}
            isNew={isNew}
            bestseller={isBestseller}
          />
        </div> */}
        {isSoldOut && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-surface/70">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-on-surface-variant">
              Hết hàng
            </p>
          </div>
        )}
        <DiscountBadge discountPercent={product.discount_percentage || 0} />
        {showComponentTags && (
          <ProductComponentTags horizontalTags={product.tags} />
        )}
      </div>
      <p className="truncate text-xs font-extrabold capitalize tracking-[0.1em] text-primary">
        {product.brand || product.category}
      </p>
      <p className="truncate text-sm font-bold capitalize text-on-surface">
        {product.name}
      </p>
      {hasDiscount ? (
        <div className="flex flex-col text-right">
          <span className="text-base font-extrabold text-red-600">
            {formatVND(product.discount_price!)}
          </span>
          <span className="ml-1 text-xs font-bold text-on-surface-variant line-through">
            {formatVND(product.base_price)}
          </span>
        </div>
      ) : product.base_price || product.min_price ? (
        <div className="space-x-1 text-right">
          {/* "Giá chỉ từ" — variant-sourced price: base price is unset and the
              shown amount is only the lowest variant (min_price), so qualify
              it. Mirrors ProductCardPricing's logic. */}
          {!product.base_price && product.min_price ? (
            <span className="break-all text-xs font-bold text-on-surface-variant">
              giá chỉ từ
            </span>
          ) : null}
          <span className="whitespace-nowrap text-base font-extrabold text-primary">
            {formatVND(product.base_price || product.min_price)}
          </span>
        </div>
      ) : (
        <div className="text-right text-xs font-extrabold text-on-surface-variant">
          giá đang cập nhật
        </div>
      )}
    </Link>
  );
}

export function BundleProductCardSkeleton() {
  return (
    <div className="w-[180px] lg:w-[220px] flex-shrink-0 animate-pulse space-y-3">
      <div className="aspect-[4/3] rounded-2xl bg-surface-container" />
      <div className="h-4 w-3/4 rounded bg-surface-container" />
      <div className="h-3 w-1/2 rounded bg-surface-container" />
      <div className="h-4 w-1/3 rounded bg-surface-container" />
    </div>
  );
}
