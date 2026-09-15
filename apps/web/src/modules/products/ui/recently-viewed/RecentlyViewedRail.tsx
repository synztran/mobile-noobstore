"use client";

import type { ShopProduct } from "@/modules/products/types";
import { ProductRail } from "@/modules/products/ui/product/ProductRail";
import { History } from "lucide-react";
import { useRecentlyViewed } from "@/modules/products/client/useRecentlyViewed";
import { MAX_DISPLAYED } from "@/lib/recently-viewed";
import { useRecentlyViewedProducts } from "@/modules/products/client/queries";
import { useMemo } from "react";

export function RecentlyViewedRail() {
  const { entries } = useRecentlyViewed();

  const ids = useMemo(() => entries.map((e) => e.id), [entries]);

  const { data: products, isLoading } = useRecentlyViewedProducts(ids);

  const displayed = useMemo<ShopProduct[]>(() => {
    if (!products) return [];
    const byId = new Map(products.map((p) => [p.id, p]));
    // Preserve history order (newest first), skip unavailable products.
    return entries
      .map((e) => byId.get(e.id))
      .filter((p): p is ShopProduct => Boolean(p))
      .slice(0, MAX_DISPLAYED);
  }, [entries, products]);

  if (entries.length === 0) return null;

  if (isLoading) {
    return (
      <section className="mt-8">
        <div className="mb-4 h-6 w-40 animate-pulse rounded bg-on-surface/10" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="h-44 w-[140px] shrink-0 animate-pulse rounded-2xl bg-on-surface/10"
            />
          ))}
        </div>
      </section>
    );
  }

  if (displayed.length === 0) return null;

  return (
    <div data-tour="recent">
      <ProductRail
        title="Đã xem gần đây"
        icon={<History className="h-5 w-5 text-primary" />}
        products={displayed}
        cardWidth="w-[140px]"
      />
    </div>
  );
}
