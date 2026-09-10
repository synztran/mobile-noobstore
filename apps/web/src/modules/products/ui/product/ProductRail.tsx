"use client";

import type { ShopProduct } from "@/modules/products/types";
import { ProductCard } from "@/modules/products/ui/product/ProductCard";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function ProductRail({
  title,
  icon,
  trailing,
  products,
  cardWidth = "w-[180px]",
  classNames,
}: {
  title: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  products: ShopProduct[];
  cardWidth?: string;
  classNames?: string;
}) {
  if (products.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`py-8 ${classNames ?? ""}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-black uppercase tracking-tight">
          {icon}
          {title}
        </div>
        {trailing}
      </div>
      <div className="hide-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-2">
        {products.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35, ease: "easeOut" }}
            className={`${cardWidth} shrink-0 snap-start`}
          >
            <ProductCard product={p} isBundle />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
