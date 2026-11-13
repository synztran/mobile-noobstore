"use client";

import type {
  ComponentVariantRule,
  ConfiguratorGroup,
  ProductDetail,
} from "@/modules/products/types";
import { TopNav } from "@/components/layout/TopNav";
import { AddToCartButton } from "@/modules/products/ui/product/AddToCartButton";
import { ProductBadges } from "@/modules/products/ui/product/ProductBadges";
import { useProductBadges } from "@/modules/products/ui/product/useProductBadges";
import { StockAlertButton } from "@/modules/products/ui/product/StockAlertButton";
import { HeroImageGallery } from "@/modules/products/ui/product/HeroImageGallery";
import { ProductConfigurator } from "@/modules/products/ui/product/ProductConfigurator";
import { SelectedConditionSummary } from "@/modules/products/ui/product/SelectedConditionSummary";
import WishlistButton from "@/modules/user/ui/wishlist/WishlistButton";
import { useProductViewData } from "@/modules/products/client/useProductViewData";
import { useRecentlyViewed } from "@/modules/products/client/useRecentlyViewed";
import { trackViewItem, toGAProduct } from "@/lib/analytics";
import { formatVND } from "@/lib/currency";
import clsx from "clsx";
import Image from "@/components/ui/AdaptiveImage";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RecentlyViewedRail } from "@/modules/products/ui/recently-viewed/RecentlyViewedRail";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";

const ImageViewer = dynamic(
  () =>
    import("@/modules/products/ui/product/ImageViewer").then((m) => ({
      default: m.ImageViewer,
    })),
  { ssr: false }
);
// Keyset preview (mock-data trial): canvas renderer, loaded on demand so it
// stays out of the detail page's initial JS. Only rendered for products with
// a colorway bound to their slug.
// const KeysetPreviewSection = dynamic(
//   () =>
//     import("@/modules/keyset-preview/ui/KeysetPreviewSection").then((m) => ({
//       default: m.KeysetPreviewSection,
//     })),
//   { ssr: false }
// );
import { PreOrderBanner } from "@/modules/products/ui/product/PreOrderBanner";
import { ProductInfoTabs } from "@/modules/products/ui/product/ProductInfoTabs";
import { ShippingInfoSection } from "@/modules/products/ui/product/ShippingInfoSection";
import { ProductRatingSection } from "@/modules/products/ui/product/ProductRatingSection";
import { ShareButton } from "@/modules/products/ui/product/ShareButton";
import { Star } from "lucide-react";
// import { getKeysetPreviewData } from "@/modules/keyset-preview/constants/mock-colorways";

