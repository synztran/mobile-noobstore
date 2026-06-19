"use client";

import type { ShopProduct } from "@/app/api/products/route";
import { formatVND } from "@/lib/currency";
import { useHomeNoteworthy } from "@/lib/react-query/home/api/useHomeQueries";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const CATEGORIES = [
  { label: "MỚI NHẤT", slug: "" },
  { label: "BÀN PHÍM", slug: "keyboards" },
  { label: "SWITCH", slug: "switches" },
  { label: "PHỤ KIỆN", slug: "accessories" },
  { label: "GIÀY", slug: "sneakers" },
];

function ProductCard({ product }: { product: ShopProduct }) {
  const isNew = product.tags?.some((t) => t.value === "new");
  const isSoldOut = product.stock_quantity === 0;

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
        {isNew && !isSoldOut && (
          <div className="absolute left-3 top-3 rounded-md bg-primary px-2 py-1 text-[8px] font-black uppercase tracking-widest text-on-primary">
            MỚI
          </div>
        )}
        {isSoldOut && (
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
      <p className="text-right text-sm font-extrabold text-primary">
        {formatVND(product.base_price)}
      </p>
    </Link>
  );
}

function ProductSkeleton() {
  return (
    <div className="w-[180px] flex-shrink-0 animate-pulse space-y-3">
      <div className="aspect-square rounded-2xl bg-surface-container" />
      <div className="h-4 w-3/4 rounded bg-surface-container" />
      <div className="h-3 w-1/2 rounded bg-surface-container" />
      <div className="h-4 w-1/3 rounded bg-surface-container" />
    </div>
  );
}

export function NoteworthySection() {
  const [activeCategory, setActiveCategory] = useState("");

  const { data: products = [], isLoading } = useHomeNoteworthy(activeCategory);

  console.log("products", products);

  const shopHref = activeCategory
    ? `/shop?category=${activeCategory}`
    : "/shop";
  const activeCategoryLabel =
    CATEGORIES.find((cat) => cat.slug === activeCategory)?.label ??
    "BỘ LỌC HIỆN TẠI";

  return (
    <section className="bg-surface py-12">
      {/* Header */}
      <div className="mb-6 flex items-baseline justify-between px-6">
        <h2 className="text-2xl font-black uppercase tracking-tight">
          Sản Phẩm Nổi Bật
        </h2>
        <Link
          href={shopHref}
          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary transition-all hover:gap-2"
        >
          Xem tất cả
          <ArrowRight size={10} />
        </Link>
      </div>

      {/* Category Pills */}
      <div className="hide-scrollbar mb-8 flex gap-2 overflow-x-auto px-6 pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => setActiveCategory(cat.slug)}
            className={`flex-shrink-0 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
              activeCategory === cat.slug
                ? "border-on-surface bg-on-surface text-surface"
                : "border-outline-variant bg-transparent text-on-surface-variant"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Product Carousel */}
      <div className="hide-scrollbar flex gap-4 overflow-x-auto px-6 pb-2">
        {isLoading
          ? Array.from({ length: 3 }, (_, i) => <ProductSkeleton key={i} />)
          : products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
        {!isLoading && products.length === 0 && (
          <div className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-5 py-6 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant">
              Không có sản phẩm phù hợp
            </p>
            <p className="mt-2 text-sm font-semibold text-on-surface">
              Hiện chưa có sản phẩm cho {activeCategoryLabel}.
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
        {!isLoading && products.length > 0 && (
          <Link
            href={shopHref}
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
