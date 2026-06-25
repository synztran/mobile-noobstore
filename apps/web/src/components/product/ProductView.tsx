"use client";

import type { ShopProduct } from "@/app/api/products/route";
import type {
  ComponentVariantRule,
  ConfiguratorGroup,
} from "@/app/api/products/[slug]/configurator/route";
import type { ProductDetail } from "@/app/api/products/[slug]/route";
import { TopNav } from "@/components/layout/TopNav";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import { ProductConfigurator } from "@/components/product/ProductConfigurator";
import { ProductCard } from "@/components/product/ProductCard";
import Icon from "@/components/ui/Icon";
import WishlistButton from "@/components/wishlist/WishlistButton";
import { useProductViewData } from "@/hooks/useProductViewData";
import { formatVND } from "@/lib/currency";
import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CopyToClipboardButton from "./CopyToClipboardButton";

export function ProductView({
  product,
  componentGroups = [],
  componentRules = [],
  relatedProducts = [],
}: {
  product: ProductDetail;
  componentGroups?: ConfiguratorGroup[];
  componentRules?: ComponentVariantRule[];
  relatedProducts?: ShopProduct[];
}) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
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
  } = useProductViewData(product, componentGroups, componentRules);

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
        const v = group.variants.find(
          (v) => v.id === selections[group.component_group]
        );
        return sum + (v?.price_adjustment ?? 0);
      }, 0),
    [groups, selections]
  );

  const displayPrice =
    groups.length > 0
      ? product.min_price + componentAdjustment
      : (selectedVariant?.effective_price ?? minVariantPrice);

  const heroImage = mediaImages[activeImageIndex] ?? product.thumbnail ?? null;

  const productTypeLabel =
    product.product_type === "kit"
      ? "Bộ sưu tập chọn lọc"
      : product.product_type === "component"
        ? "Phần tử module"
        : "Sản phẩm độc lập";

  const badges = useMemo(() => {
    const list: { label: string; className: string }[] = [];
    if (isOutOfStock) {
      list.push({
        label: "Hết hàng",
        className: "bg-surface-container-high text-on-surface-variant",
      });
    } else if (isLowStock) {
      list.push({
        label: `Chỉ còn ${effectiveStockQuantity}`,
        className: "bg-yellow-500 text-white",
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
    const items: { label: string; value: string }[] = [
      {
        label: "Loại sản phẩm",
        value: productTypeLabel,
      },
      {
        label: "Tình trạng kho",
        value: isOutOfStock
          ? "Hết hàng"
          : `${effectiveStockQuantity} sản phẩm có sẵn`,
      },
    ];
    if (product.brand) {
      items.push({ label: "Thương hiệu", value: product.brand });
    }
    if (variants.length > 0) {
      items.push({
        label: "Số lượng biến thể",
        value: `${variants.length} tùy chọn`,
      });
    }
    if (product.components.length > 0) {
      items.push({
        label: "Số lượng thành phần",
        value: `${product.components.length} thành phần curated`,
      });
    }
    if (hasDiscount) {
      items.push({
        label: "Giảm giá",
        value: `Giảm ${discountPercent}% (tiết kiệm ${formatVND(product.base_price - product.min_price)})`,
      });
    }
    return items;
  }, [
    productTypeLabel,
    isOutOfStock,
    effectiveStockQuantity,
    product.brand,
    variants.length,
    product.components.length,
    hasDiscount,
    discountPercent,
    product.base_price,
    product.min_price,
  ]);

  const editorialContent = useMemo(() => {
    if (product.description) {
      return product.description;
    }
    if (product.components.length > 0) {
      return "Each bundle component has been grouped to keep configuration intentional. Required parts define the core build, while optional parts let the setup stay personal without compromising the product's main character.";
    }
    return "This edition keeps the product presentation minimal and focused. Variant choices remain clear, stock states are visible up front, and the interaction model stays close to the tactile feel established in the quick-pick experience.";
  }, [product.description, product.components.length]);

  const editorialHeading = useMemo(() => {
    if (product.description) return product.name;
    if (product.product_type === "kit")
      return "Precision engineered for modern setups.";
    return "Designed with intention.";
  }, [product.description, product.name, product.product_type]);

  const hasConfigurator =
    loadingVariants ||
    loadingConfigurator ||
    variants.length > 0 ||
    groups.length > 0;
  const hasComponents = product.components.length > 0;

  useEffect(() => {
    setActiveImageIndex(0);
  }, [product.slug]);

  return (
    <>
      <TopNav showBack backHref="/shop" showCart showFavorite />

      <main className="my-auto space-y-2 pb-4">
        {/* ── Hero Image Gallery ── */}
        <section
          className="relative"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="p-6 pb-4">
            <div className="relative h-64 w-full overflow-hidden rounded-xl bg-surface-container-low shadow-[0_20px_48px_-20px_rgba(26,28,31,0.12)]">
              {heroImage ? (
                <Image
                  src={heroImage}
                  alt={product.name}
                  fill
                  className="object-cover mix-blend-multiply"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Icon
                    name="inventory_2"
                    className="text-9xl text-outline-variant opacity-40"
                  />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent" />
              {hasDiscount && (
                <div className="absolute right-3 top-3 rounded-md bg-red-500 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
                  -{discountPercent}%
                </div>
              )}
            </div>
          </div>
          {mediaImages.length > 1 && (
            <div className="flex justify-center gap-2 px-6">
              {mediaImages.map((img, i) => (
                <button
                  key={`${img}-${i}`}
                  type="button"
                  onClick={() => setActiveImageIndex(i)}
                  aria-label={`View image ${i + 1}`}
                  className={clsx(
                    "rounded-full transition-all",
                    i === activeImageIndex
                      ? "h-1 w-8 bg-primary"
                      : "h-1 w-2 bg-outline-variant"
                  )}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Product Info ── */}
        <section className="px-6">
          <div className="mb-3 flex flex-wrap gap-2">
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
          </div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="mb-1 text-sm font-black uppercase tracking-[0.18em] text-primary">
                {product.category}
              </p>
              <h1 className="text-2xl font-black uppercase leading-none text-on-surface">
                {product.name}
              </h1>
              {product.brand && (
                <p className="mt-1 text-xs font-semibold text-on-surface-variant">
                  bởi {product.brand}
                </p>
              )}
            </div>
            <CopyToClipboardButton
              value={product.slug}
              label="Copy product slug"
            />
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span
              className={clsx(
                "text-3xl font-black leading-none",
                hasDiscount ? "text-red-500" : "text-on-surface"
              )}
            >
              {formatVND(displayPrice)}
            </span>
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
        </section>

        {/* ── Configurator (variants + component groups) ── */}
        {hasConfigurator && (
          <section className="mt-10 px-6">
            <div className="space-y-4 rounded-2xl bg-surface-container-low p-3">
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

        {/* ── Pre-order Info Banner ── */}
        {selectedPreOrderConfig && (
          <section className="px-6">
            <div className="flex items-start gap-3 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4">
              <Icon
                name="schedule"
                className="mt-0.5 shrink-0 text-2xl text-violet-400"
              />
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-violet-400">
                  Sản phẩm đặt trước
                </p>
                <p className="text-sm font-bold text-on-surface">
                  Thời gian giao hàng dự kiến: {selectedPreOrderConfig.estimate}
                </p>
                {selectedPreOrderConfig.available_date && (
                  <p className="text-xs text-on-surface-variant">
                    Dự kiến có hàng: {selectedPreOrderConfig.available_date}
                  </p>
                )}
                {selectedPreOrderConfig.notes && (
                  <p className="text-xs text-on-surface-variant">
                    {selectedPreOrderConfig.notes}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Specs ── */}
        <section className="px-6">
          <div className="rounded-none bg-surface-container-low p-8">
            <h3 className="mb-6 text-xs font-black uppercase tracking-[0.2em] text-on-surface">
              Thông số kỹ thuật
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
              {specItems.map((item) => (
                <div key={item.label}>
                  <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
                    {item.label}
                  </p>
                  <p className="text-sm font-semibold leading-snug text-on-surface">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Editorial / Description ── */}
        <section className="mb-12 mt-12 px-6">
          <h3 className="mb-4 max-w-[14ch] text-[1.75rem] font-black leading-tight tracking-tight text-on-surface">
            {editorialHeading}
          </h3>
          <p className="mb-6 text-base font-light leading-relaxed text-on-surface-variant">
            {editorialContent}
          </p>
          {product.thumbnail && (
            <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-xl bg-surface-container-low">
              <Image
                src={product.thumbnail}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-black/20" />
            </div>
          )}
        </section>
      </main>

      {/* ── Related Products ── */}
      {relatedProducts.length > 0 && (
        <section className="px-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-lg font-black uppercase tracking-tight">
              Sản phẩm liên quan
            </div>
            {product.brand && (
              <Link
                href={`/shop?brand=${encodeURIComponent(product.brand)}`}
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary transition-all hover:gap-2"
              >
                Xem tất cả
                <ArrowRight size={10} />
              </Link>
            )}
          </div>
          <div className="hide-scrollbar flex gap-4 overflow-x-auto pb-2">
            {relatedProducts.map((rp) => (
              <div key={rp.id} className="w-[160px] flex-shrink-0">
                <ProductCard product={rp} isBundle />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Bottom Action Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-[100] flex gap-2 rounded-tl-3xl rounded-tr-3xl border-t border-outline-variant/20 bg-surface/95 px-6 py-4 backdrop-blur-md">
        <WishlistButton
          productId={product.id}
          showLabel
          className="h-14 w-14 flex-shrink-0 rounded-2xl"
        />
        <AddToCartButton
          isOutOfStock={isOutOfStock}
          missingVariantSelection={missingVariantSelection}
          missingConfiguration={missingConfiguration}
          isLoading={isLoadingAddToCart}
          isPreOrder={selectedPreOrderConfig !== null}
          onClick={handleAddToCart}
        />
      </div>
    </>
  );
}
