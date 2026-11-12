"use client";

import { ProductConfigurator } from "@/modules/products/ui/product/ProductConfigurator";
import { PreOrderBanner } from "@/modules/products/ui/product/PreOrderBanner";
import { SelectedConditionSummary } from "@/modules/products/ui/product/SelectedConditionSummary";
import { DeliveryAvailabilitySection } from "./DeliveryAvailabilitySection";
import { QuickPickDesktopBrandList } from "./QuickPickDesktopBrandList";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Clock, ShoppingCart, X } from "lucide-react";
import { ImageViewer } from "./ImageViewer";
import Image from "next/image";
import { formatVND } from "@/lib/currency";
import type { QuickPickDrawerModel } from "./quick-pick-types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  isCategoryMode: boolean;
  drawer: QuickPickDrawerModel;
  onShowImage: (image: string) => void;
  reduceMotion: boolean;
  viewerImages: string[];
  onCloseViewer: () => void;
};

export function QuickPickDesktopModal({ isOpen, onClose, isCategoryMode, drawer, onShowImage, reduceMotion, viewerImages, onCloseViewer }: Props) {
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
        onClose();
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
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  const product = drawer.activeProduct;
  const simpleSelectedVariant = product?.variants.find((variant) => variant.id === drawer.selections["__variant__"]?.[0]);
  const productPreorderConfig = simpleSelectedVariant?.is_pre_order ? simpleSelectedVariant.pre_order_config : null;
  const hasProductPreorder = Boolean(productPreorderConfig);
  const pricingLabel = product?.product_type === "kit" && product.from_price != null ? "Giá từ" : null;
  const productPrice = product ? (product.from_price ?? product.min_price ?? product.base_price) : 0;
  const title = isCategoryMode ? (drawer.headerCategory || "Thêm nhanh sản phẩm") : (drawer.headerTitle || product?.name || "Thêm nhanh sản phẩm");

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Đóng cửa sổ thêm nhanh"
            className="fixed inset-0 z-[900] !mt-0 cursor-default bg-on-surface/35 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-pick-desktop-title"
            className="fixed inset-4 z-[901] mx-auto my-auto flex h-[min(620px,calc(100dvh-32px))] w-[min(1060px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-outline-variant/50 bg-surface-container-lowest text-on-surface shadow-2xl focus:outline-none"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(10px) scale(0.98)" }}
            animate={{ opacity: 1, transform: "translateY(0) scale(1)" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(6px) scale(0.99)" }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex h-[62px] shrink-0 items-center justify-between gap-3 border-b border-outline-variant/30 bg-surface px-5">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-primary">Thêm nhanh sản phẩm</p>
                <h2 id="quick-pick-desktop-title" className="truncate text-base font-extrabold leading-tight">{title}</h2>
              </div>
              <button type="button" aria-label="Đóng" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-outline-variant/40 bg-surface-container text-on-surface transition-colors hover:bg-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><X className="h-4 w-4"/></button>
            </header>

            <div className={`grid min-h-0 flex-1 ${isCategoryMode ? "grid-cols-[220px_minmax(0,1fr)]" : "grid-cols-1"}`}>
              {isCategoryMode && <QuickPickDesktopBrandList activeProduct={product} alternatives={drawer.brandAlternatives} loading={drawer.loadingBrandAlternatives} onSelect={drawer.selectProduct} onShowImage={onShowImage}/>}
              <main className="flex min-h-0 min-w-0 flex-col">
                {product ? (
                  <section className="flex shrink-0 items-center gap-3 border-b border-outline-variant/25 bg-surface px-5 py-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-container-high">
                      {product.thumbnail && <Image src={product.thumbnail} alt="" fill sizes="64px" className="object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black uppercase tracking-[0.13em] text-primary">{product.brand ?? ""}{product.brand ? " · " : ""}{product.category}</p>
                      <h3 className="mt-0.5 line-clamp-2 text-sm font-black leading-tight">{product.name}</h3>
                      <p className="mt-1 text-sm font-black text-primary">{pricingLabel && <span className="mr-1 text-[10px]">{pricingLabel}</span>}{formatVND(productPrice)}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5"><span className="rounded-md bg-surface-container px-1.5 py-0.5 text-[9px] font-bold text-on-surface-variant">{product.stock_quantity > 0 ? `Còn hàng · ${product.stock_quantity}` : product.is_pre_order ? "Đặt trước" : "Hết hàng"}</span>{!product.is_pre_order && <span className="rounded-md bg-surface-container px-1.5 py-0.5 text-[9px] font-bold text-on-surface-variant">Bảo hành theo sản phẩm</span>}</div>
                    {hasProductPreorder && <div className="mt-2"><PreOrderBanner config={productPreorderConfig!}/></div>}
                    </div>
                  </section>
                ) : (
                  <div className="flex shrink-0 items-center gap-3 border-b border-outline-variant/25 px-5 py-4"><div className="h-14 w-14 animate-pulse rounded-xl bg-surface-container"/><div className="space-y-2"><div className="h-3 w-40 animate-pulse rounded bg-surface-container"/><div className="h-3 w-24 animate-pulse rounded bg-surface-container"/></div></div>
                )}

                <div data-allow-scroll className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 py-3">
                  <div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="text-xs font-black uppercase tracking-wide">Tuỳ chỉnh cấu hình</h3><p className="mt-0.5 text-[10px] text-on-surface-variant">Tình trạng và tồn kho hiển thị theo từng lựa chọn</p></div><button type="button" onClick={() => drawer.selectProduct(product?.id ?? "")} className="hidden text-[10px] font-bold text-primary hover:underline">Đặt lại</button></div>
                  {product ? <div className="space-y-3">
                    {product.gifts?.length ? <div className="flex flex-wrap gap-2">{product.gifts.map((gift) => <span key={gift.gift_slug} className="rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700">Quà tặng: {gift.gift_name}{gift.quantity > 1 ? ` ×${gift.quantity}` : ""}</span>)}</div> : null}
                    <DeliveryAvailabilitySection variants={product.variants} selectedVariants={drawer.selectedVariants}/>
                    <ProductConfigurator groups={drawer.groups} variants={product.variants} selections={drawer.selections} loadingConfigurator={drawer.loadingConfigurator} basePrice={product.base_price} disabledVariantIds={drawer.disabledVariantIds} onSelect={drawer.onSelect} showTitle={false} showStockInline/>
                    <SelectedConditionSummary groups={drawer.groups} selections={drawer.selections} productVariants={product.variants} onShowImage={onShowImage}/>
                    {drawer.selectedPreOrderConfig && !hasProductPreorder && <PreOrderBanner config={drawer.selectedPreOrderConfig}/>}
                  </div> : drawer.loadingConfigurator ? <div className="space-y-3">{[0,1,2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-container" />)}</div> : <p className="py-10 text-center text-sm text-on-surface-variant">Không có sản phẩm để cấu hình.</p>}
                </div>

                <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-outline-variant/30 bg-surface px-5 py-3 shadow-[0_-5px_16px_rgba(55,35,24,0.05)]">
                  <div><p className="text-[9px] font-black uppercase tracking-[0.12em] text-on-surface-variant">Tạm tính cấu hình</p><p className="mt-0.5 text-lg font-black text-primary">{formatVND(Math.max(0, drawer.totalPrice))}</p></div>
                  <button type="button" disabled={drawer.isSubmittingOrPending || drawer.isFetchingVariants || drawer.isInvalidPrice || (!drawer.canAdd && drawer.hasComponents)} onClick={drawer.handleAdd} className="flex h-10 min-w-[190px] items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[10px] font-black uppercase tracking-[0.1em] text-on-primary transition-[filter,transform] hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-outline/40 disabled:text-on-surface-variant focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    {drawer.isSubmittingOrPending || drawer.isFetchingVariants ? <span className="loading loading-spinner loading-sm" aria-label="Đang xử lý"/> : drawer.selectedPreOrderConfig ? <><Clock className="h-4 w-4"/>Đặt trước</> : <><ShoppingCart className="h-4 w-4"/>Thêm vào giỏ<ArrowRight className="h-3.5 w-3.5"/></>}
                  </button>
                </footer>
              </main>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    <ImageViewer images={viewerImages} initialIndex={0} isOpen={drawer.imageViewerOpen} onClose={onCloseViewer}/>
    </>
  );
}
