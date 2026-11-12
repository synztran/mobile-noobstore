"use client";

import type { ShopProduct } from "@/modules/products/types";
import { ProductCard } from "@/modules/products/ui/product/ProductCard";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export function ProductRail({
  title,
  icon,
  trailing,
  products,
  cardWidth = "w-[175px] sm:w-[195px] md:w-[215px] lg:w-[225px]",
  classNames,
}: {
  title: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  products: ShopProduct[];
  cardWidth?: string;
  classNames?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 10);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll, products]);

  const scrollBy = useCallback((direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = Math.max(el.clientWidth * 0.75, 240);
    el.scrollBy({ left: direction * scrollAmount, behavior: "smooth" });
  }, []);

  if (products.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`py-4 ${classNames ?? ""} mt-4 md:rounded-2xl md:bg-surface md:p-6 md:shadow-ambient-sm lg:mt-8`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-base font-black uppercase tracking-tight text-on-surface sm:text-lg">
          {icon}
          <h2>{title}</h2>
        </div>

        <div className="flex items-center gap-3">
          {trailing}

          {/* Desktop scroll navigation buttons */}
          <div className="hidden items-center gap-1.5 sm:flex">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              disabled={!canLeft}
              aria-label="Cuộn sang trái"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/30 bg-surface-container-lowest text-on-surface-variant transition-all hover:bg-surface-container hover:text-on-surface disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              disabled={!canRight}
              aria-label="Cuộn sang phải"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/30 bg-surface-container-lowest text-on-surface-variant transition-all hover:bg-surface-container hover:text-on-surface disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Horizontal scroll rail with smooth momentum ── */}
      <div
        ref={scrollRef}
        className="hide-scrollbar flex snap-x snap-mandatory gap-3.5 overflow-x-auto overscroll-x-contain pb-2 pt-1 lg:gap-4"
      >
        {products.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: Math.min(i * 0.04, 0.24), duration: 0.25, ease: "easeOut" }}
            className={`${cardWidth} shrink-0 snap-start rounded-2xl border border-outline-variant/20 bg-surface-container-lowest/80 p-2.5 transition-all hover:border-primary/30 hover:shadow-ambient-sm`}
          >
            <ProductCard product={p} />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
