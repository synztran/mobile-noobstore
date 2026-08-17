"use client";

import type { ShopProduct } from "@/app/api/products/route";
import { PreOrderBanner } from "@/components/product/PreOrderBanner";
import { ProductConfigurator } from "@/components/product/ProductConfigurator";
import { Thumbnail } from "@/components/ui/Thumbnail";
import Icon from "@/components/ui/Icon";
import { formatVND } from "@/lib/currency";
import type { CategoryItem } from "@/lib/products-server";
import { useQuickPickDrawer } from "@/components/product/useQuickPickDrawer";
import clsx from "clsx";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { DeliveryAvailabilitySection } from "./DeliveryAvailabilitySection";
import { SelectedConditionSummary } from "./SelectedConditionSummary";

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
          <Icon name="schedule" className="text-xl" />
          ĐẶT TRƯỚC
        </>
      );
    }
    return (
      <>
        <Icon name="add_shopping_cart" className="text-xl" />
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
        drawer.products.map((p) => (
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
                  className="object-cover"
                  sizes="64px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Icon
                    name="inventory_2"
                    className="text-2xl text-outline-variant"
                  />
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
                {formatVND(p.min_price)}
              </p>
            </div>
            <Icon
              name="chevron_right"
              className="flex-shrink-0 text-xl text-outline-variant"
            />
          </button>
        ))}
    </div>
  );

  const renderConfigurator = () => (
    <div className="flex min-h-0 flex-col gap-2">
      {drawer.activeProduct && (
        <div className="flex items-center gap-2">
          <Thumbnail
            src={drawer.activeProduct.thumbnail}
            alt={drawer.activeProduct.name}
            className="h-20 w-24 rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-bold leading-tight text-on-surface">
              {drawer.activeProduct.name}
            </p>
            <p className="mt-0.5 font-bold text-primary">
              {drawer.activeProduct.min_price ? (
                <>
                  <span className="text-xs font-black text-slate-600">
                    Giá từ
                  </span>
                  &nbsp;
                  {formatVND(
                    drawer.activeProduct.min_price ||
                      drawer.activeProduct.base_price
                  )}
                </>
              ) : (
                <>
                  {formatVND(
                    drawer.activeProduct.min_price ||
                      drawer.activeProduct.base_price
                  )}
                </>
              )}
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
        />
        {drawer.selectedPreOrderConfig && (
          <PreOrderBanner config={drawer.selectedPreOrderConfig} />
        )}
        <ProductConfigurator
          groups={drawer.groups}
          variants={drawer.activeProduct?.variants ?? []}
          selections={drawer.selections}
          loadingConfigurator={drawer.loadingConfigurator}
          basePrice={drawer.activeProduct?.base_price}
          disabledVariantIds={drawer.disabledVariantIds}
          onSelect={drawer.onSelect}
        />
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
            onClick={onClose}
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
                    <Icon
                      name="arrow_back"
                      className="text-lg text-on-surface"
                    />
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
    </>
  );
}
