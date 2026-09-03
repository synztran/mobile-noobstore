"use client";

import { useIsMounted } from "@/hooks/useIsMounted";
import { usePreventScroll } from "@/hooks/usePreventScroll";
import { formatVND } from "@/lib/currency";
import { toast } from "@/lib/toast";
import {
  useClearCart,
  useRemoveCartItem,
  useUpdateCartItem,
} from "@/lib/react-query/cart/api/useCartMutations";
import { useCartStore } from "@/store";
import { cartItemToGA, trackRemoveFromCart } from "@/lib/analytics";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import type { CartItem } from "@/lib/data";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useNavigationStore } from "@/store/navigation";
import CartContent from "./CartContent";

// ─── Cart Drawer ──────────────────────────────────────────────────────────────

export function CartDrawer() {
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
  const drawerOpen = mounted && isOpen;

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

  const startNavigation = useNavigationStore((s) => s.startNavigation);

  const handleCheckout = useCallback(() => {
    if (checkingOut) return;
    if (authLoading) return;
    if (user == null) {
      toast.warning("Cần đăng nhập để thanh toán!");
      router.push("/login");
      return;
    }
    closeCart();
    startNavigation();
    router.push("/checkout/shipping");
  }, [checkingOut, router, closeCart, user, authLoading, startNavigation]);

  usePreventScroll(drawerOpen);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] h-screen bg-on-surface/30 backdrop-blur-sm transition-opacity duration-300 ${
          drawerOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={closeCart}
      />

      {/* Drawer */}
      <div
        className={`duration-250 fixed left-0 right-0 z-[999] flex h-[85dvh] flex-col rounded-t-2xl bg-surface transition-all ease-out ${
          drawerOpen ? "top-[15dvh]" : "top-[110dvh]"
        }`}
      >
        {/* Handle */}
        <div className="flex justify-center pb-2 pt-3">
          <div className="h-1 w-10 rounded-full bg-outline-variant" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2">
          <h2 className="text-xl font-black tracking-tight text-on-surface">
            Giỏ hàng
          </h2>
          <div className="flex items-center gap-2">
            {visibleItems.length > 0 && (
              <button
                onClick={handleClearAllClick}
                disabled={clearCartMutation.isPending}
                className="rounded-xl border border-outline-variant/40 bg-surface-container px-3 py-1.5 text-xs font-bold text-error transition-all active:scale-90 disabled:opacity-50"
              >
                {clearCartMutation.isPending ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  "Xóa tất cả"
                )}
              </button>
            )}
            <button
              onClick={closeCart}
              className="rounded-xl border border-outline-variant/40 bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface transition-all active:scale-90"
            >
              Đóng
            </button>
          </div>
        </div>

        {/* Content */}
        <CartContent
          isHydrated={isHydrated}
          visibleItems={visibleItems}
          removingItemId={removingItemId}
          closeCart={closeCart}
          onRemove={handleRemoveClick}
          onMinus={handleMinus}
          onPlus={handlePlus}
        />

        {/* Footer */}
        {visibleItems.length > 0 && (
          <div
            className="flex-2 space-y-2 border-t border-outline-variant/20 bg-surface px-4 pt-2"
            style={{
              paddingBottom: "max(0.5rem, env(safe-area-inset-bottom) - 2rem)",
            }}
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-on-surface">
                  Phí vận chuyển và giảm giá
                </span>
                <span className="text-xs font-semibold text-on-surface">
                  Ở bước thanh toán
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-on-surface">Tạm tính</span>
                <span className="text-xl font-black text-primary">
                  {formatVND(subtotal)}
                </span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              data-testid="cart-checkout"
              disabled={checkingOut}
              className="primary-gradient btn btn-md !h-[40px] !min-h-[40px] w-full rounded-full border-0 text-xs font-bold uppercase tracking-widest text-white shadow-ambient-sm transition-transform active:scale-[0.98] disabled:scale-100 disabled:opacity-70"
            >
              {checkingOut ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "THANH TOÁN →"
              )}
            </button>
            <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
              Thanh toán bảo mật & mã hóa
            </p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <dialog
        ref={confirmDialogRef}
        className="modal modal-bottom backdrop-blur-sm sm:modal-middle"
      >
        <div className="modal-box bg-surface">
          <h3 className="mb-2 text-lg font-black text-on-surface">
            {clearAllMode ? "Xóa tất cả sản phẩm?" : "Xóa sản phẩm?"}
          </h3>
          <p className="mb-6 text-sm font-semibold text-on-surface-variant">
            {clearAllMode
              ? "Bạn có chắc chắn muốn xóa tất cả sản phẩm khỏi giỏ hàng?"
              : "Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?"}
          </p>
          <div className="modal-action flex gap-3">
            <button
              onClick={cancelRemove}
              className="btn min-w-32 rounded-full bg-surface-container font-bold normal-case text-on-surface hover:bg-surface-container-high"
            >
              Hủy
            </button>
            <button
              onClick={confirmRemove}
              disabled={clearCartMutation.isPending || removeMutation.isPending}
              className="btn min-w-32 rounded-full border-0 bg-error font-bold normal-case text-white hover:bg-error/90 disabled:opacity-60"
            >
              {clearCartMutation.isPending || removeMutation.isPending ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "Xóa"
              )}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={cancelRemove}>close</button>
        </form>
      </dialog>
    </>
  );
}
