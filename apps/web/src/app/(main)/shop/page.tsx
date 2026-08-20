import { ShopPageClient } from "@/components/shop/ShopPageClient";
import { ShopSeo } from "@/components/shop/ShopSeo";
import {
  getBrands,
  getCategories,
  getProductSeoData,
  getProducts,
} from "@/lib/products-server";
import type { ProductsResponse } from "@/app/api/products/route";
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

function ShopFallback() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="animate-pulse">
          <div className="mb-3 aspect-[4/5] rounded-xl bg-surface-container" />
          <div className="space-y-1.5">
            <div className="h-2 w-1/3 rounded-full bg-surface-container" />
            <div className="h-3 w-4/5 rounded-full bg-surface-container" />
            <div className="h-3 w-2/5 rounded-full bg-surface-container" />
          </div>
        </div>
      ))}
    </div>
  );
}
