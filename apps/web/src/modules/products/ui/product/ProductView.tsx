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
const KeysetPreviewSection = dynamic(
  () =>
    import("@/modules/keyset-preview/ui/KeysetPreviewSection").then((m) => ({
      default: m.KeysetPreviewSection,
    })),
  { ssr: false }
);
import { PreOrderBanner } from "@/modules/products/ui/product/PreOrderBanner";
import { ProductInfoTabs } from "@/modules/products/ui/product/ProductInfoTabs";
import { ShareButton } from "@/modules/products/ui/product/ShareButton";
import { getKeysetPreviewData } from "@/modules/keyset-preview/constants/mock-colorways";

export function ProductView({
  product,
  componentGroups = [],
  componentRules = [],
  purchaseCount = 0,
  relatedSlot,
  boughtTogetherSlot,
}: {
  product: ProductDetail;
  componentGroups?: ConfiguratorGroup[];
  componentRules?: ComponentVariantRule[];
  purchaseCount?: number;
  relatedSlot?: ReactNode;
  boughtTogetherSlot?: ReactNode;
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
    isLowStock,
    effectiveStockQuantity,
    isLoadingAddToCart,
    handleAddToCart,
    disabledVariantIds,
    quantity,
    setQuantity,
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

  const minVariantPrice = useMemo(
    () =>
      variants.length > 0
        ? Math.min(...variants.map((v) => v.effective_price))
        : product.min_price,
    [variants, product.min_price]
  );

  const componentAdjustment = useMemo(
    () =>
      groups.reduce((sum, group) => {
        const ids = selections[group.component_group] ?? [];
        let groupSum = 0;
        for (const id of ids) {
          const v = group.variants.find((gv) => gv.id === id);
          groupSum += v?.price_adjustment ?? 0;
        }
        return sum + groupSum;
      }, 0),
    [groups, selections]
  );

  const displayPrice =
    groups.length > 0
      ? product.min_price + componentAdjustment
      : (selectedVariant?.effective_price ?? minVariantPrice);

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
  const keysetPreviewData = useMemo(
    () => getKeysetPreviewData(product.slug),
    [product.slug]
  );

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

      <main className="my-auto space-y-4 pb-12 md:pb-24">
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

        {/* ── Product Info ── */}
        <section className="!mt-0 px-4 md:rounded-2xl md:bg-surface md:p-4 md:shadow-ambient-sm">
          {/* <div className="mb-2 flex flex-wrap items-center gap-2">
            <ProductBadges badges={badges} purchaseCount={purchaseCount} />
          </div> */}
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
              {selectedVariant && selectedVariant.price_adjustment !== 0 && (
                <span className="text-sm text-on-surface-variant line-through opacity-60">
                  {formatVND(product.min_price)}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ── Configurator (variants + component groups) ── */}
        {hasConfigurator && (
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
        )}

        {/* ── Keyset preview (slug-gated, mock-data trial) ── */}
        {keysetPreviewData && (
          <section className="px-4">
            <KeysetPreviewSection colorway={keysetPreviewData} />
          </section>
        )}

        {/* ── Low stock urgency banner ── */}
        {isLowStock && effectiveStockQuantity > 0 && (
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
            className="px-4 md:rounded-2xl md:bg-surface md:p-4 md:shadow-ambient-sm"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-red-400/40 bg-red-50 px-4 py-3">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: "easeInOut",
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
              </motion.div>
              <div className="flex-1">
                <p className="text-sm font-black text-red-700">
                  Chỉ còn {effectiveStockQuantity} sản phẩm
                </p>
                <p className="text-xs text-red-600">Đặt ngay kẻo lỡ!</p>
              </div>
            </div>
          </motion.section>
        )}

        {/* ── Quantity stepper ── */}
        {/* {!isOutOfStock && (
          <section className="px-4">
            <div className="flex items-center justify-between rounded-2xl bg-surface-container-lowest px-4 py-3">
              <p className="text-xs font-black uppercase tracking-wider text-on-surface-variant">
                Số lượng
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-30"
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center text-base font-black text-on-surface">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setQuantity(Math.min(effectiveStockQuantity, quantity + 1))
                  }
                  disabled={quantity >= effectiveStockQuantity}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-30"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </section>
        )} */}

        {/* ── Pre-order Info Banner ── */}
        {selectedPreOrderConfig && (
          <section className="px-4 md:rounded-2xl md:bg-surface md:p-4 md:shadow-ambient-sm">
            <PreOrderBanner config={selectedPreOrderConfig} />
          </section>
        )}

        {/* ── Tabbed Info (Description / Specs / Shipping) ── */}
        <div className="mb-12 mt-12 md:mb-6 md:mt-0 md:rounded-2xl md:bg-surface md:p-4 md:shadow-ambient-sm">
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

      {/* ── Related Products ── */}
      {relatedSlot}

      {/* ── Bottom Action Bar ── */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
        className="fixed bottom-0 left-0 right-0 z-[100] flex items-center gap-2 rounded-t-2xl border-t border-outline-variant/20 bg-surface/95 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-float backdrop-blur-md"
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
            onClick={() => handleAddToCart(quantity)}
          />
        )}
      </motion.div>
    </article>
  );
}
