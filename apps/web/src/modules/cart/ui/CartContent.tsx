"use client";

import type { CartItem } from "@/modules/cart/types";
import { Leaf, ShoppingCart } from "lucide-react";
import { EMPTY_CART_CATEGORIES } from "@/constants/cart";
import { useRouter } from "next/navigation";
import { memo } from "react";
import CartItemRow from "./CartItemRow";

interface CartContentProps {
  isHydrated: boolean;
  visibleItems: CartItem[];
  removingItemId?: string | null;
  closeCart: () => void;
  onRemove: (item: CartItem) => void;
  onMinus: (item: CartItem) => void;
  onPlus: (item: CartItem) => void;
  /** Height/flex class for the scrollable area. Defaults to the mobile
      bottom-sheet height; desktop drawers pass a fill class. */
  scrollClassName?: string;
}

function CartContent({
  isHydrated,
  visibleItems,
  removingItemId,
  closeCart,
  onRemove,
  onMinus,
  onPlus,
  scrollClassName = "h-[60dvh]",
}: CartContentProps) {
  const router = useRouter();

  if (!isHydrated) {
    return (
      <div
        data-allow-scroll
        className={`${scrollClassName} min-h-0 touch-pan-y space-y-2 overflow-y-auto overscroll-contain px-4 py-2`}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (visibleItems.length === 0) {
    return (
      <div
        data-allow-scroll
        className={`${scrollClassName} min-h-0 touch-pan-y space-y-2 overflow-y-auto overscroll-contain px-4 py-2`}
      >
        <div className="flex h-full flex-col items-center justify-center px-6 py-8">
          <ShoppingCart className="h-12 w-12 text-outline-variant md:h-16 md:w-16" />
          <p className="mt-3 text-lg font-black text-on-surface-variant md:text-2xl">
            Giỏ hàng trống
          </p>
          <p className="mt-1 text-xs font-semibold text-on-surface-variant/60 md:text-sm">
            Khám phá danh mục bên dưới
          </p>

          <div className="mt-6 w-full">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant/70 md:text-xs">
              Gợi ý danh mục
            </p>
            <div className="grid grid-cols-2 gap-2">
              {EMPTY_CART_CATEGORIES.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => {
                    closeCart();
                    router.push(`/shop?category=${cat.slug}`);
                  }}
                  className="rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-left text-sm font-bold text-on-surface transition-all active:scale-[0.97] md:px-5 md:py-3.5 md:text-base"
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              closeCart();
              router.push("/shop");
            }}
            className="mt-5 rounded-full bg-primary px-8 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-ambient-sm transition-all active:scale-[0.97] md:px-10 md:py-3 md:text-sm"
          >
            Khám phá ngay
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-allow-scroll
      className={`${scrollClassName} relative min-h-0 touch-pan-y space-y-2 overflow-y-auto overscroll-contain px-4 py-2`}
    >
      {visibleItems.map((item) => {
        const itemKey = item.components?.length
          ? `${item.product.id}-kit-${item.components.map((c) => c.variant_id).join("+")}`
          : `${item.product.id}-${item.variant?.id ?? "base"}`;
        return (
          <CartItemRow
            key={itemKey}
            item={item}
            isRemoving={removingItemId === item.id}
            onRemove={() => onRemove(item)}
            onMinus={() => onMinus(item)}
            onPlus={() => onPlus(item)}
          />
        );
      })}

      <div className="relative mx-auto !mt-4 flex w-[90%] items-center justify-center gap-2 rounded-2xl bg-secondary/10 p-2">
        <Leaf className="h-3.5 w-3.5 text-secondary md:h-4 md:w-4" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-secondary md:text-xs">
          Đơn hàng được đóng gói thân thiện với môi trường.
        </p>
      </div>
    </div>
  );
}

export default memo(CartContent);
