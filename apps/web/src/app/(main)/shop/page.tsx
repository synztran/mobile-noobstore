import type { SortOption } from "@/app/api/products/route";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/components/product/ProductCard";
import { ShopPageClient } from "@/components/shop/ShopPageClient";
import Icon from "@/components/ui/Icon";
import { getCategories, getProducts } from "@/lib/products-server";
import { Suspense } from "react";

interface ShopPageProps {
  searchParams: Promise<{
    search?: string;
    sort?: string;
    category?: string;
    priceMin?: string;
    priceMax?: string;
  }>;
}

const PAGE_SIZE = 12;

// ─── Async product grid (suspendable) ────────────────────────────────────────

async function ProductGrid({
  search,
  categorySlug,
  priceMin,
  priceMax,
  sort,
}: {
  search?: string;
  categorySlug?: string;
  priceMin?: number;
  priceMax?: number;
  sort?: SortOption;
}) {
  const { products } = await getProducts({
    search,
    categorySlug,
    priceMin: priceMin ?? 0,
    priceMax: priceMax ?? 0,
    sort: sort ?? "newest",
  });

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center gap-4 py-16 text-center">
        <Icon name="search_off" className="text-2xl text-outline-variant" />
        <p className="font-semibold text-on-surface-variant">
          Không tìm thấy sản phẩm phù hợp
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const sp = await searchParams;

  const [{ products: initialProducts, total }, categories] = await Promise.all([
    getProducts({
      search: sp.search,
      categorySlug: sp.category,
      priceMin: sp.priceMin ? Number(sp.priceMin) : 0,
      priceMax: sp.priceMax ? Number(sp.priceMax) : 0,
      sort: (sp.sort as SortOption) ?? "newest",
      limit: PAGE_SIZE,
      offset: 0,
    }),
    getCategories(),
  ]);

  const grid = (
    <Suspense fallback={<ShopPageSkeleton />}>
      <ProductGrid
        search={sp.search}
        categorySlug={sp.category}
        priceMin={sp.priceMin ? Number(sp.priceMin) : 0}
        priceMax={sp.priceMax ? Number(sp.priceMax) : 0}
        sort={(sp.sort as SortOption) ?? "newest"}
      />
    </Suspense>
  );

  return (
    <div className="px-4 py-4">
      <Suspense fallback={null}>
        <ShopPageClient total={total} categories={categories} grid={grid} />
      </Suspense>
    </div>
  );
}

function ShopPageSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Search bar */}
      <div className="mb-6 h-12 rounded-full bg-surface-container" />

      {/* Header row: result count + filter/sort buttons */}
      <div className="mb-4 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-2 w-16 rounded-full bg-surface-container" />
          <div className="h-7 w-24 rounded-full bg-surface-container" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-16 rounded-full bg-surface-container" />
          <div className="h-9 w-20 rounded-full bg-surface-container" />
        </div>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
