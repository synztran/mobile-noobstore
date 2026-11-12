"use client";

import { useState, useTransition } from "react";
import Image from "@/components/ui/AdaptiveImage";
import Link from "next/link";
import { formatVND } from "@/lib/currency";
import { useCartStore } from "@/modules/cart/client/hooks/useCartStore";
import { useAddCartItem } from "@/modules/cart/client/react-query/mutations";
import { useAuth } from "@/modules/user/client/AuthProvider";
import { toast } from "@/lib/toast";
import { Check, ShoppingBag, Sparkles, ArrowRight } from "lucide-react";
import clsx from "clsx";
import type { ShopProduct, ProductDetail, ProductAddonDeal } from "@/modules/products/types";

interface FrequentlyBoughtTogetherProps {
  currentProduct: ProductDetail;
  deals?: ProductAddonDeal[];
  fallbackProducts?: ShopProduct[];
}

interface DisplayItem {
  id: string;
  name: string;
  slug: string;
  thumbnail: string | null;
  originalPrice: number;
  salePrice: number;
  savedAmount: number;
  discountBadge: string | null;
  rawProduct: ShopProduct;
}

export function FrequentlyBoughtTogether({
  currentProduct,
  deals = [],
  fallbackProducts = [],
}: FrequentlyBoughtTogetherProps) {
  // Normalize items to display
  const items: DisplayItem[] = deals.length > 0
    ? deals
        .filter((d) => d.product.product_type !== "kit" && d.product.stock_quantity > 0)
        .slice(0, 3)
        .map((d) => {
          const original = d.product.min_price || d.product.base_price || 0;
          const percent =
            d.discount_type === "percentage"
              ? d.discount_value
              : Math.round((d.saved_amount / (original || 1)) * 100);
          return {
            id: d.product.id,
            name: d.product.name,
            slug: d.product.slug,
            thumbnail: d.product.thumbnail,
            originalPrice: original,
            salePrice: d.discounted_price,
            savedAmount: d.saved_amount,
            discountBadge: percent > 0 ? `-${percent}%` : null,
            rawProduct: d.product,
          };
        })
    : fallbackProducts
        .filter((p) => p.product_type !== "kit" && p.stock_quantity > 0)
        .slice(0, 3)
        .map((p) => {
          const price = p.min_price || p.base_price || 0;
          return {
            id: p.id,
            name: p.name,
            slug: p.slug,
            thumbnail: p.thumbnail,
            originalPrice: price,
            salePrice: price,
            savedAmount: 0,
            discountBadge: null,
            rawProduct: p,
          };
        });

  // Default checked: all valid items
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    items.map((i) => i.id)
  );
  const [isPending, startTransition] = useTransition();

  const { addStandardProduct, openCart } = useCartStore();
  const addCartItem = useAddCartItem();
  const { user } = useAuth();

  if (items.length === 0) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedItems = items.filter((i) => selectedIds.includes(i.id));

  const mainPrice = currentProduct.base_price || 0;
  const totalSalePrice =
    mainPrice + selectedItems.reduce((sum, i) => sum + i.salePrice, 0);
  const totalSaved = selectedItems.reduce(
    (sum, i) => sum + i.savedAmount,
    0
  );
  const totalItemsCount = 1 + selectedItems.length;

  const handleAddBundleToCart = () => {
    if (selectedItems.length === 0) return;
    if (!user) {
      toast.error("Vui lòng đăng nhập để thêm vào giỏ hàng");
      return;
    }

    startTransition(async () => {
      try {
        // 1. Add current main product
        const mainVariant = currentProduct.variants?.[0] ?? null;
        await addCartItem.mutateAsync({
          product_id: currentProduct.id,
          variant_id: mainVariant?.id ?? null,
        });
        addStandardProduct(
          {
            id: currentProduct.id,
            name: currentProduct.name,
            category: currentProduct.category,
            base_price: currentProduct.base_price,
            stock_quantity: currentProduct.stock_quantity ?? 0,
            thumbnail: currentProduct.thumbnail,
            is_pre_order: currentProduct.is_pre_order,
            brand: currentProduct.brand ?? "",
          },
          mainVariant
        );

        // 2. Add all selected addon products with discounted price
        for (const item of selectedItems) {
          const p = item.rawProduct;
          const variant = p.variants?.[0] ?? null;
          await addCartItem.mutateAsync({
            product_id: p.id,
            variant_id: variant?.id ?? null,
          });
          addStandardProduct(
            {
              id: p.id,
              name: p.name,
              category: p.category,
              base_price: item.salePrice, // Apply configured discounted price
              stock_quantity: p.stock_quantity,
              thumbnail: p.thumbnail,
              is_pre_order: p.is_pre_order,
              brand: p.brand ?? "",
            },
            variant,
            p.gifts
          );
        }
        toast.success(
          `Đã thêm ${totalItemsCount} sản phẩm (bao gồm sản phẩm chính) vào giỏ hàng!`
        );
        openCart();
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Không thể thêm một số sản phẩm vào giỏ hàng"
        );
      }
    });
  };

  return (
    <section
      id="frequently-bought-together-section"
      className="mt-8 scroll-mt-24 rounded-2xl border border-outline-variant/30 bg-surface p-4 shadow-ambient-sm transition-all md:p-6"
    >
      {/* ── Section Header ── */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles size={16} />
          </span>
          <div>
            <h3 className="text-base font-black uppercase tracking-tight text-on-surface sm:text-lg">
              Mua kèm giá tốt
            </h3>
            <p className="text-xs text-on-surface-variant">
              Các sản phẩm thường được chọn cùng với{" "}
              <span className="font-semibold text-on-surface">
                {currentProduct.name}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Visual Flow: Current + Addon items ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px] lg:items-center">
        {/* Left: Product cards joined with "+" */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* Main product (anchor) */}
          <div className="flex w-[150px] flex-col items-center gap-2 rounded-xl bg-surface-container-low p-2.5 sm:w-[160px]">
            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-surface-container">
              {currentProduct.thumbnail && (
                <Image
                  src={currentProduct.thumbnail}
                  alt={currentProduct.name}
                  fill
                  sizes="160px"
                  className="object-cover"
                />
              )}
              <span className="absolute left-1.5 top-1.5 rounded bg-primary px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-surface">
                Đang xem
              </span>
            </div>
            <div className="w-full text-center">
              <p className="line-clamp-2 text-xs font-bold text-on-surface">
                {currentProduct.name}
              </p>
              <p className="mt-1 text-xs font-black text-on-surface">
                {formatVND(currentProduct.base_price || 0)}
              </p>
            </div>
          </div>

          {items.map((item) => {
            const isSelected = selectedIds.includes(item.id);

            return (
              <div key={item.id} className="flex items-center gap-3 sm:gap-4">
                <span className="text-xl font-black text-on-surface-variant/50">
                  +
                </span>
                <button
                  type="button"
                  onClick={() => toggleSelect(item.id)}
                  className={clsx(
                    "group relative flex w-[150px] flex-col items-center gap-2 rounded-xl p-2.5 text-left sm:w-[160px] sm:transition-all lg:transition-none active:scale-[0.98] lg:active:scale-100",
                    isSelected
                      ? "bg-primary/[0.06] ring-2 ring-primary"
                      : "bg-surface-container-low opacity-70 hover:opacity-100"
                  )}
                >
                  {/* Selected check badge at top-right corner of entire card */}
                  <div
                    className={clsx(
                      "absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full shadow-sm transition-colors",
                      isSelected
                        ? "bg-primary text-white ring-2 ring-surface"
                        : "border border-outline-variant/60 bg-surface text-transparent"
                    )}
                  >
                    <Check size={14} strokeWidth={3} />
                  </div>

                  <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-surface-container">
                    {item.thumbnail && (
                      <Image
                        src={item.thumbnail}
                        alt={item.name}
                        fill
                        sizes="160px"
                        className="object-cover sm:transition-transform sm:duration-300 sm:group-hover:scale-105 lg:transition-none lg:group-hover:scale-100"
                      />
                    )}
                    {item.discountBadge && (
                      <span className="absolute left-1.5 top-1.5 rounded bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white shadow-sm">
                        {item.discountBadge}
                      </span>
                    )}
                  </div>
                  <div className="w-full text-center">
                    <p className="line-clamp-2 text-xs font-bold text-on-surface">
                      {item.name}
                    </p>
                    <div className="mt-1 flex flex-col items-center">
                      <span className="text-xs font-black text-primary">
                        {formatVND(item.salePrice)}
                      </span>
                      {item.savedAmount > 0 && (
                        <span className="text-[10px] text-on-surface-variant/60 line-through">
                          {formatVND(item.originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Right: Summary box + Add all to cart */}
        <div className="flex flex-col justify-between rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Tổng tiền combo ({totalItemsCount} món)
            </p>
            <p className="mt-1 text-2xl font-black text-primary">
              {formatVND(totalSalePrice)}
            </p>
            {totalSaved > 0 && (
              <p className="mt-1 text-xs font-bold text-rose-600">
                Tiết kiệm {formatVND(totalSaved)} khi mua kèm
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleAddBundleToCart}
            disabled={selectedItems.length === 0 || isPending}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xs font-black uppercase tracking-widest text-surface shadow-ambient-sm transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <ShoppingBag size={15} />
            )}
            Thêm cả {totalItemsCount} món vào giỏ
          </button>
        </div>
      </div>

      {/* ── Checkbox List for clarity ── */}
      <div className="mt-4 divide-y divide-outline-variant/10 border-t border-outline-variant/15 pt-3">
        {items.map((item) => {
          const isSelected = selectedIds.includes(item.id);

          return (
            <label
              key={item.id}
              className="flex cursor-pointer items-center justify-between py-2 text-xs transition-none hover:text-primary"
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(item.id)}
                  className="checkbox checkbox-primary checkbox-xs rounded"
                />
                <span
                  className={clsx(
                    "font-medium",
                    isSelected
                      ? "font-bold text-on-surface"
                      : "text-on-surface-variant"
                  )}
                >
                  {item.name}
                </span>
                {item.discountBadge && (
                  <span className="rounded bg-rose-50 px-1 py-0.5 text-[9px] font-bold text-rose-600">
                    {item.discountBadge}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="font-bold text-primary">
                    {formatVND(item.salePrice)}
                  </span>
                  {item.savedAmount > 0 && (
                    <span className="ml-1.5 text-[10px] text-on-surface-variant/60 line-through">
                      {formatVND(item.originalPrice)}
                    </span>
                  )}
                </div>
                <Link
                  href={`/shop/${item.slug}`}
                  className="text-on-surface-variant/60 hover:text-primary"
                  title="Xem chi tiết"
                >
                  <ArrowRight size={13} />
                </Link>
              </div>
            </label>
          );
        })}
      </div>
    </section>
  );
}
