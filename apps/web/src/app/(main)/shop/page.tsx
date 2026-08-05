import { ShopPageClient } from "@/components/shop/ShopPageClient";
import { ShopSeo } from "@/components/shop/ShopSeo";
import { getCategories, getProductSeoData } from "@/lib/products-server";
import type { Metadata } from "next";
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

export default async function ShopPage(_props: ShopPageProps) {
  const [categories, seoProducts] = await Promise.all([
    getCategories(),
    getProductSeoData(),
  ]);

  return (
    <div className="clear-both p-4">
      <ShopSeo products={seoProducts} />
      <Suspense fallback={null}>
        <ShopPageClient categories={categories} />
      </Suspense>
    </div>
  );
}
