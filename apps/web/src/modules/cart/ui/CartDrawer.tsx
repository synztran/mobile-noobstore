"use client";

import { usePreventScroll } from "@/hooks/usePreventScroll";
import { formatVND } from "@/lib/currency";
import CartContent from "./CartContent";
import { useCartDrawerState } from "./useCartDrawerState";

// ─── Cart Drawer (mobile bottom sheet) ───────────────────────────────────────

export function CartDrawer() {
  const {
    open,
    isHydrated,
    closeCart,
    visibleItems,
    subtotal,
    clearCartMutation,
    removeMutation,
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
  } = useCartDrawerState();

  const drawerOpen = open;

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
          <div className="modal-action flex gap-2">
            <button
              onClick={cancelRemove}
              className="btn flex-1 rounded-lg bg-surface-container py-4 font-bold normal-case text-on-surface hover:bg-surface-container-high"
            >
              Hủy
            </button>
            <button
              onClick={confirmRemove}
              disabled={clearCartMutation.isPending || removeMutation.isPending}
              className="btn flex-1 rounded-lg border-0 bg-error py-4 font-bold normal-case text-white hover:bg-error/90 disabled:opacity-60"
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
