"use client";

import { formatShortVND, formatVND } from "@/lib/currency";
import type { CartItem } from "@/lib/data";
import { NOT_FOUND_IMAGE } from "@/lib/images";
import Image from "next/image";
import { memo, useMemo } from "react";

interface OrderItemsListProps {
  items: CartItem[];
  oosProductIds?: Set<string>;
  onRemove?: (productId: string, variantId: string | null) => void;
}

export const OrderItemsList = memo(function OrderItemsList({
  items,
  oosProductIds,
  onRemove,
}: OrderItemsListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mb-6">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-outline">
        Đơn hàng của bạn ({items.length} sản phẩm)
      </h2>
      <div className="space-y-4">
        {items.map((item) => {
          const isOos = oosProductIds?.has(item.product.id) ?? false;
          const itemKey = item.components?.length
            ? `${item.product.id}-kit-${item.components.map((c) => c.variant_id).join("+")}`
            : `${item.product.id}-${item.variant?.id ?? "base"}`;
          const isPreorder =
            item.is_pre_order || item.components?.some((c) => c.is_pre_order);
          const itemTotal =
            ((item.variant?.effective_price ?? item.product.base_price) +
              (item.components?.reduce(
                (sum, comp) => sum + comp.price_adjustment,
                0
              ) || 0)) *
            item.quantity;
          return (
            <div
              key={itemKey}
              className={`relative overflow-hidden rounded-2xl p-4 shadow-md transition-colors ${
                isOos
                  ? "bg-error/10 ring-1 ring-error/40"
                  : "bg-surface-container-lowest"
              }`}
            >
              {/* OOS banner */}
              {isOos && (
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-error">
                    Hết hàng
                  </span>
                  {onRemove && (
                    <button
                      onClick={() =>
                        onRemove(item.product.id, item.variant?.id ?? null)
                      }
                      className="text-[10px] font-black uppercase tracking-widest text-error underline underline-offset-2 active:opacity-70"
                    >
                      Xoá
                    </button>
                  )}
                </div>
              )}
              {/* Product info */}
              <div className={`flex h-full gap-2 ${isOos ? "opacity-50" : ""}`}>
                {/* Product thumbnail */}
                <div className="relative h-20 w-20 flex-shrink-0 rounded-lg">
                  <Image
                    src={item.product.thumbnail || NOT_FOUND_IMAGE}
                    alt={item.product.name}
                    fill
                    sizes="96px"
                    className="rounded-lg object-contain"
                  />
                  {isPreorder ? (
                    <span className="absolute -left-1.5 -top-2 max-w-max translate-x-1/2 rounded-sm bg-violet-500 px-1 py-0.5 text-[8px] font-black uppercase text-white">
                      Pre-order
                    </span>
                  ) : null}
                </div>

                {/* Product details */}
                <div className="flex min-h-full w-full flex-col items-stretch">
                  <div className="h-20 space-y-2 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="line-clamp-2 text-sm font-bold text-on-surface">
                        {item.product.name}
                      </span>
                      <span className="flex-shrink-0 rounded-lg bg-slate-400/10 px-2 py-0.5 text-xs font-bold text-on-surface-variant">
                        x{item.quantity}
                      </span>
                    </div>
                    {item.variant && (
                      <p className="mt-0.5 text-xs font-semibold text-outline">
                        {item.variant.variant_name}
                      </p>
                    )}
                    {/* Components breakdown */}
                    {item.components &&
                      item.components.length > 0 &&
                      (() => {
                        return (
                          <div className="relative clear-both">
                            <div className="flex flex-wrap items-center gap-2">
                              {item.components.map((component) => (
                                <div
                                  key={component.variant_id}
                                  className="flex items-center justify-between gap-2"
                                >
                                  <div className="flex items-center justify-between gap-2 rounded-sm bg-amber-900/10 px-2 py-1 text-[11px] font-semibold text-on-surface-variant">
                                    <span className="truncate text-on-tertiary-fixed-variant">
                                      {component.variant_name}
                                    </span>
                                    {/* {component.price_adjustment !== 0 ? (
                                    <span
                                      className={`ml-[0.25rem] flex-shrink-0 ${
                                        component.price_adjustment > 0
                                          ? "text-green-500"
                                          : component.price_adjustment < 0
                                            ? "text-red-600"
                                            : "text-on-surface-variant"
                                      }`}
                                    >
                                      {component.price_adjustment !== 0
                                        ? `(${component.price_adjustment > 0 ? "+" : ""}${formatShortVND(
                                            component.price_adjustment
                                          )})`
                                        : ""}
                                    </span>
                                  ) : null} */}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                  </div>
                  {/* Total price for item */}
                  <div className="flex w-full items-center justify-end gap-2 border-t border-outline-variant/60 pt-1 text-right">
                    <span className="text-base font-black text-primary">
                      {formatVND(itemTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Gift breakdown */}
              {item.gifts && item.gifts.length > 0 && (
                <div className="mt-2 space-y-2 border-t border-outline-variant/20 pt-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                    Quà tặng kèm
                  </p>
                  {item.gifts.map((gift) => (
                    <div
                      key={gift.gift_slug}
                      className="flex items-center gap-2"
                    >
                      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-surface-container">
                        {gift.gift_thumbnail ? (
                          <Image
                            src={gift.gift_thumbnail}
                            alt={gift.gift_name}
                            fill
                            sizes="80px"
                            className="rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
                            <span className="text-[10px]">Gift</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col justify-between">
                        <span className="text-xs font-semibold text-emerald-700">
                          {gift.gift_name}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600">
                          x{gift.quantity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
});
