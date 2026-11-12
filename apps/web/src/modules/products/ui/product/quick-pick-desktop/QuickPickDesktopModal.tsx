"use client";

import { useEffect, useMemo, useRef } from "react";
import { DesktopVariantGroup } from "./DesktopVariantGroup";
import { DesktopConditionSummary } from "./DesktopConditionSummary";
import { DesktopProductHeader } from "./DesktopProductHeader";
import { DesktopBrandPanel } from "./DesktopBrandPanel";
import { PreOrderBanner } from "@/modules/products/ui/product/PreOrderBanner";
import { DeliveryAvailabilitySection } from "@/modules/products/ui/product/DeliveryAvailabilitySection";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Clock, RotateCcw, ShoppingCart, X } from "lucide-react";
import { formatVND } from "@/lib/currency";
import type { QuickPickDrawerModel } from "../quick-pick-types";
import type { ConfiguratorGroup, ShopVariant } from "@/modules/products/types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  isCategoryMode: boolean;
  drawer: QuickPickDrawerModel;
  onShowImage: (image: string) => void;
  reduceMotion: boolean;
};

export function QuickPickDesktopModal({ isOpen, onClose, isCategoryMode, drawer, onShowImage, reduceMotion }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelector<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex='-1'])");
    focusable?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex='-1'])")).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  const product = drawer.activeProduct;
  const simpleSelectedVariant = product?.variants.find((variant) => variant.id === drawer.selections["__variant__"]?.[0]);
  const productPreorderConfig = simpleSelectedVariant?.is_pre_order ? simpleSelectedVariant.pre_order_config : null;
  const hasProductPreorder = Boolean(productPreorderConfig);
  const title = isCategoryMode ? (drawer.headerCategory || "Thêm nhanh sản phẩm") : (drawer.headerTitle || product?.name || "Thêm nhanh sản phẩm");
  const priceLabel = product?.product_type === "kit" && product.from_price != null ? "Giá từ" : null;

  const variantGroups = useMemo<ConfiguratorGroup[]>(() => {
    if (!product) return [];
    if (drawer.groups.length) {
      return drawer.groups.map((group) => ({
        ...group,
        component_group: group.component_group
          .replace(/^Layout$/i, "Kích thước")
          .replace(/^Màu vỏ$/i, "Màu sắc")
          .replace(/^Keycap set$/i, "Keycap"),
      }));
    }
    const variants = product.variants as ShopVariant[];
    if (!variants.length) return [];
    return [{
      component_group: "Phiên bản",
      is_required: true,
      variants: variants.map((variant) => ({
        id: variant.id,
        variant_name: variant.variant_name,
        price_adjustment: variant.price_adjustment,
        thumbnail: variant.thumbnail,
        stock_quantity: variant.stock_quantity,
        is_pre_order: variant.is_pre_order,
        pre_order_config: variant.pre_order_config,
        attributes: variant.attributes,
        component_product_id: product.id,
      })),
    }];
  }, [product, drawer.groups]);
  const requiredGroupCount = variantGroups.filter((group) => group.is_required).length;
  const isIncomplete = requiredGroupCount > 0 && !drawer.canAdd;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
          <motion.div
            aria-hidden="true"
            className="fixed inset-0 z-[900] !mt-0 bg-on-surface/35 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-pick-desktop-title"
            className="fixed inset-3 z-[901] mx-auto my-auto flex h-[min(70vh,calc(100dvh-24px))] w-[min(70vw,1360px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-outline-variant/50 bg-surface-container-lowest text-on-surface shadow-2xl focus:outline-none"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(10px) scale(0.98)" }}
            animate={{ opacity: 1, transform: "translateY(0) scale(1)" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(6px) scale(0.99)" }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex h-[62px] shrink-0 items-center justify-between gap-3 border-b border-[#eee5df] bg-white px-4 sm:px-[18px]">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] bg-[#fae9e1] text-[#9b3f1c]"><ShoppingCart className="h-[17px] w-[17px]" aria-hidden="true"/></span>
                <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#9b3f1c]">Thêm nhanh sản phẩm</p><h2 id="quick-pick-desktop-title" className="mt-0.5 truncate text-base font-extrabold leading-tight text-[#211916]">{title}</h2></div>
              </div>
              <button type="button" aria-label="Đóng" onClick={onClose} className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] border border-[#e8ddd7] bg-white text-lg text-[#66534b] transition-colors hover:bg-[#faf8f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9b3f1c]"><X className="h-4 w-4"/></button>
            </header>

            <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)]">
              <DesktopBrandPanel activeProduct={product} alternatives={isCategoryMode ? drawer.brandAlternatives : []} loading={isCategoryMode && drawer.loadingBrandAlternatives} loadingGallery={drawer.loadingGallery} showBrandAlternatives={isCategoryMode} onSelect={drawer.selectProduct} onShowImage={onShowImage}/>
              <main className="flex min-h-0 min-w-0 flex-col">
                {product ? (
                  <DesktopProductHeader product={product} selectedVariant={simpleSelectedVariant} preorderConfig={productPreorderConfig} showThumbnail={true}/>
                ) : isCategoryMode && drawer.loadingProducts ? (
                  <div className="flex shrink-0 items-center gap-3 border-b border-[#eee5df] px-5 py-4"><div className="h-[62px] w-[62px] animate-pulse rounded-xl bg-[#eee9e1]"/><div className="space-y-2"><div className="h-3 w-40 animate-pulse rounded bg-[#eee9e1]"/><div className="h-3 w-24 animate-pulse rounded bg-[#eee9e1]"/></div></div>
                ) : (
                  <div className="flex shrink-0 items-center gap-3 border-b border-[#eee5df] px-5 py-4"><div className="grid h-14 w-14 place-items-center rounded-xl bg-[#eee9e1]"><ShoppingCart className="h-6 w-6 text-[#9b8b83]" aria-hidden="true"/></div><p className="text-sm font-semibold text-[#76675f]">{isCategoryMode ? "Không có sản phẩm trong danh mục này." : "Không tìm thấy thông tin sản phẩm."}</p></div>
                )}

                <div data-allow-scroll className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 py-[13px]">
                  <div className="mb-[9px] flex items-center justify-between gap-3"><h3 className="text-sm font-black text-[#211916]">Tuỳ chỉnh</h3><button type="button" onClick={() => product && drawer.selectProduct(product.id)} disabled={!product} className="flex h-8 items-center gap-1.5 rounded-lg border border-[#e3d8d1] bg-white px-3 text-[11px] font-bold text-[#6d5c54] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9b3f1c] disabled:invisible"><RotateCcw className="h-3 w-3"/>Đặt lại</button></div>
                  {product ? <div className="space-y-3">
                    {product.gifts?.length ? <div className="flex flex-wrap gap-2">{product.gifts.map((gift) => <span key={gift.gift_slug} className="rounded-lg bg-[#fff1ea] px-2 py-1 text-[10px] font-bold text-[#8d3e20]">Quà tặng: {gift.gift_name}{gift.quantity > 1 ? ` ×${gift.quantity}` : ""}</span>)}</div> : null}
                    <DeliveryAvailabilitySection variants={product.variants} selectedVariants={drawer.selectedVariants} twoColumns/>
                    {drawer.loadingConfigurator ? <div className="space-y-2">{[0,1].map((i) => <div key={i} className="h-24 animate-pulse rounded-[11px] bg-[#f7f3ef]" />)}</div> : <DesktopVariantGroup groups={variantGroups} selections={drawer.selections} disabledVariantIds={drawer.disabledVariantIds} onSelect={(group, id) => {
                      const sourceGroup = drawer.groups.find((item) => item.component_group
                        .replace(/^Layout$/i, "Kích thước")
                        .replace(/^Màu vỏ$/i, "Màu sắc")
                        .replace(/^Keycap set$/i, "Keycap") === group)?.component_group;
                      drawer.onSelect(sourceGroup ?? group, id);
                    }}/>}
                    <DesktopConditionSummary groups={variantGroups} selections={drawer.selections}/>
                    {drawer.selectedPreOrderConfig && !hasProductPreorder && <PreOrderBanner config={drawer.selectedPreOrderConfig}/>}
                  </div> : isCategoryMode && drawer.loadingProducts ? <div className="space-y-2">{[0,1,2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-[#f7f3ef]" />)}</div> : <p className="py-10 text-center text-sm text-[#76675f]">{isCategoryMode ? "Đang tải thông tin cấu hình…" : "Không thể tải sản phẩm này."}</p>}
                </div>

                <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-[#eee5df] bg-white px-5 py-[11px] shadow-[0_-5px_16px_rgba(55,35,24,0.04)]">
                  <div><p className="text-[8px] font-extrabold uppercase tracking-[0.12em] text-[#76675f]">Tạm tính cấu hình</p><p className={`mt-px font-black tabular-nums text-[#9b3f1c] ${isIncomplete ? "text-sm" : "text-lg"}`}>{isIncomplete ? "Vui lòng chọn option" : formatVND(Math.max(0, drawer.totalPrice))}</p></div>
                  <button type="button" disabled={!product || drawer.loadingProducts || drawer.isSubmittingOrPending || drawer.isFetchingVariants || drawer.isInvalidPrice || (!drawer.canAdd && drawer.hasComponents)} onClick={drawer.handleAdd} className="flex h-10 min-w-[185px] items-center justify-center gap-2.5 rounded-[10px] bg-gradient-to-r from-[#9b3f1c] to-[#bb5732] px-5 text-[10px] font-black uppercase tracking-[0.1em] text-white hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:from-[#d2c7c1] disabled:to-[#d2c7c1] disabled:text-[#76675f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9b3f1c]">
                    {drawer.isSubmittingOrPending || drawer.isFetchingVariants ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-label="Đang xử lý"/> : drawer.selectedPreOrderConfig ? <><Clock className="h-4 w-4"/>Đặt trước</> : <><ShoppingCart className="h-4 w-4"/>Thêm vào giỏ<ArrowRight className="h-3.5 w-3.5"/></>}
                  </button>
                </footer>
              </main>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
