"use client";

import type { ShopProduct } from "@/modules/products/types";
import { PreOrderBanner } from "@/modules/products/ui/product/PreOrderBanner";
import { ProductConfigurator } from "@/modules/products/ui/product/ProductConfigurator";
import { Thumbnail } from "@/components/ui/Thumbnail";
import { formatVND } from "@/lib/currency";
import type { CategoryItem } from "@/modules/products/server/ssr";
import { useQuickPickDrawer } from "@/modules/products/ui/product/useQuickPickDrawer";
import clsx from "clsx";
import Image from "@/components/ui/AdaptiveImage";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DeliveryAvailabilitySection } from "./DeliveryAvailabilitySection";
import { SelectedConditionSummary } from "./SelectedConditionSummary";
import { cardPricingFor } from "./card-pricing";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Images,
  Package,
  ShoppingCart,
} from "lucide-react";

// Lazy: the full-screen viewer is only needed after a tap, keep it out of the
// drawer's initial bundle.
const ImageViewer = dynamic(
  () => import("./ImageViewer").then((m) => ({ default: m.ImageViewer })),
  { ssr: false }
);

// ─── Add to Cart Button ─────────────────────────────────────────────────────

type AddToCartButtonProps = {
  isSubmitting: boolean;
  isFetchingVariants: boolean;
  canAdd: boolean;
  hasComponents: boolean;
  isInvalidPrice: boolean;
  isPreOrder: boolean;
  onClick: () => void;
};

