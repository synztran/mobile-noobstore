"use client";

import { ProductConfigurator } from "@/modules/products/ui/product/ProductConfigurator";
import { PreOrderBanner } from "@/modules/products/ui/product/PreOrderBanner";
import { Thumbnail } from "@/components/ui/Thumbnail";
import { formatVND } from "@/lib/currency";
import clsx from "clsx";
import Image from "@/components/ui/AdaptiveImage";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { DeliveryAvailabilitySection } from "./DeliveryAvailabilitySection";
import { SelectedConditionSummary } from "./SelectedConditionSummary";
import { cardPricingFor } from "./card-pricing";
import { ArrowLeft, ChevronRight, Clock, Images, Package, ShoppingCart } from "lucide-react";
import type { QuickPickDrawerModel } from "./quick-pick-types";
import { ImageViewer } from "./ImageViewer";

function AddToCartButton({ isSubmitting, isFetchingVariants, canAdd, hasComponents, isInvalidPrice, isPreOrder, onClick }: {
  isSubmitting: boolean; isFetchingVariants: boolean; canAdd: boolean; hasComponents: boolean; isInvalidPrice: boolean; isPreOrder: boolean; onClick: () => void;
}) {
  const isLoading = isSubmitting || isFetchingVariants;
  const isDisabled = isLoading || isInvalidPrice || (!canAdd && hasComponents);
  return <button type="button" onClick={onClick} disabled={isDisabled} className={clsx("btn-md flex flex-1 items-center justify-center gap-2 rounded-xl text-sm font-black uppercase tracking-widest text-white transition-all active:scale-[0.98]", isDisabled ? "cursor-not-allowed bg-outline/30" : "bg-gradient-to-r from-primary to-primary-container")}>
    {isLoading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : isInvalidPrice ? "Chưa có giá" : !canAdd && hasComponents ? "Vui lòng chọn" : isPreOrder ? <><Clock className="h-5 w-5"/>ĐẶT TRƯỚC</> : <><ShoppingCart className="h-5 w-5"/>THÊM VÀO GIỎ</>}
  </button>;
}

export function QuickPickMobileDrawer({ isOpen, onClose, isCategoryMode, drawer, onShowImage, viewerImages, onCloseViewer }: {
  isOpen: boolean; onClose: () => void; isCategoryMode: boolean; drawer: QuickPickDrawerModel; onShowImage: (image: string) => void; reduceMotion: boolean; viewerImages: string[]; onCloseViewer: () => void;
}) {
  const configSwipeStartX = useRef<number | null>(null);
  const configSwipedRef = useRef(false);
  const configGallery = useMemo(() => { const all=[drawer.activeProduct?.thumbnail,...(drawer.activeProduct?.images??[])].filter(Boolean) as string[]; return Array.from(new Set(all)); }, [drawer.activeProduct]);
  const activePricing = useMemo(() => drawer.activeProduct ? cardPricingFor(drawer.activeProduct) : {amount:0,showFrom:false,showDiscount:false,unpriced:true}, [drawer.activeProduct]);
  const [configImgIndex, setConfigImgIndex] = useState(0);
  const handleConfigTouchStart = useCallback((e: React.TouchEvent) => { configSwipeStartX.current=e.touches[0].clientX; configSwipedRef.current=false; }, []);
  const handleConfigTouchEnd = useCallback((e: React.TouchEvent) => { if(configSwipeStartX.current===null || configGallery.length<=1)return; const delta=e.changedTouches[0].clientX-configSwipeStartX.current; configSwipeStartX.current=null; if(Math.abs(delta)>40){if(e.cancelable)e.preventDefault();configSwipedRef.current=true;setConfigImgIndex(prev=>(prev+(delta<0?1:-1)+configGallery.length)%configGallery.length);} },[configGallery.length]);
  const handleConfigThumbClick = useCallback((e: React.MouseEvent) => { if(configSwipedRef.current){configSwipedRef.current=false;e.preventDefault();e.stopPropagation();return;} const image=configGallery[configImgIndex]; if(image) onShowImage(image); },[configGallery,configImgIndex,onShowImage]);

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
          onShowImage={onShowImage}
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
      <AnimatePresence>
        {isOpen && <motion.div key="backdrop" className="fixed inset-0 z-[60] !mt-0 bg-on-surface/30 backdrop-blur-sm" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.25}} />}
      </AnimatePresence>
      <AnimatePresence>
        {isOpen && <motion.div key="drawer" className="fixed bottom-0 left-0 right-0 z-[999] flex max-h-[80dvh] flex-col rounded-t-3xl bg-[#f2f2f2] shadow-2xl" initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}} transition={{type:"spring",damping:28,stiffness:300,mass:0.8}}>
          <div className="flex flex-shrink-0 justify-center pb-1 pt-3"><div className="h-1 w-10 rounded-full bg-outline-variant"/></div>
          <div className="flex-shrink-0 px-4 py-2"><div className="flex items-center justify-between gap-3">{isCategoryMode && drawer.view === "configurator" && <button type="button" aria-label="Quay lại danh sách" onClick={drawer.backToList} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-surface-container transition-transform active:scale-90"><ArrowLeft className="h-5 w-5 text-on-surface"/></button>}<div className="flex min-w-0 flex-1 items-center justify-between"><span className="text-sm font-bold uppercase leading-none tracking-widest text-primary">Thêm nhanh sản phẩm</span><button onClick={onClose} className="rounded-xl border border-outline-variant/40 bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface transition-all active:scale-90">Đóng</button></div></div></div>
          <div className="mb-3 h-[0.25px] w-full border-b border-slate-200"/>
          <div data-allow-scroll className="max-h-full min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 pb-4">{drawer.view === "product-list" ? renderProductList() : renderConfigurator()}</div>
          {drawer.view === "configurator" && <div className="grid grid-cols-[1fr_1fr] items-center gap-2 border-t border-outline-variant/20 px-4 py-4"><div className="w-full"><p className="text-base font-semibold text-on-surface-variant">Tạm tính</p><p className="text-xl font-black text-primary">{formatVND(Math.max(0,drawer.totalPrice))}</p></div><AddToCartButton isSubmitting={drawer.isSubmittingOrPending} isFetchingVariants={drawer.isFetchingVariants} canAdd={drawer.canAdd} hasComponents={drawer.hasComponents} isInvalidPrice={drawer.isInvalidPrice} isPreOrder={drawer.selectedPreOrderConfig!==null} onClick={drawer.handleAdd}/></div>}
        </motion.div>}
    </AnimatePresence>
      <ImageViewer images={viewerImages} initialIndex={0} isOpen={drawer.imageViewerOpen} onClose={onCloseViewer}/>
    </>
  );
}
