import { ShopPageClient } from "@/modules/products/ui/shop/ShopPageClient";
import { ShopSeo } from "@/modules/products/ui/shop/ShopSeo";
import { ProductCardSkeleton } from "@/modules/products/ui/product/ProductCard";
import {
  getBrands,
  getCategories,
  getProductSeoData,
  getProducts,
} from "@/modules/products/server/ssr";
import type { ProductsResponse } from "@/modules/products/types";
import type { Metadata } from "next";
import { buildOg } from "@/lib/og";
import { Suspense } from "react";

interface ShopPageProps {
  searchParams: Promise<{
    search?: string;
    sort?: string;
    category?: string | string[];
    brand?: string | string[];
    priceMin?: string;
    priceMax?: string;
  }>;
}

// Note the title carries no " - NoobStore" suffix: the root layout applies a
// "%s - NoobStore" template, and buildOg feeds og:title from the same field, so
// a manual suffix rendered as "Cửa hàng - NoobStore - NoobStore".
export const metadata: Metadata = buildOg({
  title: "Cửa hàng",
  description:
    "Khám phá bộ sưu tập bàn phím cơ, switch, keycap và phụ kiện tại NoobStore. Chính hãng, chất lượng, giá tốt.",
  url: "/shop",
});

export default function ShopPage(props: ShopPageProps) {
  return (
    <div className="clear-both p-4 pb-10 lg:px-0 lg:pb-10 lg:pt-0">
      <Suspense fallback={<ShopFallback />}>
        <ShopContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function ShopContent({
  searchParams,
}: {
  searchParams: ShopPageProps["searchParams"];
}) {
  const sp = await searchParams;

  // Only seed with server-rendered data on the unfiltered landing view —
  // filtered queries must hydrate from the client to match the URL state.
  const hasFilters = Boolean(
    sp.search?.trim() ||
    (Array.isArray(sp.category) ? sp.category.some((v) => v.trim()) : sp.category?.trim()) ||
    (Array.isArray(sp.brand) ? sp.brand.some((v) => v.trim()) : sp.brand?.trim()) ||
    sp.priceMin?.trim() ||
    sp.priceMax?.trim() ||
    (sp.sort && sp.sort !== "newest")
  );

  const [categories, brands, seoProducts, initialQuery] = await Promise.all([
    getCategories(),
    getBrands(),
    getProductSeoData(),
    hasFilters
      ? Promise.resolve(null)
      // soldOutLast must match /api/products, which serves the infinite-scroll
      // pages that replace this initial payload — otherwise the SSR paint and
      // the first fetched page would order sold-out products differently.
      : getProducts({ limit: 12, sort: "newest", slim: true, soldOutLast: true }),
  ]);

  const initialData: ProductsResponse | null = initialQuery
    ? { products: initialQuery.products, total: initialQuery.total }
    : null;

  return (
    <>
      <ShopSeo products={seoProducts} />
      <ShopPageClient
        categories={categories}
        brands={brands}
        initialData={initialData ?? undefined}
      />
    </>
  );
}

function ShopControlsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-4 flex items-center gap-2 rounded-md border border-outline-variant bg-white px-3 py-3.5">
        <div className="h-4 w-2/3 rounded-full bg-surface-container" />
      </div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Bộ sưu tập
          </p>
          <div className="h-7 w-28 rounded-md bg-surface-container" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-20 rounded-full bg-surface-container" />
          <div className="h-9 w-24 rounded-full bg-surface-container" />
        </div>
      </div>
    </div>
  );
}

function ShopFallback() {
  return (
    <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:gap-8">
      <div className="hidden lg:block">
        <div className="h-[420px] animate-pulse rounded-2xl bg-surface-container" />
      </div>
      <div>
        <ShopControlsSkeleton />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
