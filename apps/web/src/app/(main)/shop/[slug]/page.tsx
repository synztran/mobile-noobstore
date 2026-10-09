import { TopNav } from "@/components/layout/TopNav";
import { ProductView } from "@/modules/products/ui/product/ProductView";
import {
  getProductBySlug,
  getProductDetail,
  getProductPurchaseCount,
} from "@/modules/products/server/ssr";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  buildOg,
  pickProductOgImage,
  toPlainText,
  SITE_NAME,
  SITE_URL,
} from "@/lib/og";
import { Suspense } from "react";
import { BoughtTogetherSection } from "@/modules/products/ui/product/BoughtTogetherSection";
import { RelatedProductsSection } from "@/modules/products/ui/product/RelatedProductsSection";
import { ScrollToTopOnNav } from "./ScrollToTopOnNav";

// ISR — cache the rendered product page (incl. og tags) on the Vercel edge so
// crawlers (Facebook's facebookexternalhit, etc.) get a fast hit instead of a
// cold serverless run. 300s window keeps product edits reasonably fresh while
// slashing the frequency of cold 5s+ renders that hurt LCP; per-user state
// (cart/wishlist) is client-side and unaffected.
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const url = `/shop/${slug}`;

  // A brand-new product is not in the Redis/Data Cache yet, so this can miss
  // right after creation. Returning a bare `{ title }` here used to drop the
  // whole openGraph object, which made Next fall back to the root layout's —
  // no og:url, and the site logo as the preview. Facebook cached that and
  // reported "Thiếu tài sản og:url". Always emit a complete card instead.
  const product = await getProductBySlug(slug);

  if (!product) {
    return buildOg({
      title: "Sản phẩm",
      description: "Sản phẩm không tìm thấy trên NoobStore.",
      url,
    });
  }

  // Prefer the first gallery image over `thumbnail`: thumbnails are whatever
  // was uploaded first and are often portrait phone shots, which Messenger
  // renders badly. No declared dimensions — we cannot read real ones without
  // fetching the bytes, and a wrong ratio crops worse than none at all. See
  // pickProductOgImage in lib/og.ts.
  const ogImage = pickProductOgImage(product.thumbnail, product.images);

  return buildOg({
    title: product.name,
    description:
      toPlainText(product.description) ||
      `${product.name} - ${product.brand ?? SITE_NAME}`,
    url,
    image: ogImage,
    imageAlt: product.name,
  });
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

  const { product } = detail;
  const imageUrl = pickProductOgImage(product.thumbnail, product.images);
  const productUrl = `${SITE_URL}/shop/${slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description
      ? toPlainText(product.description, 500)
      : product.name,
    image: imageUrl ?? undefined,
    brand: product.brand
      ? { "@type": "Brand", name: product.brand }
      : undefined,
    category: product.category,
    url: productUrl,
    offers: {
      "@type": "Offer",
      priceCurrency: "VND",
      price: product.min_price,
      availability:
        product.stock_quantity > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: productUrl,
      seller: { "@type": "Organization", name: SITE_NAME },
    },
    aggregateRating:
      purchaseCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: "5",
            reviewCount: String(purchaseCount),
          }
        : undefined,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Trang chủ",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Cửa hàng",
        item: `${SITE_URL}/shop`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.category,
        item: `${SITE_URL}/shop?category=${encodeURIComponent(product.category)}`,
      },
      { "@type": "ListItem", position: 4, name: product.name },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <ProductView
        product={detail.product}
        componentGroups={detail.componentGroups}
        componentRules={detail.componentRules}
        purchaseCount={purchaseCount}
        relatedSlot={
          <Suspense key="related" fallback={<RailSkeleton />}>
            <RelatedProductsSection
              brand={detail.product.brand}
              slug={detail.product.slug}
            />
          </Suspense>
        }
        boughtTogetherSlot={
          <Suspense key="bought-together" fallback={<RailSkeleton />}>
            <BoughtTogetherSection productId={detail.product.id} />
          </Suspense>
        }
      />
    </>
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
