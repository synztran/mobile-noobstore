"use client";

import Icon from "@/components/ui/Icon";
import { useIsMounted } from "@/hooks/useIsMounted";
import { usePreventScroll } from "@/hooks/usePreventScroll";
import { formatVND } from "@/lib/currency";
import type { CartItem } from "@/lib/data";
import { toast } from "@/lib/toast";
import { useCartStore } from "@/store";
import { Trash } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import ProductComponentTags from "../product/ProductComponentTags";
import { ITag } from "@/app/api/products/route";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useNavigationStore } from "@/store/navigation";

function itemUnitPrice(item: CartItem) {
  const base = item.variant?.effective_price ?? item.product.base_price;
  const components =
    item.components?.reduce((s, c) => s + c.price_adjustment, 0) ?? 0;
  return base + components;
}

// ─── Cart Item Row ────────────────────────────────────────────────────────────

type CartItemRowProps = {
  item: CartItem;
  onRemove: (productId: string, variantId: string | null) => void;
  onMinus: (item: CartItem) => void;
  onPlus: (item: CartItem) => void;
};

const CartItemRow = memo(function CartItemRow({
  item,
  onRemove,
  onMinus,
  onPlus,
}: CartItemRowProps) {
  const unitTotal = useMemo(() => itemUnitPrice(item) * item.quantity, [item]);
  const isPreOrderComponent = useMemo(
    () => item.components?.some((c) => c.is_pre_order) ?? false,
    [item.components]
  );

  return (
    <div className="relative flex items-start gap-2 rounded-xl bg-surface-container-low p-2">
      {/* Remove button */}
      <button
        onClick={() => onRemove(item.product.id, item.variant?.id ?? null)}
        className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-400 transition-transform active:scale-90"
      >
        <Trash className="text-white" size={14} />
      </button>
      {/* Thumbnail */}
      <div className="relative h-20 w-24 flex-shrink-0 bg-surface-container">
        {item.product.thumbnail ? (
          <Image
            src={item.product.thumbnail}
            alt={item.product.name}
            fill
            className="rounded-lg object-cover"
            sizes="80px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon
              name="inventory_2"
              className="text-3xl text-outline-variant"
            />
          </div>
        )}
        {isPreOrderComponent && (
          <span className="absolute -top-2 left-1/2 min-w-16 -translate-x-1/2 transform truncate text-nowrap rounded-sm bg-violet-500 px-1 py-0.5 text-center text-[8px] font-black uppercase text-white">
            Pre-order
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="mr-6 line-clamp-3 text-sm font-bold leading-tight text-on-surface">
          {item.product.name}
        </p>
        {item.variant && (
          <p className="mt-0.5 text-xs font-semibold tracking-wide text-on-surface-variant">
            {item.variant.variant_name}
          </p>
        )}
        <div className="flex gap-2">
          {item.product.tags?.map((tag) => (
            <span
              key={tag.id}
              className={`flex max-w-max items-center justify-center rounded-lg border border-outline-variant/30 px-2 py-1 text-[10px] font-bold leading-tight tracking-wide text-on-surface shadow-sm backdrop-blur ${tag.textColor ?? "text-on-surface"} ${tag.bgColor ?? "bg-surface-container-lowest"}`}
            >
              {tag.label}
            </span>
          ))}
        </div>
        {item.components && item.components.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.components.map((c) => (
              <span
                key={c.variant_id}
                className="inline-flex items-center gap-1 rounded-lg bg-gray-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-on-surface-variant"
              >
                {c.component_group}: <strong>{c.variant_name}</strong>
              </span>
            ))}
          </div>
        )}
        {item.gifts?.map((g) => (
          <div
            key={g.gift_name}
            className="flex items-start gap-2 rounded-xl bg-rose-100 p-2"
          >
            <span className="text-sm leading-none">🎁</span>
            <div className="min-w-0 flex-1">
              <p className="text-[8px] font-black uppercase tracking-wider text-rose-500">
                Quà tặng kèm
              </p>
              <p className="truncate text-[10px] font-bold text-rose-700">
                {g.gift_name}
                {g.quantity > 1 && ` x${g.quantity}`}
              </p>
            </div>
          </div>
        ))}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3 rounded-lg bg-gray-200 px-2 py-1">
            <button
              onClick={() => onMinus(item)}
              className="text-base font-bold leading-none text-on-surface transition-transform active:scale-90"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-bold text-on-surface">
              {item.quantity}
            </span>
            <button
              onClick={() => onPlus(item)}
              className="text-base font-bold leading-none text-on-surface transition-transform active:scale-90"
            >
              +
            </button>
          </div>
          <p className="font-black text-primary">{formatVND(unitTotal)}</p>
        </div>
      </div>
    </div>
  );
});

