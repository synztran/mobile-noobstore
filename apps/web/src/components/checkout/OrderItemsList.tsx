"use client";

import { formatVND } from "@/lib/currency";
import type { CartItem } from "@/lib/data";
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
      <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-outline">
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
          return (
            <div
              key={itemKey}
              className={`relative overflow-hidden rounded-2xl p-4 transition-colors shadow-md ${
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
              <div
                className={`flex gap-2 h-full ${isOos ? "opacity-50" : ""}`}
              >
                {/* Product thumbnail */}
                <div className="relative h-20 w-24 flex-shrink-0 rounded-lg bg-surface-container">
                  {item.product.thumbnail ? (
                    <Image
                      src={item.product.thumbnail}
                      alt={item.product.name}
                      fill
                      sizes="96px"
                      className="rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
                      <span className="text-xs">No Image</span>
                    </div>
                  )}
                  {isPreorder ? (
                    <span className="absolute -left-1.5 -top-2 max-w-max translate-x-1/2 rounded-sm bg-violet-500 px-1 py-0.5 text-[8px] font-black uppercase text-white">
                      Pre-order
                    </span>
                  ) : null}
                </div>

                {/* Product details */}
                <div className=" w-full space-y-0.5 min-h-full flex flex-col justify-between items-stretch">
                  <div className="line-clamp-3 text-sm font-bold text-on-surface">
                    {item.product.name}
                  </div>
                  {item.variant && (
                    <p className="mt-0.5 text-sm font-semibold text-outline">
                      {item.variant.variant_name}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-auto">
                    {item.variant?.effective_price || item.product.base_price ? (
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-black text-primary">
                          {formatVND(
                            item.variant?.effective_price ??
                              item.product.base_price
                          )}
                        </p>
                        {item.variant?.price_adjustment != null &&
                          item.variant.price_adjustment !== 0 && (
                            <span
                              className={`text-[10px] font-bold ${
                                item.variant.price_adjustment > 0
                                  ? "text-red-500"
                                  : "text-emerald-600"
                              }`}
                            >
                              {item.variant.price_adjustment > 0 ? "+" : ""}
                              {formatVND(item.variant.price_adjustment)}
                            </span>
                          )}
                      </div>
                    ) : null}
                    <div className="flex-shrink-0 text-xs font-bold text-on-surface-variant">
                      Số lượng: {item.quantity}
                    </div>
                  </div>
                </div>

                {/* <span className="flex-shrink-0 rounded-full bg-surface-container px-3 py-1 text-xs font-bold text-on-surface-variant">
                  x{item.quantity}
                </span> */}
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

              {/* Components breakdown */}
              {item.components &&
                item.components.length > 0 &&
                (() => {
                  const itemTotal =
                    ((item.variant?.effective_price ??
                      item.product.base_price) +
                      item.components.reduce(
                        (sum, comp) => sum + comp.price_adjustment,
                        0
                      )) *
                    item.quantity;
                  return (
                    <div className="mt-2 border-t border-outline-variant/60 pt-2">
                      <div className="grid grid-cols-2 gap-2">
                        {item.components.map((component) => (
                          <div
                            key={component.variant_id}
                            className="flex items-center justify-between gap-2"
                          >
                            <div className="flex flex-col w-full bg-slate-100/50 rounded-md p-2">
                              <label className="flex items-cen justify-between text-xs text-on-surface-variant">
                                {component.component_group}
                                <span
                                  className={`ml-auto flex-shrink-0 text-[10px] font-bold ${
                                    component.price_adjustment > 0
                                      ? "text-red-500"
                                      : component.price_adjustment < 0
                                      ? "text-emerald-600"
                                      : "text-on-surface-variant"
                                  }`}
                                >
                                  {component.price_adjustment !== 0
                                    ? `${component.price_adjustment > 0 ? "+" : ""}${formatVND(
                                        component.price_adjustment
                                      )}`
                                    : ""}
                                </span>
                              </label>
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="truncate text-sm text-on-tertiary-fixed-variant font-black">
                                  {component.variant_name}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Total price for item */}
                      <div className="flex w-full items-center justify-end border-t border-outline-variant/60 pt-2 mt-2 text-right gap-2">
                        <span className="text-base font-semibold">Tổng tiền:</span>
                        <span className="text-lg font-black text-primary">
                          {formatVND(itemTotal)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
            </div>
          );
        })}
      </div>
    </section>
  );
});
