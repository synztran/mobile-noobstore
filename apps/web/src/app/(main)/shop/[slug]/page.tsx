import type { ShopProduct } from "@/app/api/products/route";
import { TopNav } from "@/components/layout/TopNav";
import { ProductView } from "@/components/product/ProductView";
import { getProductDetail, getRelatedProducts } from "@/lib/products-server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

function ProductDetailSkeleton() {
  return (
    <>
      <TopNav showBack backHref="/shop" showCart showFavorite />
      <main className="animate-pulse">
        <div className="mx-6 mb-4 mt-6">
          <div className="aspect-[4/3] w-full rounded-5xl bg-surface-container shadow-ambient-sm" />
        </div>
        <div className="mb-4 flex justify-center gap-2 px-6">
          <div className="h-1 w-8 rounded-full bg-surface-container" />
          <div className="h-1 w-2 rounded-full bg-surface-container-high" />
        </div>
        <div className="space-y-6 px-6">
          <div className="space-y-3">
            <div className="h-2 w-16 rounded-full bg-surface-container" />
            <div className="h-7 w-3/4 rounded-full bg-surface-container-high" />
            <div className="h-4 w-20 rounded-full bg-surface-container" />
          </div>
          <div className="space-y-4 rounded-2xl bg-surface-container-low p-3">
            <div className="grid grid-cols-2 gap-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[88px] rounded-lg bg-surface-container-high"
                />
              ))}
            </div>
          </div>
          <div className="rounded-none bg-surface-container-low p-2">
            <div className="mb-6 h-3 w-32 rounded-full bg-surface-container" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-2 w-12 rounded-full bg-surface-container" />
                  <div className="h-4 w-24 rounded-full bg-surface-container-high" />
                </div>
              ))}
            </div>
          </div>
          <div className="mb-20 py-4">
            <div className="mb-4 h-3 w-40 rounded-full bg-surface-container" />
            <div className="flex gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-52 w-40 shrink-0 rounded-2xl bg-surface-container-high"
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

async function ProductLoader({ slug }: { slug: string }) {
  const result = await getProductDetail(slug);
  if (!result) notFound();

  const relatedProducts: ShopProduct[] = await getRelatedProducts(
    result.product.brand,
    slug,
    8
  );

  return (
    <ProductView
      product={result.product}
      componentGroups={result.componentGroups}
      componentRules={result.componentRules}
      relatedProducts={relatedProducts}
    />
  );
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductLoader slug={slug} />
    </Suspense>
  );
}
