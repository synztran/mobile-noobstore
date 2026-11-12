"use client";

import Image from "@/components/ui/AdaptiveImage";
import { Sparkles, ChevronDown } from "lucide-react";
import type { ProductAddonDeal, ShopProduct } from "@/modules/products/types";

interface AddonDealTeaserProps {
  deals: ProductAddonDeal[];
  fallbackProducts?: ShopProduct[];
  targetId?: string;
}

export function AddonDealTeaser({
  deals,
  fallbackProducts = [],
  targetId = "frequently-bought-together-section",
}: AddonDealTeaserProps) {
  const hasDeals = deals.length > 0;
  const items = hasDeals
    ? deals.map((d) => ({
        id: d.id,
        name: d.product.name,
        thumbnail: d.product.thumbnail,
        discountText:
          d.discount_type === "percentage"
            ? `-${d.discount_value}%`
            : `-${Math.round((d.saved_amount / (d.product.min_price || d.product.base_price || 1)) * 100)}%`,
      }))
    : fallbackProducts.slice(0, 3).map((p) => ({
        id: p.id,
        name: p.name,
        thumbnail: p.thumbnail,
        discountText: "Ưu đãi",
      }));

  if (items.length === 0) return null;

  const scrollToSection = () => {
    const el = document.getElementById(targetId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-primary", "transition-all", "duration-500");
    setTimeout(() => {
      el.classList.remove("ring-2", "ring-primary");
    }, 1500);
  };

  return (
    <button
      type="button"
      onClick={scrollToSection}
      className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/[0.04] p-3 text-left transition-all hover:border-primary/40 hover:bg-primary/[0.07] active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        {/* Avatar stack */}
        <div className="flex -space-x-2 overflow-hidden py-0.5">
          {items.slice(0, 3).map((item, idx) => (
            <div
              key={item.id}
              className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border-2 border-surface bg-surface-container"
              style={{ zIndex: 10 - idx }}
            >
              {item.thumbnail ? (
                <Image
                  src={item.thumbnail}
                  alt={item.name}
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px]">
                  🎁
                </div>
              )}
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-primary">
              Mua kèm giá tốt
            </span>
            <span className="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.2 text-[9px] font-bold text-primary">
              <Sparkles size={10} className="mr-0.5" />
              {hasDeals ? `Tiết kiệm thêm` : `Gợi ý combo`}
            </span>
          </div>
          <p className="line-clamp-1 text-[11px] text-on-surface-variant">
            {items.map((i) => i.name).join(", ")}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-center justify-center gap-0.5 text-primary">
        <span className="text-[10px] font-black uppercase tracking-wider">Xem</span>
        <ChevronDown size={14} className="animate-bounce" />
      </div>
    </button>
  );
}
