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
import { Suspense } from "react";

interface ShopPageProps {
  searchParams: Promise<{
    search?: string;
    sort?: string;
    category?: string;
    brand?: string;
    priceMin?: string;
    priceMax?: string;
  }>;
}

export const metadata: Metadata = {
  title: "Cửa hàng - NoobStore",
  description:
    "Khám phá bộ sưu tập bàn phím cơ, switch, keycap và phụ kiện tại NoobStore. Chính hãng, chất lượng, giá tốt.",
  openGraph: {
    title: "Cửa hàng - NoobStore",
    description:
      "Khám phá bộ sưu tập bàn phím cơ, switch, keycap và phụ kiện tại NoobStore.",
    siteName: "NoobStore",
  },
};

export default function ShopPage(props: ShopPageProps) {
  return (
    <div className="clear-both p-4">
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
    sp.category?.trim() ||
    sp.brand?.trim() ||
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
      : getProducts({ limit: 12, sort: "newest", slim: true }),
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
    <div>
      <ShopControlsSkeleton />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
