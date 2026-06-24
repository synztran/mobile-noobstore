"use client";

import type { ShopProduct } from "@/app/api/products/route";
import Icon from "@/components/ui/Icon";
import WishlistButton from "@/components/wishlist/WishlistButton";
import { formatVND } from "@/lib/currency";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import ProductComponentTags from "./ProductComponentTags";
import { QuickPickDrawer } from "./QuickPickDrawer";
import { StockIndicator } from "./StockIndicator";
import DiscountBadge from "./DiscountBadge";

// ─── Skeleton ─────────────────────────────────────────────────────────

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-3 aspect-[4/5] rounded-xl bg-surface-container" />
      <div className="space-y-1.5">
        <div className="h-2 w-1/3 rounded-full bg-surface-container" />
        <div className="h-3 w-4/5 rounded-full bg-surface-container" />
        <div className="h-3 w-2/5 rounded-full bg-surface-container" />
      </div>
    </div>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────

interface ProductCardProps {
  product: ShopProduct;
  isBundle?: boolean;
}

export function ProductCard({ product, isBundle = false }: ProductCardProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDrawerOpen(true);
  };

  return (
    <>
      <div className="group relative flex flex-col justify-between gap-2">
        <Link href={`/shop/${product.slug}`} className="block">
          {/* ── Image box ─────────────────────────────────────────────── */}
          <div
            className="relative mb-1 aspect-[1/1] overflow-hidden rounded-md bg-surface-container"
            style={{
              boxShadow: "0 20px 40px -15px rgba(155,63,28,0.08)",
            }}
          >
            {/* Thumbnail or placeholder */}
            {product.thumbnail ? (
              <Image
                src={product.thumbnail}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Icon
                  name="inventory_2"
                  className="text-5xl text-outline-variant"
                />
              </div>
            )}

            {/* Variants badge */}
            {/* {product.variants.length > 0 && (
							<span className="absolute top-3 left-3 z-10 text-[10px] font-black px-2.5 py-1 rounded tracking-tighter bg-surface-container-lowest text-on-surface">
								{product.variants.length} option
								{product.variants.length > 1 ? "s" : ""}
							</span>
						)} */}
            <DiscountBadge discountPercent={product.discount_percentage || 0} />
            <ProductComponentTags horizontalTags={product?.tags} />

            {!product.stock_quantity && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-surface/70">
                <p className="text-sm font-black uppercase tracking-[0.15em] text-on-surface-variant">
                  Hết hàng
                </p>
              </div>
            )}
          </div>

          {/* ── Details ─────────────────────────────────────────────── */}
          <div className="relative">
            <p className="truncate text-[11px] font-extrabold capitalize tracking-[0.1em] text-primary">
              {product.brand || product.category}
            </p>
            <h3 className="truncate text-sm font-bold capitalize text-on-surface">
              {product.name}
            </h3>
            {!isBundle ? (
              <p className="line-clamp-3 text-[10px] tracking-wide">
                {product.description}
              </p>
            ) : null}
            {product.discount_price && product.discount_price > 0 ? (
              <div>
                <div className="text-right text-base font-extrabold text-red-600">
                  {formatVND(product.discount_price)}
                </div>
                {!isBundle ? (
                  <div className="text-right text-xs font-bold text-on-surface-variant line-through">
                    {formatVND(product.base_price)}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-right text-base font-extrabold text-primary">
                {formatVND(product.base_price || product.min_price)}
              </div>
            )}
          </div>
        </Link>

        <div className="flex flex-col gap-0.5">
          <StockIndicator stockQuantity={product.stock_quantity} />
          <div className="mt-auto flex items-center gap-1">
            <WishlistButton
              productId={product.id}
              size="sm"
              showLabel
              className="w-[32px] rounded-xl"
            />
            <button
              type="button"
              onClick={handleQuickAdd}
              aria-label={`Quick add ${product.name}`}
              disabled={product.stock_quantity === 0}
              className="btn-sm flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-[10px] font-black uppercase tracking-[0.14em] text-surface transition-all hover:bg-on-surface/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-on-surface/50 disabled:text-surface/50"
            >
              <Icon name="add_shopping_cart" className="text-[16px]" />
              Mua ngay
            </button>
          </div>
        </div>
      </div>

      <QuickPickDrawer
        product={product}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
