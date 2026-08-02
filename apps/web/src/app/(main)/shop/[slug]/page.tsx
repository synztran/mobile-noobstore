import { TopNav } from "@/components/layout/TopNav";
import { ProductView } from "@/components/product/ProductView";
import {
  getProductBySlug,
  getProductDetail,
  getProductPurchaseCount,
} from "@/lib/products-server";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BoughtTogetherSection } from "@/components/product/BoughtTogetherSection";
import { RelatedProductsSection } from "@/components/product/RelatedProductsSection";
import { ScrollToTopOnNav } from "./ScrollToTopOnNav";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: "Sản phẩm" };
  }

  const rawImage =
    product.thumbnail || product.images?.find(Boolean) || undefined;
  const ogImage = rawImage?.startsWith("http")
    ? rawImage
    : `https://www.noobstore.xyz${rawImage ?? ""}`;
  const cleanDescription = product.description
    ? product.description.replace(/<[^>]*>/g, "").slice(0, 160)
    : `${product.name} - ${product.brand ?? "NoobStore"}`;

  return {
    title: product.name,
    description: cleanDescription,
    openGraph: {
      type: "website",
      siteName: "NoobStore",
      title: product.name,
      description: cleanDescription,
      url: `https://www.noobstore.xyz/shop/${slug}`,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: cleanDescription,
      images: ogImage ? [ogImage] : [],
    },
  };
}

function ProductDetailSkeleton() {
  return (
    <>
      <TopNav showBack backHref="/shop" showCart showFavorite />
      <main className="w-full animate-pulse overflow-x-hidden">
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

function RailSkeleton() {
  return (
    <div className="mt-8 px-4">
      <div className="mb-4 h-3 w-44 rounded-full bg-surface-container" />
      <div className="flex gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-52 w-40 shrink-0 rounded-2xl bg-surface-container-high"
          />
        ))}
      </div>
    </div>
  );
}

async function ProductLoader({ slug }: { slug: string }) {
  const [detail, purchaseCount] = await Promise.all([
    getProductDetail(slug),
    getProductBySlug(slug).then((p) => (p ? getProductPurchaseCount(p.id) : 0)),
  ]);
  if (!detail) notFound();

  return (
    <ProductView
      product={detail.product}
      componentGroups={detail.componentGroups}
      componentRules={detail.componentRules}
      purchaseCount={purchaseCount}
      relatedSlot={
        <Suspense fallback={<RailSkeleton />}>
          <RelatedProductsSection
            brand={detail.product.brand}
            slug={detail.product.slug}
          />
        </Suspense>
      }
      boughtTogetherSlot={
        <Suspense fallback={<RailSkeleton />}>
          <BoughtTogetherSection productId={detail.product.id} />
        </Suspense>
      }
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
    <PullToRefresh>
      <ScrollToTopOnNav />
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductLoader slug={slug} />
      </Suspense>
      <ScrollToTop />
    </PullToRefresh>
  );
}
