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

export default async function ShopPage(props: ShopPageProps) {
  const searchParams = await props.searchParams;

  // Only seed with server-rendered data on the unfiltered landing view —
  // filtered queries must hydrate from the client to match the URL state.
  const hasFilters = Boolean(
    searchParams.search?.trim() ||
      searchParams.category?.trim() ||
      searchParams.brand?.trim() ||
      searchParams.priceMin?.trim() ||
      searchParams.priceMax?.trim() ||
      (searchParams.sort && searchParams.sort !== "newest")
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
    <div className="clear-both p-4">
      <ShopSeo products={seoProducts} />
      <Suspense fallback={null}>
        <ShopPageClient
          categories={categories}
          brands={brands}
          initialData={initialData ?? undefined}
        />
      </Suspense>
    </div>
  );
}
