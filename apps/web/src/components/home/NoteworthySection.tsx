"use client";

import { useHomeNoteworthy } from "@/lib/react-query/home/api/useHomeQueries";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { useDragScroll } from "@/hooks/useDragScroll";
import {
  BundleProductCard,
  BundleProductCardSkeleton,
} from "./BundleProductCard";
const CATEGORIES = [
  { label: "MỚI NHẤT", slug: "" },
  { label: "BÀN PHÍM", slug: "keyboards" },
  { label: "SWITCH", slug: "switches" },
  { label: "PHỤ KIỆN", slug: "accessories" },
  { label: "GIÀY", slug: "sneakers" },
];

export function NoteworthySection() {
  const [activeCategory, setActiveCategory] = useState("");
  const { data: products = [], isLoading } = useHomeNoteworthy(activeCategory);
  const hasLoadedOnce = useRef(false);
  if (products.length > 0) hasLoadedOnce.current = true;
  const isFirstLoad = isLoading && !hasLoadedOnce.current;

  const shopHref = activeCategory
    ? `/shop?category=${activeCategory}`
    : "/shop";
  const activeCategoryLabel =
    CATEGORIES.find((cat) => cat.slug === activeCategory)?.label ??
    "BỘ LỌC HIỆN TẠI";
  const railRef = useDragScroll<HTMLDivElement>();

  return (
    <section className="bg-surface lg:rounded-3xl lg:p-8">
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
      <div className="mb-2 flex items-baseline justify-between px-6 lg:px-0">
        {isFirstLoad ? (
          <div className="h-7 w-44 animate-pulse rounded-lg bg-surface-container" />
        ) : (
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
        )}
        {isFirstLoad ? (
          <div className="h-4 w-20 animate-pulse rounded bg-surface-container" />
        ) : (
          <Link
            href={shopHref}
            className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-primary transition-all hover:gap-2"
          >
            Xem tất cả
            <ArrowRight size={10} />
          </Link>
        )}
      </div>

      {/* Category Pills */}
      <div className="hide-scrollbar mb-4 flex gap-2 overflow-x-auto px-6 pb-1 lg:px-0">
        {isFirstLoad
          ? [1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-8 w-20 animate-pulse rounded-full bg-surface-container"
              />
            ))
          : CATEGORIES.map((cat) => (
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
                <BundleProductCard
                  product={product}
                  showNewBadge
                  showSoldOutOverlay
                  showComponentTags
                />
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