export function ProductView({
  product,
  componentGroups = [],
  componentRules = [],
  purchaseCount = 0,
  relatedSlot,
  boughtTogetherSlot,
  addonTeaserSlot,
}: {
  product: ProductDetail;
  componentGroups?: ConfiguratorGroup[];
  componentRules?: ComponentVariantRule[];
  purchaseCount?: number;
  relatedSlot?: ReactNode;
  boughtTogetherSlot?: ReactNode;
  addonTeaserSlot?: ReactNode;
}) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  // The image the condition-summary thumbnail asked to open first. When set,
  // the viewer starts at index 0 of viewerImages; otherwise the hero gallery's
  // activeIndex drives it.
  const [viewerStart, setViewerStart] = useState<string | null>(null);

  const mediaImages = useMemo(() => {
    const all = [product.thumbnail, ...(product.images ?? [])].filter(
      (img): img is string => Boolean(img)
    );
    return Array.from(new Set(all));
  }, [product.thumbnail, product.images]);

  const viewerImages = useMemo(
    () =>
      Array.from(
        new Set([viewerStart, ...mediaImages].filter(Boolean))
      ) as string[],
    [viewerStart, mediaImages]
  );

  const openViewerAt = useCallback((image: string) => {
    setViewerStart(image);
    setImageViewerOpen(true);
  }, []);

  const openViewerAtHero = useCallback(() => {
    setViewerStart(null);
    setImageViewerOpen(true);
  }, []);

  const {
    variants,
    groups,
    selections,
    select,
    selectedVariant,
    selectedPreOrderConfig,
    loadingVariants,
    loadingConfigurator,
    missingVariantSelection,
    missingConfiguration,
    isOutOfStock,
    isLoadingAddToCart,
    handleAddToCart,
    disabledVariantIds,
    resolvedUnitPrice,
  } = useProductViewData(product, componentGroups, componentRules);

  useEffect(() => {
    trackViewItem(toGAProduct(product, selectedVariant));
  }, [product, selectedVariant]);

  // Record the view once per product (not per variant selection).
  const { addViewed } = useRecentlyViewed();
  const lastRecordedId = useRef<string | null>(null);

  useEffect(() => {
    if (lastRecordedId.current === product.id) return;
    lastRecordedId.current = product.id;
    addViewed({
      id: product.id,
      slug: product.slug,
      name: product.name,
      thumbnail: product.thumbnail ?? null,
      viewedAt: Date.now(),
    });
  }, [product.id, product.slug, product.name, product.thumbnail, addViewed]);

  const hasDiscount = product.min_price < product.base_price;
  const discountPercent = hasDiscount
    ? Math.round(
        ((product.base_price - product.min_price) / product.base_price) * 100
      )
    : 0;

  const fromPrice = useMemo(() => {
    const ownPrices = variants
      .map((variant) => variant.effective_price)
      .filter((price) => price > 0);
    const requiredGroupPrices = groups
      .filter((group) => group.is_required)
      .map((group) =>
        Math.min(
          ...group.variants
            .map((variant) => product.base_price + variant.price_adjustment)
            .filter((price) => price > 0)
        )
      );

    if (requiredGroupPrices.length > 0) {
      return requiredGroupPrices.reduce(
        (total, price) => total + (Number.isFinite(price) ? price : 0),
        product.base_price
      );
    }

    return ownPrices.length > 0
      ? Math.min(...ownPrices)
      : product.min_price || product.base_price;
  }, [variants, groups, product.base_price, product.min_price]);

  // The live configurator total: base + the selected kit variant + components,
  // with any per-pairing override applied. Replaces the old
  // `min_price + componentAdjustment`, which priced every kit off its CHEAPEST
  // variant regardless of the one selected.
  //
  // Non-kit products keep the existing fallback to the cheapest variant, because
  // their `base_price` is often 0 with the real price carried per variant.
  const hasUnselectedVariants =
    !selectedVariant &&
    !Object.values(selections).some((selectedIds) => selectedIds.length > 0) &&
    (variants.length > 0 || groups.some((group) => group.is_required));
  const displayPrice = hasUnselectedVariants
    ? fromPrice
    : groups.length > 0
      ? resolvedUnitPrice
      : (selectedVariant?.effective_price ?? fromPrice);

  const badges = useProductBadges({
    product,
    variants,
    selectedVariant,
    isOutOfStock,
  });

  const specItems = useMemo(() => {
    if (!product.attributes) return [];
    return Object.entries(product.attributes).map(([key, value]) => ({
      label: key,
      value,
    }));
  }, [product.attributes]);

  const editorialContent = useMemo(() => {
    if (product.description) {
      return product.description;
    }
    if (product.components.length > 0) {
      return "Each bundle component has been grouped to keep configuration intentional. Required parts define the core build, while optional parts let the setup stay personal without compromising the product's main character.";
    }
    return "This edition keeps the product presentation minimal and focused. Variant choices remain clear, stock states are visible up front, and the interaction model stays close to the tactile feel established in the quick-pick experience.";
  }, [product.description, product.components.length]);

  const hasConfigurator =
    loadingVariants ||
    loadingConfigurator ||
    variants.length > 0 ||
    groups.length > 0;

  // Mock-data trial: only products whose slug has a mock colorway show the
  // keyset preview section. The real-data phase swaps the resolver behind
  // this call — the UI wiring stays.
  // const keysetPreviewData = useMemo(
  //   () => getKeysetPreviewData(product.slug),
  //   [product.slug]
  // );

  useEffect(() => {
    setActiveImageIndex(0);
  }, [product.slug]);

  return (
    <article className="pb-4">
      <TopNav showBack backHref="/shop" showCart showFavorite />

      {/* <Breadcrumbs
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Cửa hàng", href: "/shop" },
          { label: product.category, href: `/shop?category=${encodeURIComponent(product.category)}` },
          { label: product.name },
        ]}
      /> */}

      <main className="my-auto space-y-4">
        {/*
          Desktop: gallery left, sticky purchase panel right.
          Grouped in its own grid wrapper so sticky panel's boundary stops
          at the bottom of the gallery section and never overlaps ProductInfoTabs below.
        */}
        <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-4 lg:space-y-0">
          <div className="space-y-6 lg:col-start-1 lg:row-start-1">
            {/* ── Hero Image Gallery ── */}
            <HeroImageGallery
              images={mediaImages}
              productName={product.name}
              activeIndex={activeImageIndex}
              onSelect={setActiveImageIndex}
              hasDiscount={hasDiscount}
              discountPercent={discountPercent}
              saleEndsAt={product.sale_ends_at}
              onImageClick={openViewerAtHero}
            />

            {/* ── Desktop Tabbed Info (Description / Specs / Shipping) ── */}
            <div className="hidden rounded-2xl bg-surface p-4 shadow-ambient-sm lg:block">
              <ProductInfoTabs
                product={product}
                editorialContent={editorialContent}
                specItems={specItems}
                productSlug={product.slug}
              />
            </div>
          </div>

          {/* Purchase panel — price, variants, stock, pre-order */}
          <div className="hide-scrollbar space-y-4 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 lg:h-fit lg:max-h-[calc(100dvh-96px)] lg:self-start lg:overflow-y-auto lg:pr-1">
            {/* ── Product Info ── */}
            <section className="px-4 md:rounded-2xl md:bg-surface md:p-4 md:shadow-ambient-sm">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <ProductBadges badges={badges} purchaseCount={purchaseCount} />
                <a
                  href="#product-rating-reviews-section"
                  className="flex items-center gap-1 rounded bg-amber-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700 transition-colors hover:bg-amber-500/20"
                >
                  <Star size={11} className="fill-amber-400 text-amber-500" />
                  <span>4.9 (28 đánh giá)</span>
                </a>
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-primary">
                    {product.category}
                  </p>
                  <p className="text-balance text-xl font-black uppercase leading-none text-on-surface">
                    {product.name}
                  </p>
                  {product.brand && (
                    <p className="mt-1 text-xs font-semibold text-on-surface-variant">
                      bởi {product.brand}
                    </p>
                  )}
                </div>
                <ShareButton
                  productName={product.name}
                  productSlug={product.slug}
                />
              </div>
              <div className="mt-4 flex items-baseline justify-end gap-2">
                {hasUnselectedVariants && (
                  <span className="text-sm font-semibold text-on-surface-variant">
                    Giá chỉ từ
                  </span>
                )}
                <span
                  className={clsx(
                    "text-2xl font-black leading-none text-primary",
                    hasDiscount ? "text-red-500" : "text-on-surface"
                  )}
                >
                  {formatVND(displayPrice)}
                </span>
                <div className="flex items-baseline gap-2">
                  {hasDiscount && (
                    <span className="text-sm text-on-surface-variant line-through opacity-60">
                      {formatVND(product.base_price)}
                    </span>
                  )}
                  {selectedVariant &&
                    selectedVariant.price_adjustment !== 0 && (
                      <span className="text-sm text-on-surface-variant line-through opacity-60">
                        {formatVND(product.min_price)}
                      </span>
                    )}
                </div>
              </div>
            </section>

            {/* ── Configurator (variants + component groups) ── */}
            {hasConfigurator && (
              <>
                <section className="space-y-2 px-4 md:rounded-2xl md:bg-surface md:p-4 md:shadow-ambient-sm">
                  <div className="text-sm font-black uppercase tracking-wider text-on-surface-variant">
                    Lựa chọn cấu hình
                  </div>
                  <div className="space-y-4 rounded-xl">
                    {loadingVariants ? (
                      <div className="grid grid-cols-2 gap-3">
                        {[1, 2].map((i) => (
                          <div
                            key={i}
                            className="h-[88px] animate-pulse rounded-lg bg-surface-container-low"
                          />
                        ))}
                      </div>
                    ) : (
                      <>
                        <ProductConfigurator
                          groups={groups}
                          variants={variants}
                          selections={selections}
                          loadingConfigurator={loadingConfigurator}
                          basePrice={product.base_price}
                          onSelect={select}
                          disabledVariantIds={disabledVariantIds}
                          showTitle={false}
                          purchaseActions={
                            <motion.div
                              initial={{ y: "100%" }}
                              animate={{ y: 0 }}
                              transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 30,
                                mass: 0.8,
                              }}
                              className="fixed bottom-0 left-0 right-0 z-[100] flex items-center gap-2 rounded-t-2xl border-t border-outline-variant/20 bg-surface/95 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-float backdrop-blur-md lg:static lg:z-auto lg:w-full lg:rounded-2xl lg:border lg:bg-surface lg:p-3 lg:shadow-ambient-sm lg:backdrop-blur-none"
                            >
                              <WishlistButton
                                productId={product.id}
                                product={product}
                                showLabel
                                size="md"
                                className="flex shrink-0 items-center gap-2 rounded-2xl border border-outline-variant/30 px-4"
                                iconOnly={false}
                              />
                              {isOutOfStock ? (
                                <StockAlertButton
                                  productId={product.id}
                                  variantId={selectedVariant?.id ?? ""}
                                />
                              ) : (
                                <AddToCartButton
                                  isOutOfStock={isOutOfStock}
                                  missingVariantSelection={
                                    missingVariantSelection
                                  }
                                  missingConfiguration={missingConfiguration}
                                  isLoading={isLoadingAddToCart}
                                  isPreOrder={selectedPreOrderConfig !== null}
                                  onClick={() => handleAddToCart(1)}
                                />
                              )}
                            </motion.div>
                          }
                        />
                        <SelectedConditionSummary
                          groups={groups}
                          selections={selections}
                          productVariants={variants}
                          onShowImage={openViewerAt}
                        />
                      </>
                    )}
                  </div>
                </section>
              </>
            )}
            {!hasConfigurator && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                  mass: 0.8,
                }}
                className="fixed bottom-0 left-0 right-0 z-[100] flex items-center gap-2 rounded-t-2xl border-t border-outline-variant/20 bg-surface/95 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-float backdrop-blur-md lg:static lg:z-auto lg:w-full lg:rounded-2xl lg:border lg:bg-surface lg:p-3 lg:shadow-ambient-sm lg:backdrop-blur-none"
              >
                <WishlistButton
                  productId={product.id}
                  product={product}
                  showLabel
                  size="md"
                  className="flex shrink-0 items-center gap-2 rounded-2xl border border-outline-variant/30 px-4"
                  iconOnly={false}
                />
                {isOutOfStock ? (
                  <StockAlertButton
                    productId={product.id}
                    variantId={selectedVariant?.id ?? ""}
                  />
                ) : (
                  <AddToCartButton
                    isOutOfStock={isOutOfStock}
                    missingVariantSelection={missingVariantSelection}
                    missingConfiguration={missingConfiguration}
                    isLoading={isLoadingAddToCart}
                    isPreOrder={selectedPreOrderConfig !== null}
                    onClick={() => handleAddToCart(1)}
                  />
                )}
              </motion.div>
            )}

            {/* ── Keyset preview (slug-gated, mock-data trial) ── */}
            {/* {keysetPreviewData && (
              <section className="px-4">
                <KeysetPreviewSection colorway={keysetPreviewData} />
              </section>
            )} */}

            {/* ── Low stock urgency banner ── */}
            {/* ── Pre-order Info Banner ── */}
            {selectedPreOrderConfig && (
              <section className="px-4 md:rounded-2xl md:bg-surface md:p-4 md:shadow-ambient-sm">
                <PreOrderBanner config={selectedPreOrderConfig} />
              </section>
            )}

            <div className="hidden lg:block">
              <ShippingInfoSection />
            </div>

            {/* ── Add-on Deals Anchor Teaser ── */}
            {addonTeaserSlot && (
              <div className="px-4 lg:px-0">{addonTeaserSlot}</div>
            )}
          </div>
        </div>

        {/* ── Mobile Tabbed Info (Description / Specs / Shipping) ── */}
        <div className="mb-4 mt-4 md:mb-6 md:mt-0 md:rounded-2xl md:bg-surface md:shadow-ambient-sm lg:hidden">
          <ProductInfoTabs
            product={product}
            editorialContent={editorialContent}
            specItems={specItems}
            productSlug={product.slug}
          />
        </div>
      </main>

      {/* ── Gift Products ── */}
      {product.gifts && product.gifts.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="space-y-2 px-4 md:rounded-2xl md:bg-surface md:p-4 md:shadow-ambient-sm"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">🎁</span>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">
              Quà tặng kèm
            </p>
          </div>
          <div className="hide-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-2">
            {product.gifts.map((gift) => (
              <Link
                key={gift.gift_slug}
                href={`/shop/${gift.gift_slug}`}
                className="w-[140px] shrink-0 snap-start"
              >
                <div className="overflow-hidden rounded-2xl bg-surface-container-low shadow-ambient-sm">
                  <div className="relative aspect-square w-full bg-surface-container">
                    {gift.gift_thumbnail ? (
                      <Image
                        src={gift.gift_thumbnail}
                        alt={gift.gift_name}
                        fill
                        sizes="140px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl">
                        🎁
                      </div>
                    )}
                    <div className="absolute right-1.5 top-1.5 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      x{gift.quantity}
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="line-clamp-2 text-xs font-semibold text-on-surface">
                      {gift.gift_name}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── Image Viewer ── */}
      <Suspense fallback={null}>
        <ImageViewer
          images={viewerImages}
          initialIndex={viewerStart ? 0 : activeImageIndex}
          isOpen={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
        />
      </Suspense>

      {/* ── Frequently Bought Together ── */}
      {boughtTogetherSlot}

      {/* ── Rating & Reviews Section ── */}
      <ProductRatingSection
        productSlug={product.slug}
        productName={product.name}
      />

      {/* ── Related Products ── */}
      {relatedSlot}

      {/* ── Recently Viewed ── */}
      <div className="px-4 lg:px-0">
        <RecentlyViewedRail />
      </div>
    </article>
  );
}
