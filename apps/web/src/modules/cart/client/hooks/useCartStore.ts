"use client";

import type { CartItem } from "@/modules/cart/types";
import type {
  Product,
  ProductVariant,
  SelectedComponent,
} from "@/modules/products/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CartStore {
  items: CartItem[];
  cartId: string | null;
  isOpen: boolean;
  isHydrated: boolean;
  cartFetching: boolean;

  setCart: (items: CartItem[], cartId: string | null) => void;
  setHydrated: (v: boolean) => void;
  setCartFetching: (v: boolean) => void;
  addItem: (
    product: Product,
    variant: ProductVariant | null,
    components?: SelectedComponent[],
    gifts?: Array<{
      gift_name: string;
      gift_slug: string;
      gift_thumbnail: string | null;
      quantity: number;
    }>
  ) => void;
  addStandardProduct: (
    product: Product,
    variant: ProductVariant | null,
    gifts?: Array<{
      gift_name: string;
      gift_slug: string;
      gift_thumbnail: string | null;
      quantity: number;
    }>
  ) => { success: boolean; reason?: string };
  removeItem: (
    productId: string,
    variantId: string | null,
    itemId?: string
  ) => void;
  updateQty: (
    productId: string,
    variantId: string | null,
    delta: number
  ) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  total: () => number;
  subtotal: () => number;
  itemCount: () => number;
}

// One unit-price rule for the whole cart. `components[].price_adjustment` is
// already override-resolved at add-to-cart time, so no rules are needed here.
// `total()` and `subtotal()` used to disagree — subtotal() dropped the variant
// entirely — which made the cart header and the checkout summary show different
// numbers for the same basket.
function lineUnitPrice(item: CartItem): number {
  const base = item.variant?.effective_price ?? item.product.base_price;
  const components = (item.components ?? []).reduce(
    (sum, c) => sum + (c.price_adjustment || 0),
    0
  );
  return base + components;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      cartId: null,
      isOpen: false,
      isHydrated: false,
      cartFetching: false,

      setCart: (items, cartId) => set({ items, cartId, isHydrated: true }),
      setHydrated: (v) => set({ isHydrated: v }),
      setCartFetching: (v) => set({ cartFetching: v }),

      addItem: (product, variant, components, gifts) => {
        set((state) => {
          const isKit = (components?.length ?? 0) > 0;
          const existing = state.items.find((i) => {
            if (i.product.id !== product.id) return false;
            // A kit line's identity is its kit variant PLUS its component set:
            // Purple+70sw and Trash+70sw are different products at different
            // prices, so the kit variant must be part of the merge key or the
            // two would collapse into one line.
            if (isKit) {
              const a = [
                i.variant?.id ?? "",
                ...(i.components ?? []).map((c) => c.variant_id),
              ]
                .sort()
                .join(",");
              const b = [
                variant?.id ?? "",
                ...(components ?? []).map((c) => c.variant_id),
              ]
                .sort()
                .join(",");
              return a === b;
            }
            return i.variant?.id === variant?.id;
          });
          // NOTE: must be `||`, not `??` — the product's flag is a real
          // boolean (false when the product itself isn't pre-order), which
          // would short-circuit `??` and never consult the kit components.
          const isPreOrder =
            product.is_pre_order ||
            (components?.some((c) => c.is_pre_order) ?? false);
          const preOrderConfig =
            product.pre_order_config ??
            components?.find((c) => c.pre_order_config)?.pre_order_config ??
            null;
          if (existing) {
            return {
              items: state.items.map((i) => {
                if (i.product.id !== product.id) return i;
                if (isKit) {
                  const a = (i.components ?? [])
                    .map((c) => c.variant_id)
                    .sort()
                    .join(",");
                  const b = (components ?? [])
                    .map((c) => c.variant_id)
                    .sort()
                    .join(",");
                  if (a !== b) return i;
                } else if (i.variant?.id !== variant?.id) {
                  return i;
                }
                return { ...i, quantity: i.quantity + 1 };
              }),
            };
          }
          return {
            items: [
              ...state.items,
              {
                product,
                variant: variant ?? null,
                components: components ?? [],
                quantity: 1,
                gifts: gifts ?? undefined,
                is_pre_order: isPreOrder,
                pre_order_config: preOrderConfig,
              },
            ],
          };
        });
      },

      addStandardProduct: (product, variant, gifts) => {
        const state = get();
        const existingItem = state.items.find(
          (i) =>
            i.product.id === product.id &&
            (i.variant?.id ?? null) === (variant?.id ?? null)
        );
        const currentQty = existingItem?.quantity ?? 0;
        if (!product.is_pre_order && currentQty + 1 > product.stock_quantity) {
          return {
            success: false,
            reason: `Sản phẩm này chỉ còn ${product.stock_quantity} trong kho`,
          };
        }
        state.addItem(product, variant, undefined, gifts);
        return { success: true };
      },

      removeItem: (productId, variantId, itemId) => {
        set((state) => ({
          items: state.items.filter((i) => {
            if (itemId && i.id) {
              return i.id !== itemId;
            }
            return !(
              i.product.id === productId &&
              (i.variant?.id ?? null) === variantId
            );
          }),
        }));
      },

      updateQty: (productId, variantId, delta) => {
        set((state) => ({
          items: state.items
            .map((i) => {
              if (
                i.product.id === productId &&
                (i.variant?.id ?? null) === variantId
              ) {
                const maxQty = i.is_pre_order
                  ? Infinity
                  : i.product.stock_quantity;
                const newQty =
                  delta > 0
                    ? Math.min(i.quantity + delta, maxQty)
                    : Math.max(0, i.quantity + delta);
                return { ...i, quantity: newQty };
              }
              return i;
            })
            .filter((i) => i.quantity > 0),
        }));
      },

      clearCart: () => set({ items: [], cartId: null }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      // One unit-price rule for the whole cart. `components[].price_adjustment` is
      // already override-resolved at add-to-cart time, so no rules are needed
      // here. `total()` and `subtotal()` used to disagree — subtotal() dropped
      // the variant entirely — which made the cart header and the checkout
      // summary show different numbers for the same basket.
      total: () =>
        get().items.reduce((sum, i) => sum + lineUnitPrice(i) * i.quantity, 0),

      subtotal: () =>
        get().items.reduce((sum, i) => sum + lineUnitPrice(i) * i.quantity, 0),

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: "noobstore-cart",
      skipHydration: true,
      partialize: (state) => ({
        items: state.items,
        cartId: state.cartId,
      }),
    }
  )
);