// ─── Cart Drawer ──────────────────────────────────────────────────────────────

export function CartDrawer() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const mounted = useIsMounted();
  const { items, isOpen, closeCart, updateQty, removeItem, total } =
    useCartStore();

  const visibleItems = useMemo(() => (mounted ? items : []), [mounted, items]);
  // `total` is a stable fn ref in Zustand — `items` must be in deps so this
  // recomputes whenever the cart contents change.
  const subtotal = useMemo(
    () => (mounted ? total() : 0),
    [mounted, total, items]
  );
  const drawerOpen = mounted && isOpen;

  const [pendingRemoval, setPendingRemoval] = useState<{
    productId: string;
    variantId: string | null;
  } | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const confirmDialogRef = useRef<HTMLDialogElement>(null);

  const hasPreOrderItem = useMemo(
    () =>
      visibleItems.some(
        (i) =>
          i.components?.some((c) => c.is_pre_order) || i.variant?.is_pre_order
      ),
    [visibleItems]
  );

  const handleRemoveClick = useCallback(
    (productId: string, variantId: string | null) => {
      setPendingRemoval({ productId, variantId });
      confirmDialogRef.current?.showModal();
    },
    []
  );

  const confirmRemove = useCallback(() => {
    if (pendingRemoval) {
      removeItem(pendingRemoval.productId, pendingRemoval.variantId);
      setPendingRemoval(null);
    }
    confirmDialogRef.current?.close();
  }, [pendingRemoval, removeItem]);

  const cancelRemove = useCallback(() => {
    setPendingRemoval(null);
    confirmDialogRef.current?.close();
  }, []);

  const handleMinus = useCallback(
    (item: CartItem) => {
      if (item.quantity === 1) {
        handleRemoveClick(item.product.id, item.variant?.id ?? null);
      } else {
        updateQty(item.product.id, item.variant?.id ?? null, -1);
      }
    },
    [handleRemoveClick, updateQty]
  );

  const handlePlus = useCallback(
    (item: CartItem) => {
      if (item.quantity >= item.product.stock_quantity) {
        toast.warning(
          `Chỉ còn ${item.product.stock_quantity} sản phẩm trong kho`
        );
        return;
      }
      updateQty(item.product.id, item.variant?.id ?? null, 1);
    },
    [updateQty]
  );

  const startNavigation = useNavigationStore((s) => s.startNavigation);

  const handleCheckout = useCallback(() => {
    if (checkingOut) return;
    if (authLoading) return; // wait for auth to hydrate
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
          <div
            className="flex w-full flex-1 items-center justify-end"
            onClick={closeCart}
          >
            <button
              onClick={closeCart}
              className="rounded-xl border border-outline-variant/40 bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface transition-all active:scale-90"
            >
              Đóng
            </button>
          </div>
        </div>

        {/* Items */}
        <div
          data-allow-scroll
          className="h-[60dvh] min-h-0 space-y-2 overflow-y-auto overscroll-contain px-4 py-2"
        >
          {visibleItems.length === 0 ? (
            <div className="py-12 text-center">
              <Icon
                name="shopping_bag"
                className="flex justify-center text-5xl text-outline-variant"
              />
              <p className="mt-3 font-semibold text-on-surface-variant">
                Giỏ hàng trống
              </p>
            </div>
          ) : (
            visibleItems.map((item) => {
              const itemKey = item.components?.length
                ? `${item.product.id}-kit-${item.components.map((c) => c.variant_id).join("+")}`
                : `${item.product.id}-${item.variant?.id ?? "base"}`;
              return (
                <CartItemRow
                  key={itemKey}
                  item={item}
                  onRemove={handleRemoveClick}
                  onMinus={handleMinus}
                  onPlus={handlePlus}
                />
              );
            })
          )}

          {/* Sustainable packaging badge */}
          {visibleItems.length > 0 && (
            <div className="flex items-center gap-2 rounded-2xl bg-secondary/10 p-2">
              <Icon name="eco" className="text-sm text-secondary" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                Đơn hàng được đóng gói thân thiện với môi trường.
              </p>
            </div>
          )}
        </div>

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
            Xóa sản phẩm?
          </h3>
          <p className="mb-6 text-sm font-semibold text-on-surface-variant">
            Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?
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
              className="btn min-w-32 rounded-full border-0 bg-error font-bold normal-case text-white hover:bg-error/90"
            >
              Xóa
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
