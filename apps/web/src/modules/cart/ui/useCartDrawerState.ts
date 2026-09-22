"use client";

import { useIsMounted } from "@/hooks/useIsMounted";
import { toast } from "@/lib/toast";
import {
  useClearCart,
  useRemoveCartItem,
  useUpdateCartItem,
} from "@/modules/cart/client/mutations";
import { useCartStore } from "@/modules/cart/client/useCartStore";
import { cartItemToGA, trackRemoveFromCart } from "@/lib/analytics";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import type { CartItem } from "@/modules/cart/types";
import { useAuth } from "@/modules/user/client/AuthProvider";

/**
 * Shared state/logic for the cart drawer UI. Both the mobile bottom sheet
 * (`CartDrawer`) and the desktop right-side panel (`DesktopCartDrawer`) drive
 * the same cart interactions through this hook so behavior stays in sync.
 */
export function useCartDrawerState() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const mounted = useIsMounted();
  const {
    items,
    isOpen,
    isHydrated,
    cartId,
    closeCart,
    updateQty,
    removeItem,
    total,
  } = useCartStore();

  const removeMutation = useRemoveCartItem();
  const updateMutation = useUpdateCartItem();
  const clearCartMutation = useClearCart();

  const visibleItems = useMemo(() => (mounted ? items : []), [mounted, items]);
  const subtotal = useMemo(
    () => (mounted ? total() : 0),
    [mounted, total, items]
  );
  const open = mounted && isOpen;

  const [pendingRemoval, setPendingRemoval] = useState<CartItem | null>(null);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [clearAllMode, setClearAllMode] = useState(false);
  const confirmDialogRef = useRef<HTMLDialogElement>(null);

  const handleRemoveClick = useCallback((item: CartItem) => {
    setClearAllMode(false);
    setPendingRemoval(item);
    confirmDialogRef.current?.showModal();
  }, []);

  const handleClearAllClick = useCallback(() => {
    setClearAllMode(true);
    setPendingRemoval(null);
    confirmDialogRef.current?.showModal();
  }, []);

  const confirmRemove = useCallback(() => {
    if (clearAllMode) {
      if (cartId) clearCartMutation.mutate(cartId);
      for (const item of visibleItems) trackRemoveFromCart(cartItemToGA(item));
      setClearAllMode(false);
    } else if (pendingRemoval) {
      trackRemoveFromCart(cartItemToGA(pendingRemoval));
      if (pendingRemoval.id) {
        setRemovingItemId(pendingRemoval.id);
        removeMutation.mutate(pendingRemoval.id, {
          onSettled: () => setRemovingItemId(null),
        });
      } else {
        removeItem(
          pendingRemoval.product.id,
          pendingRemoval.variant?.id ?? null
        );
      }
      setPendingRemoval(null);
    }
    confirmDialogRef.current?.close();
  }, [
    clearAllMode,
    pendingRemoval,
    cartId,
    clearCartMutation,
    removeMutation,
    removeItem,
    visibleItems,
  ]);

  const cancelRemove = useCallback(() => {
    setPendingRemoval(null);
    setClearAllMode(false);
    confirmDialogRef.current?.close();
  }, []);

  const handleMinus = useCallback(
    (item: CartItem) => {
      if (item.quantity === 1) {
        handleRemoveClick(item);
      } else if (item.id) {
        updateMutation.mutate(
          {
            itemId: item.id,
            quantity: item.quantity - 1,
          },
          {
            onSuccess: () => {
              if (
                item.product.stock_quantity != null &&
                item.quantity - 1 < item.product.stock_quantity
              ) {
                toast.success(
                  `Còn ${item.product.stock_quantity} sản phẩm trong kho`
                );
              }
            },
          }
        );
      } else {
        updateQty(item.product.id, item.variant?.id ?? null, -1);
      }
    },
    [handleRemoveClick, updateMutation, updateQty]
  );

  const handlePlus = useCallback(
    (item: CartItem) => {
      // Guard only when we actually know product-level stock. The inventory of
      // kits (and variant-back stock) lives elsewhere, so let the server decide
      // and surface its rejection via the mutation's onError.
      if (
        !item.components?.length &&
        item.product.stock_quantity != null &&
        item.quantity >= item.product.stock_quantity
      ) {
        toast.warning(
          `Chỉ còn ${item.product.stock_quantity} sản phẩm trong kho`
        );
        return;
      }
      if (item.id) {
        updateMutation.mutate(
          { itemId: item.id, quantity: item.quantity + 1 },
          {
            onError: (err) =>
              toast.error(
                err instanceof Error
                  ? err.message
                  : "Không thể cập nhật số lượng"
              ),
          }
        );
      } else {
        updateQty(item.product.id, item.variant?.id ?? null, 1);
      }
    },
    [updateMutation, updateQty]
  );

  const handleCheckout = useCallback(() => {
    if (checkingOut) return;
    if (authLoading) return;
    if (user == null) {
      toast.warning("Cần đăng nhập để thanh toán!");
      const currentPath = window.location.pathname + window.location.search;
      router.push(`/login?next=${encodeURIComponent(currentPath)}`);
      return;
    }
    closeCart();
    router.push("/checkout/shipping");
  }, [checkingOut, router, closeCart, user, authLoading]);

  return {
    open,
    isHydrated,
    cartId,
    closeCart,
    visibleItems,
    subtotal,
    removeMutation,
    updateMutation,
    clearCartMutation,
    removingItemId,
    checkingOut,
    clearAllMode,
    confirmDialogRef,
    handleRemoveClick,
    handleClearAllClick,
    confirmRemove,
    cancelRemove,
    handleMinus,
    handlePlus,
    handleCheckout,
  };
}