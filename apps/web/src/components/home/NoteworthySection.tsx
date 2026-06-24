"use client";

import type { ShopProduct } from "@/app/api/products/route";
import { formatVND } from "@/lib/currency";
import { useHomeNoteworthy } from "@/lib/react-query/home/api/useHomeQueries";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import ProductComponentTags from "../product/ProductComponentTags";
import DiscountBadge from "../product/DiscountBadge";

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
      <div className="relative mb-2 aspect-[4/3] overflow-hidden rounded-2xl bg-surface-container-high">
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.name}
            fill
            className="aspect-video object-cover transition-transform duration-300 group-hover:scale-105"
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
        <DiscountBadge discountPercent={product.discount_percentage || 0} />
        <ProductComponentTags horizontalTags={product.tags} />
      </div>
      <p className="truncate text-xs font-extrabold capitalize tracking-[0.1em] text-primary">
        {product.brand || product.category}
      </p>
      <p className="truncate text-sm font-bold capitalize text-on-surface">
        {product.name}
      </p>
      {product.discount_price && product.discount_price > 0 ? (
        <div>
          <div className="text-right text-base font-extrabold text-red-600">
            {formatVND(product.discount_price)}
          </div>
          <div className="text-right text-xs font-bold text-on-surface-variant line-through">
            {formatVND(product.base_price)}
          </div>
        </div>
      ) : (
        <div className="text-right text-base font-extrabold text-primary">
          {formatVND(product.base_price || product.min_price)}
        </div>
      )}
    </Link>
  );
}

function ProductSkeleton() {
  return (
    <div className="w-[180px] flex-shrink-0 animate-pulse space-y-3">
      <div className="aspect-[4/3] rounded-2xl bg-surface-container" />
      <div className="h-4 w-3/4 rounded bg-surface-container" />
      <div className="h-3 w-1/2 rounded bg-surface-container" />
      <div className="h-4 w-1/3 rounded bg-surface-container" />
    </div>
  );
}

export function NoteworthySection() {
  const [activeCategory, setActiveCategory] = useState("");
  const { data: products = [], isLoading } = useHomeNoteworthy(activeCategory);

  const shopHref = activeCategory
    ? `/shop?category=${activeCategory}`
    : "/shop";
  const activeCategoryLabel =
    CATEGORIES.find((cat) => cat.slug === activeCategory)?.label ??
    "BỘ LỌC HIỆN TẠI";

  return (
    <section className="bg-surface">
      <style>
        {`
          @keyframes float-subtle {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
          @keyframes underline-grow {
            0% { transform: scaleX(0); }
            100% { transform: scaleX(1); }
          }
          @keyframes letter-reveal {
            0% { opacity: 0; transform: translateY(4px); }
            100% { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>

      {/* Header */}
      <div className="mb-2 flex items-baseline justify-between px-6">
        <div
          className="relative"
          style={{ animation: "float-subtle 4s ease-in-out infinite" }}
        >
          <div className="flex items-center gap-1">
            <span className="inline-flex">
              {"Sản Phẩm Nổi Bật".split("").map((char, i) => (
                <span
                  key={i}
                  className="inline-block text-xl font-black uppercase tracking-tight text-on-surface"
                  style={{
                    animation: `letter-reveal 0.6s ease-out ${i * 0.04}s forwards`,
                    opacity: 0,
                  }}
                >
                  {char === " " ? "\u00A0" : char}
                </span>
              ))}
            </span>
          </div>
          <div
            className="mt-1 h-0.5 w-full rounded-full bg-gradient-to-r from-transparent via-primary to-transparent"
            style={{
              animation: "underline-grow 0.8s ease-out forwards",
              transformOrigin: "center",
            }}
          />
        </div>
        <Link
          href={shopHref}
          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary transition-all hover:gap-2"
        >
          Xem tất cả
          <ArrowRight size={10} />
        </Link>
      </div>

      {/* Category Pills */}
      <div className="hide-scrollbar mb-4 flex gap-2 overflow-x-auto px-6 pb-1">
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
          : products.map((product, i) => (
              <div
                key={product.id}
                className="animate-[fadeSlideUp_0.5s_ease-out_forwards]"
                style={{ animationDelay: `${i * 60}ms`, opacity: 0 }}
              >
                <ProductCard product={product} />
              </div>
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
