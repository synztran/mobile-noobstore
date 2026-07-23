import type { SortOption } from "@/app/api/products/route";
import { ShopPageClient } from "@/components/shop/ShopPageClient";
import { getCategories, getProducts } from "@/lib/products-server";
import { Suspense } from "react";
import type { Metadata } from "next";

interface ShopPageProps {
  searchParams: Promise<{
    search?: string;
    sort?: string;
    category?: string;
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

  console.log("initialData", initialData);

  return (
    <div className="clear-both p-4">
      <Suspense fallback={null}>
        <ShopPageClient initialData={initialData} categories={categories} />
      </Suspense>
    </div>
  );
}
