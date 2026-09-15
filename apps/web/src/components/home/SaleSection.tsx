"use client";

import { useHomeSaleProducts } from "@/lib/react-query/home/api/useHomeQueries";
import { ArrowRight } from "lucide-react";
import Image from "@/components/ui/AdaptiveImage";
import Link from "next/link";
import { useState } from "react";
import { ICON_SALE } from "@/lib/images";
import { useDragScroll } from "@/hooks/useDragScroll";
import {
  BundleProductCard,
  BundleProductCardSkeleton,
} from "./BundleProductCard";

const CATEGORIES = [
  { label: "TẤT CẢ", slug: "" },
  { label: "BÀN PHÍM", slug: "keyboards" },
  { label: "SWITCH", slug: "switches" },
  { label: "PHỤ KIỆN", slug: "accessories" },
  { label: "GIÀY", slug: "sneakers" },
];

const SORTS = [
  { label: "Giảm nhiều", value: "discount_desc" },
  { label: "Giá thấp", value: "price_asc" },
  { label: "Giá cao", value: "price_desc" },
  { label: "Mới nhất", value: "newest" },
] as const;

export function HomeSaleSection() {
  const [activeCategory, setActiveCategory] = useState("");
  const [sort, setSort] = useState("discount_desc");
  const { data, isLoading } = useHomeSaleProducts(activeCategory, 5, sort);
  const products = data?.products ?? [];
  const railRef = useDragScroll<HTMLDivElement>();

  return (
    <section className="bg-surface lg:rounded-3xl lg:p-8">
      <style>
        {`
          @keyframes sale-shimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          @keyframes sale-pop {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
          }
        `}
      </style>

      {/* Header */}
      <div className="mb-2 flex items-center justify-between px-6 lg:px-0">
        <div className="flex items-center gap-1">
          <div
            className="relative h-7 w-7"
            style={{ animation: "sale-pop 1.5s ease-in-out infinite" }}
          >
            <Image
              src={ICON_SALE}
              alt="Sale Icon"
              fill
              sizes="64px"
              className="object-cover drop-shadow-[0_0_6px_rgba(220,38,38,0.5)]"
            />
          </div>
          <div
            className="bg-gradient-to-r from-red-600 via-orange-400 to-red-600 bg-[length:200%_100%] bg-clip-text text-xl font-black uppercase tracking-tight text-transparent"
            style={{ animation: "sale-shimmer 3s linear infinite" }}
          >
            Sản Phẩm Sale
          </div>
        </div>
        <Link
          href="/shop"
          className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-primary transition-all hover:gap-2"
        >
          Xem tất cả
          <ArrowRight size={10} />
        </Link>
      </div>

      {/* Category Pills */}
      <div className="hide-scrollbar mb-3 flex gap-2 overflow-x-auto px-6 pb-1 lg:px-0">
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

      {/* Sort Pills */}
      {/* <div className="hide-scrollbar mb-4 flex gap-2 overflow-x-auto px-6 pb-1">
        {SORTS.map((s) => (
          <button
            key={s.value}
            onClick={() => setSort(s.value)}
            className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all ${
              sort === s.value
                ? "border-primary bg-primary text-on-primary"
                : "border-outline-variant bg-transparent text-on-surface-variant"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div> */}

      {/* Product Carousel */}
      <div
        ref={railRef}
        className="hide-scrollbar flex cursor-grab gap-4 overflow-x-auto px-6 pb-2 active:cursor-grabbing lg:px-0"
      >
        {isLoading
          ? Array.from({ length: 3 }, (_, i) => (
              <BundleProductCardSkeleton key={i} />
            ))
          : products.map((product, i) => (
              <div
                key={product.id}
                className="min-w-[180px] animate-[fadeSlideUp_0.5s_ease-out_forwards] lg:min-w-[220px]"
                style={{ animationDelay: `${i * 60}ms`, opacity: 0 }}
              >
                <BundleProductCard product={product} showSoldOutOverlay />
              </div>
            ))}
        {!isLoading && products.length === 0 && (
          <div className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-5 py-6 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant">
              Không có sản phẩm sale
            </p>
            <p className="mt-2 text-sm font-semibold text-on-surface">
              Hiện chưa có sản phẩm giảm giá trong danh mục này.
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
            href="/shop"
            className="group flex w-[120px] flex-shrink-0 flex-col items-center justify-center gap-3 rounded-2xl bg-surface-container-low transition-colors hover:bg-surface-container lg:w-[160px]"
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
