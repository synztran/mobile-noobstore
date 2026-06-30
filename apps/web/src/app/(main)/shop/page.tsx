import type { SortOption } from "@/app/api/products/route";
import { ShopPageClient } from "@/components/shop/ShopPageClient";
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

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const sp = await searchParams;

  const [initialData, categories] = await Promise.all([
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

  return (
    <div className="px-4 py-4">
      <Suspense fallback={null}>
        <ShopPageClient initialData={initialData} categories={categories} />
      </Suspense>
    </div>
  );
}