function AddToCartButton({
  isSubmitting,
  isFetchingVariants,
  canAdd,
  hasComponents,
  isInvalidPrice,
  isPreOrder,
  onClick,
}: AddToCartButtonProps) {
  const isLoading = isSubmitting || isFetchingVariants;
  const isDisabled = isLoading || isInvalidPrice || (!canAdd && hasComponents);
  const isActive = !isDisabled;

  function renderLabel() {
    if (isLoading) {
      return (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
      );
    }
    if (isInvalidPrice) {
      return "Chưa có giá";
    }
    if (!canAdd && hasComponents) {
      return "Vui lòng chọn";
    }
    if (isPreOrder) {
      return (
        <>
          <Clock className="h-5 w-5" />
          ĐẶT TRƯỚC
        </>
      );
    }
    return (
      <>
        <ShoppingCart className="h-5 w-5" />
        THÊM VÀO GIỎ
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={clsx(
        "btn-md flex flex-1 items-center justify-center gap-2 rounded-xl text-sm font-black uppercase tracking-widest text-white transition-all active:scale-[0.98]",
        isActive
          ? "bg-gradient-to-r from-primary to-primary-container"
          : "cursor-not-allowed bg-outline/30"
      )}
    >
      {renderLabel()}
    </button>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type QuickPickDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
} & (
  | { mode?: "product"; product: ShopProduct | null; category?: never }
  | { mode: "category"; category: CategoryItem | null; product?: never }
);

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickPickDrawer(props: QuickPickDrawerProps) {
  const { isOpen, onClose, product } = props;
  const isCategoryMode = props.mode === "category";
  const propCategory: CategoryItem | null = isCategoryMode
    ? (props.category ?? null)
    : null;
  const propProduct: ShopProduct | null = isCategoryMode
    ? null
    : (props.product ?? null);

  const drawer = useQuickPickDrawer({
    isOpen,
    onClose,
    isCategoryMode,
    propCategory,
    propProduct,
  });

  // Gallery for the full-screen viewer: image requested by the condition
  // summary first (when tapped), else the active image, then the rest of the
  // product's media, deduped.
  const [viewerStart, setViewerStart] = useState<string | null>(null);
  const viewerImages = useMemo(() => {
    const all = [
      viewerStart,
      drawer.activeThumbnail,
      drawer.activeProduct?.thumbnail,
      ...(drawer.activeProduct?.images ?? []),
    ];
    return Array.from(new Set(all.filter(Boolean))) as string[];
  }, [viewerStart, drawer.activeThumbnail, drawer.activeProduct]);

  const openViewerAt = useCallback(
    (image: string) => {
      setViewerStart(image);
      drawer.openViewer();
    },
    [drawer]
  );

  const closeViewer = useCallback(() => {
    setViewerStart(null);
    drawer.closeViewer();
  }, [drawer]);

  // Configurator main image: a fixed product gallery that never follows
  // variant taps. Dots + swipe browse the media; a tap opens the viewer.
  const configGallery = useMemo(() => {
    const all = [
      drawer.activeProduct?.thumbnail,
      ...(drawer.activeProduct?.images ?? []),
    ].filter(Boolean) as string[];
    return Array.from(new Set(all));
  }, [drawer.activeProduct]);

  // Same pricing rule the cards use: a quantity-tiered product (70 / 90 / 110
  // packs as variants) quotes its cheapest pack, which has to be labelled
  // rather than read as the price of every pack size.
  const activePricing = useMemo(
    () =>
      drawer.activeProduct
        ? cardPricingFor(drawer.activeProduct)
        : { amount: 0, showFrom: false, showDiscount: false, unpriced: true },
    [drawer.activeProduct]
  );

  const [configImgIndex, setConfigImgIndex] = useState(0);
  const configSwipeStartX = useRef<number | null>(null);
  const configSwipedRef = useRef(false);

  useEffect(() => {
    setConfigImgIndex(0);
  }, [drawer.activeProduct?.id]);

  const handleConfigTouchStart = useCallback((e: React.TouchEvent) => {
    configSwipeStartX.current = e.touches[0].clientX;
    configSwipedRef.current = false;
  }, []);

  const handleConfigTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (configSwipeStartX.current === null || configGallery.length <= 1)
        return;
      const delta = e.changedTouches[0].clientX - configSwipeStartX.current;
      configSwipeStartX.current = null;
      if (Math.abs(delta) > 40) {
        if (e.cancelable) e.preventDefault();
        configSwipedRef.current = true;
        setConfigImgIndex(
          (prev) =>
            (prev + (delta < 0 ? 1 : -1) + configGallery.length) %
            configGallery.length
        );
      }
    },
    [configGallery.length]
  );

  // A swipe fires a trailing click; suppress it so the gesture cycles images
  // instead of opening the viewer.
  const handleConfigThumbClick = useCallback(
    (e: React.MouseEvent) => {
      if (configSwipedRef.current) {
        configSwipedRef.current = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      drawer.openViewer();
    },
    [drawer]
  );

  // ── Render helpers ────────────────────────────────────────────────────
  const renderProductList = () => (
    <div className="space-y-3">
      {drawer.loadingProducts &&
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex animate-pulse items-center gap-3">
            <div className="h-16 w-16 flex-shrink-0 rounded-xl bg-surface-container" />
            <div className="flex-1 space-y-2">
              <div className="h-2.5 w-20 rounded-full bg-surface-container" />
              <div className="h-3 w-4/5 rounded-full bg-surface-container" />
              <div className="h-2.5 w-1/3 rounded-full bg-surface-container" />
            </div>
          </div>
        ))}

      {!drawer.loadingProducts && drawer.products.length === 0 && (
        <p className="py-8 text-center text-sm text-on-surface-variant">
          Không có sản phẩm nào
        </p>
      )}

      {!drawer.loadingProducts &&
        drawer.products.map((p) => {
          const pricing = cardPricingFor(p);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => drawer.selectProduct(p.id)}
              className="flex w-full items-center gap-3 rounded-2xl bg-surface-container p-3 text-left transition-transform active:scale-[0.98]"
            >
              <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-surface-container-high">
                {p.thumbnail ? (
                  <Image
                    src={p.thumbnail}
                    alt={p.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Package className="h-6 w-6 text-outline-variant" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-0.5 text-[10px] font-black uppercase leading-none tracking-wider text-primary">
                  {p.category}
                </p>
                <p className="line-clamp-2 text-sm font-black uppercase leading-tight text-on-surface">
                  {p.name}
                </p>
                <p className="mt-1 text-xs font-bold text-primary">
                  {/* Quantity-tiered products (e.g. 70 / 90 / 110 packs) advertise
                      their cheapest pack here, so the figure needs qualifying. */}
                  {pricing.showFrom && (
                    <span className="font-medium text-on-surface-variant">
                      giá chỉ từ&nbsp;
                    </span>
                  )}
                  {formatVND(pricing.amount)}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 flex-shrink-0 text-outline-variant" />
            </button>
          );
        })}
    </div>
  );

  const renderConfigurator = () => (
    <div className="flex min-h-0 flex-col gap-2">
      {drawer.activeProduct && (
        <div className="flex items-center gap-2">
          <div className="relative flex-shrink-0">
            <button
              type="button"
              aria-label="Xem ảnh lớn"
              onClick={handleConfigThumbClick}
              onTouchStart={handleConfigTouchStart}
              onTouchEnd={handleConfigTouchEnd}
              className="group/thumb relative block transition-transform active:scale-95"
            >
              <Thumbnail
                src={configGallery[configImgIndex]}
                alt={drawer.activeProduct.name}
                className="h-20 w-24 rounded-xl"
              />
              <span className="absolute bottom-1 right-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-surface/80 text-on-surface-variant backdrop-blur-sm group-active/thumb:bg-surface">
                <Images size={16} />
              </span>
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-bold leading-tight text-on-surface">
              {drawer.activeProduct.name}
            </p>
            <p className="mt-0.5 font-bold text-primary">
              {activePricing.showFrom && (
                <span className="text-xs font-black text-slate-600">
                  Giá từ
                </span>
              )}
              {activePricing.showFrom && <>&nbsp;</>}
              {formatVND(activePricing.amount)}
            </p>
          </div>
        </div>
      )}
      {drawer.activeProduct?.gifts && drawer.activeProduct.gifts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {drawer.activeProduct.gifts.map((g) => (
            <div
              key={g.gift_name}
              className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2"
            >
              <span className="text-base leading-none">🎁</span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-rose-500">
                  Quà tặng kèm
                </p>
                <p className="truncate text-xs font-bold text-rose-700">
                  {g.gift_name}
                  {g.quantity > 1 && ` x${g.quantity}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex min-h-0 flex-col gap-2">
        <DeliveryAvailabilitySection
          variants={drawer.activeProduct?.variants ?? []}
          selectedVariants={drawer.selectedVariants}
        />
        <SelectedConditionSummary
          groups={drawer.groups}
          selections={drawer.selections}
          productVariants={drawer.activeProduct?.variants ?? []}
          onShowImage={openViewerAt}
        />
        <ProductConfigurator
          groups={drawer.groups}
          variants={drawer.activeProduct?.variants ?? []}
          selections={drawer.selections}
          loadingConfigurator={drawer.loadingConfigurator}
          basePrice={drawer.activeProduct?.base_price}
          disabledVariantIds={drawer.disabledVariantIds}
          onSelect={drawer.onSelect}
        />
        {drawer.selectedPreOrderConfig && (
          <PreOrderBanner config={drawer.selectedPreOrderConfig} />
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[60] !mt-0 bg-on-surface/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="drawer"
            className="fixed bottom-0 left-0 right-0 z-[999] flex max-h-[80dvh] flex-col rounded-t-3xl bg-[#f2f2f2] shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 28,
              stiffness: 300,
              mass: 0.8,
            }}
          >
            {/* Handle */}
            <div className="flex flex-shrink-0 justify-center pb-1 pt-3">
              <div className="h-1 w-10 rounded-full bg-outline-variant" />
            </div>

            {/* Header */}
            <div className="flex-shrink-0 px-4 py-2">
              <div className="flex items-center justify-between gap-3">
                {isCategoryMode && drawer.view === "configurator" && (
                  <button
                    type="button"
                    aria-label="Quay lại danh sách"
                    onClick={drawer.backToList}
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-surface-container transition-transform active:scale-90"
                  >
                    <ArrowLeft className="h-5 w-5 text-on-surface" />
                  </button>
                )}

                <div className="flex min-w-0 flex-1 items-center justify-between">
                  <span className="text-sm font-bold uppercase leading-none tracking-widest text-primary">
                    Thêm nhanh sản phẩm
                  </span>
                  <button
                    onClick={onClose}
                    className="rounded-xl border border-outline-variant/40 bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface transition-all active:scale-90"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-3 h-[0.25px] w-full border-b border-slate-200" />

            {/* Scrollable body */}
            <div
              data-allow-scroll
              className="max-h-full min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 pb-4"
            >
              {drawer.view === "product-list"
                ? renderProductList()
                : renderConfigurator()}
            </div>

            {/* Sticky footer (only in configurator view) */}
            {drawer.view === "configurator" && (
              <div className="grid grid-cols-[1fr_1fr] items-center gap-2 border-t border-outline-variant/20 px-4 py-4">
                <div className="w-full">
                  <p className="text-base font-semibold text-on-surface-variant">
                    Tạm tính
                  </p>
                  <p className="text-xl font-black text-primary">
                    {formatVND(Math.max(0, drawer.totalPrice))}
                  </p>
                </div>
                <AddToCartButton
                  isSubmitting={drawer.isSubmittingOrPending}
                  isFetchingVariants={drawer.isFetchingVariants}
                  canAdd={drawer.canAdd}
                  hasComponents={drawer.hasComponents}
                  isInvalidPrice={drawer.isInvalidPrice}
                  isPreOrder={drawer.selectedPreOrderConfig !== null}
                  onClick={drawer.handleAdd}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen image viewer (renders above the drawer) */}
      <ImageViewer
        images={viewerImages}
        initialIndex={0}
        isOpen={drawer.imageViewerOpen}
        onClose={closeViewer}
      />
    </>
  );
}
