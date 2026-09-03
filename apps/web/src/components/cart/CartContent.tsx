"use client";

import type { CartItem } from "@/lib/data";
import Icon from "@/components/ui/Icon";
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
}

function CartContent({
  isHydrated,
  visibleItems,
  removingItemId,
  closeCart,
  onRemove,
  onMinus,
  onPlus,
}: CartContentProps) {
  const router = useRouter();

  if (!isHydrated) {
    return (
      <div
        data-allow-scroll
        className="h-[60dvh] min-h-0 touch-pan-y space-y-2 overflow-y-auto overscroll-contain px-4 py-2"
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
        className="h-full min-h-0 touch-pan-y space-y-2 overflow-y-auto overscroll-contain px-4 py-2"
      >
        <div className="flex h-full flex-col items-center justify-center px-6 py-8">
          <Icon
            name="shopping_cart"
            className="text-5xl text-outline-variant"
          />
          <p className="mt-3 text-lg font-black text-on-surface-variant">
            Giỏ hàng trống
          </p>
          <p className="mt-1 text-xs font-semibold text-on-surface-variant/60">
            Khám phá danh mục bên dưới
          </p>

          <div className="mt-6 w-full">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant/70">
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
                  className="rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-left text-sm font-bold text-on-surface transition-all active:scale-[0.97]"
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
            className="mt-5 rounded-full bg-primary px-8 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-ambient-sm transition-all active:scale-[0.97]"
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
      className="relative h-[60dvh] min-h-0 touch-pan-y space-y-2 overflow-y-auto overscroll-contain px-4 py-2"
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

      <div className="absolute bottom-2 left-1/2 flex w-[90%] -translate-x-1/2 items-center justify-center gap-2 rounded-2xl bg-secondary/10 p-2">
        <Icon name="eco" className="text-sm text-secondary" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">
          Đơn hàng được đóng gói thân thiện với môi trường.
        </p>
      </div>
    </div>
  );
}

export default memo(CartContent);
