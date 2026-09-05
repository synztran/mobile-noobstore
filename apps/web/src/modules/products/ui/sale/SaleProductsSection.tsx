"use client";

import type { ShopProduct } from "@/modules/products/types";
import { formatVND } from "@/lib/currency";
import { ArrowRight } from "lucide-react";
import Image from "@/components/ui/AdaptiveImage";
import Link from "next/link";
import { useHomeSaleProducts } from "@/lib/react-query/home/api/useHomeQueries";
import { SaleCountdown } from "@/modules/products/ui/product/SaleCountdown";

function SaleProductCard({ product }: { product: ShopProduct }) {
  // Calculate discount percentage
  const discountVariant = product.variants.find(
    (variant) => variant.price_adjustment < 0
  );
  const discountPercent =
    discountVariant && product.base_price > 0
      ? Math.round(
          Math.abs(discountVariant.price_adjustment) / product.base_price
        )
      : 0;

  const originalPrice = product.base_price;
  const salePrice = product.min_price;
  const discountAmount = originalPrice - salePrice;

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group w-[180px] flex-shrink-0 transition-transform active:scale-95"
    >
      <div className="relative mb-3 aspect-square overflow-hidden rounded-2xl bg-surface-container-high">
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="180px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-[5rem] font-black uppercase leading-none text-on-surface/5">
              {product.name.charAt(0)}
            </span>
          </div>
        )}

        {/* Discount badge */}
        {discountPercent > 0 && (
          <div className="absolute left-3 top-3 rounded-md bg-red-500 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-white">
            -{discountPercent}%
          </div>
        )}

        {/* Flash sale countdown */}
        {product.sale_ends_at &&
          new Date(product.sale_ends_at).getTime() > Date.now() && (
            <div className="absolute bottom-3 left-3">
              <SaleCountdown endsAt={product.sale_ends_at} />
            </div>
          )}

        {/* Sold out overlay */}
        {product.stock_quantity === 0 && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-surface/70">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-on-surface-variant">
              Hết hàng
            </p>
          </div>
        )}
      </div>

      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
        {product.category}
      </p>
      <h4 className="line-clamp-2 min-h-[35px] text-sm font-bold uppercase leading-tight tracking-tight">
        {product.name}
      </h4>

      {/* Price display with discount */}
      <div className="mt-1 space-y-0.5">
        {discountPercent > 0 && (
          <p className="text-xs font-bold text-on-surface-variant/70 line-through">
            {formatVND(originalPrice)}
          </p>
        )}
        <p
          className={`font-extrabold ${discountPercent > 0 ? "text-red-500" : "text-primary"} text-sm`}
        >
          {formatVND(salePrice)}
        </p>
        {discountPercent > 0 && (
          <p className="text-[9px] font-semibold text-green-600">
            Tiết kiệm {formatVND(discountAmount)}
          </p>
        )}
      </div>
    </Link>
  );
}

function SaleProductSkeleton() {
  return (
    <div className="w-[180px] flex-shrink-0 animate-pulse space-y-3">
      <div className="aspect-square rounded-2xl bg-surface-container" />
      <div className="h-4 w-3/4 rounded bg-surface-container" />
      <div className="h-3 w-1/2 rounded bg-surface-container" />
      <div className="h-4 w-1/3 rounded bg-surface-container" />
    </div>
  );
}

export function SaleProductsSection() {
  const { data, isLoading } = useHomeSaleProducts("", 8, "discount_desc");

  return (
    <section className="bg-surface py-12">
      {/* Header */}
      <div className="mb-6 flex items-baseline justify-between px-6">
        <h2 className="text-2xl font-black uppercase tracking-tight">
          Sản Phẩm Giảm Giá
        </h2>
        <Link
          href="/shop"
          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary transition-all hover:gap-2"
        >
          Xem tất cả
          <ArrowRight size={10} />
        </Link>
      </div>

      {/* Product Carousel */}
      <div className="hide-scrollbar flex gap-4 overflow-x-auto px-6 pb-2">
        {isLoading
          ? Array.from({ length: 3 }, (_, i) => <SaleProductSkeleton key={i} />)
          : data?.products.map((product) => (
              <SaleProductCard key={product.id} product={product} />
            ))}
        {!isLoading && data?.products.length === 0 && (
          <div className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-5 py-6 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant">
              Không có sản phẩm giảm giá
            </p>
            <p className="mt-2 text-sm font-semibold text-on-surface">
              Hiện chưa có sản phẩm giảm giá.
            </p>
            <Link
              href="/shop"
              className="mt-4 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary transition-all hover:gap-2"
            >
              Xem toàn bộ cửa hàng
              <ArrowRight size={10} />
            </Link>
          </div>
        )}
        {!isLoading && data?.products && data.products.length > 0 && (
          <Link
            href="/shop"
            className="group flex w-[120px] flex-shrink-0 flex-col items-center justify-center gap-3 rounded-2xl bg-surface-container-low transition-colors hover:bg-surface-container"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
              <ArrowRight size={18} className="text-primary" />
            </div>
            <p className="px-2 text-center text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
              Xem tất cả
            </p>
          </Link>
        )}
      </div>
    </section>
  );
}
