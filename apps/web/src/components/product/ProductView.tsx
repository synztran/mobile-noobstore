"use client";

import type {
  ComponentVariantRule,
  ConfiguratorGroup,
} from "@/app/api/products/[slug]/configurator/route";
import type { ProductDetail } from "@/app/api/products/[slug]/route";
import { TopNav } from "@/components/layout/TopNav";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import { StockAlertButton } from "@/components/product/StockAlertButton";
import { ProductThumbnailStrip } from "@/components/product/ProductThumbnailStrip";
import { ProductConfigurator } from "@/components/product/ProductConfigurator";
import Icon from "@/components/ui/Icon";
import WishlistButton from "@/components/wishlist/WishlistButton";
import { useProductViewData } from "@/hooks/useProductViewData";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { trackViewItem, toGAProduct } from "@/lib/analytics";
import { formatVND } from "@/lib/currency";
import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";

const ImageViewer = dynamic(
  () =>
    import("@/components/product/ImageViewer").then((m) => ({
      default: m.ImageViewer,
    })),
  { ssr: false }
);
import { PreOrderBanner } from "@/components/product/PreOrderBanner";
import { ProductInfoTabs } from "@/components/product/ProductInfoTabs";
import { SaleCountdown } from "@/components/product/SaleCountdown";
import { ShareButton } from "@/components/product/ShareButton";
import { Minus, Plus } from "lucide-react";
import CopyToClipboardButton from "./CopyToClipboardButton";

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
  const touchStartX = useRef<number | null>(null);

  const mediaImages = useMemo(() => {
    const all = [product.thumbnail, ...(product.images ?? [])].filter(
      (img): img is string => Boolean(img)
    );
    return Array.from(new Set(all));
  }, [product.thumbnail, product.images]);

  const goTo = useCallback(
    (idx: number) => {
      setActiveImageIndex((idx + mediaImages.length) % mediaImages.length);
    },
    [mediaImages.length]
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const delta = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(delta) > 40) goTo(activeImageIndex + (delta < 0 ? 1 : -1));
      touchStartX.current = null;
    },
    [activeImageIndex, goTo]
  );

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

  const heroImage = mediaImages[activeImageIndex] ?? product.thumbnail ?? null;

  // ── Preload all gallery images so thumbnail switches are instant ──
  useEffect(() => {
    for (const src of mediaImages) {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = src;
      document.head.appendChild(link);
    }
    return () => {
      // clean up preload links on unmount / gallery change
      document.querySelectorAll('link[rel="preload"][as="image"]').forEach((el) => el.remove());
    };
  }, [mediaImages]);

  const badges = useMemo(() => {
    const list: { label: string; className: string }[] = [];
    if (isOutOfStock) {
      list.push({
        label: "Hết hàng",
        className: "bg-surface-container-high text-on-surface-variant",
      });
    }

    if (product.is_used) {
      list.push({
        label: "Đã qua sử dụng",
        className: "bg-yellow-600 text-white",
      });
    }
    if (product.is_pre_order) {
      list.push({ label: "Đặt trước", className: "bg-violet-500 text-white" });
    }
    if (hasDiscount) {
      list.push({
        label: `-${discountPercent}%`,
        className: "bg-red-500 text-white",
      });
    }
    if (list.length === 0) {
      list.push({
        label:
          variants.length > 0
            ? `${variants.length} tùy chọn`
            : "Sẵn sàng để giao",
        className: "bg-primary text-white",
      });
    }
    return list;
  }, [
    isOutOfStock,
    isLowStock,
    effectiveStockQuantity,
    product.is_used,
    product.is_pre_order,
    hasDiscount,
    discountPercent,
    variants.length,
  ]);

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

  const heroRef = useRef<HTMLDivElement>(null);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomOrigin({ x, y });
  }, []);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [product.slug]);

  return (
    <div className="pb-4">
      <TopNav showBack backHref="/shop" showCart showFavorite />

      <main className="my-auto space-y-4 pb-12">
        {/* ── Hero Image Gallery ── */}
        <section
          className="relative space-y-3 p-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            ref={heroRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="relative h-80 w-full overflow-hidden rounded-2xl bg-surface-container-low shadow-ambient-sm"
          >
            <button
              type="button"
              aria-label="Xem ảnh sản phẩm"
              onClick={() => mediaImages.length > 0 && setImageViewerOpen(true)}
              className="relative h-full w-full"
            >
              {heroImage ? (
                <div
                  className="absolute inset-0 transition-transform duration-200 md:group-hover:scale-150"
                  style={
                    isHovering
                      ? {
                          transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                          transform: "scale(1.5)",
                        }
                      : undefined
                  }
                >
                  <Image
                    key={heroImage}
                    src={heroImage}
                    alt={product.name}
                    fill
                    className="animate-fade-in object-cover mix-blend-multiply"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority={activeImageIndex === 0}
                  />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Icon
                    name="inventory_2"
                    className="text-9xl text-outline-variant opacity-40"
                  />
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent" />
              {mediaImages.length > 0 && (
                <div
                  aria-hidden="true"
                  className="absolute bottom-2 right-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm"
                >
                  {activeImageIndex + 1}/{mediaImages.length}
                </div>
              )}
              {hasDiscount && (
                <div
                  aria-hidden="true"
                  className="absolute right-3 top-3 rounded-md bg-red-500 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg"
                >
                  -{discountPercent}%
                </div>
              )}
              {product.sale_ends_at && (
                <div className="absolute left-3 top-3" aria-hidden="true">
                  <SaleCountdown endsAt={product.sale_ends_at} />
                </div>
              )}
            </button>
          </div>
          <ProductThumbnailStrip
            images={mediaImages}
            activeIndex={activeImageIndex}
            onSelect={setActiveImageIndex}
            productName={product.name}
          />
        </section>

        {/* ── Product Info ── */}
        <section className="!mt-0 px-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {badges.map((badge) => (
              <span
                key={badge.label}
                className={clsx(
                  "rounded px-2 py-1 text-[10px] font-black uppercase tracking-widest",
                  badge.className
                )}
              >
                {badge.label}
              </span>
            ))}
            {purchaseCount > 0 && (
              <span className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                <svg
                  viewBox="0 0 24 24"
                  className="h-3 w-3"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                Đã bán {purchaseCount}
              </span>
            )}
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
          <section className="px-4">
            <div className="text-sm font-black uppercase tracking-wider text-on-surface-variant">
              Lựa chọn cấu hình
            </div>
            <div className="space-y-4 rounded-xl bg-surface-container-low p-4">
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
                <ProductConfigurator
                  groups={groups}
                  variants={variants}
                  selections={selections}
                  loadingConfigurator={loadingConfigurator}
                  basePrice={product.base_price}
                  onSelect={select}
                  isHideComppGroup
                  disabledVariantIds={disabledVariantIds}
                />
              )}
            </div>
          </section>
        )}

        {/* ── Low stock urgency banner ── */}
        {isLowStock && effectiveStockQuantity > 0 && (
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
            className="px-4"
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
          <section className="px-4">
            <PreOrderBanner config={selectedPreOrderConfig} />
          </section>
        )}

        {/* ── Tabbed Info (Description / Specs / Shipping) ── */}
        <div className="mb-12 mt-12">
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
          className="space-y-2 px-4"
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
          images={mediaImages}
          initialIndex={activeImageIndex}
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
    </div>
  );
}
