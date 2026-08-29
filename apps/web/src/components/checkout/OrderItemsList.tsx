"use client";

import { formatVND } from "@/lib/currency";
import type { CartItem } from "@/lib/data";
import { NOT_FOUND_IMAGE } from "@/lib/images";
import Image from "@/components/ui/AdaptiveImage";
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
                <div className="relative h-20 min-w-24">
                  <Image
                    src={item.product.thumbnail || NOT_FOUND_IMAGE}
                    alt={item.product.name}
                    fill
                    sizes="96px"
                    className="rounded-xl object-cover"
                  />
                  {isPreorder ? (
                    <span className="absolute -top-2 left-4 max-w-max rounded-sm bg-violet-500 px-2 py-0.5 text-[8px] font-black uppercase text-white">
                      Pre-order
                    </span>
                  ) : null}
                </div>

                {/* Product details */}
                <div className="flex min-h-full w-full flex-col items-stretch space-y-2">
                  <span className="line-clamp-3 text-sm font-bold text-on-surface">
                    {item.product.name}
                  </span>
                  {/* Components breakdown */}
                  {item.components && item.components.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {item.components.map((component) => (
                        <p
                          key={`${item.id}-${component.variant_id}`}
                          className="truncate rounded-md bg-gray-200 px-2 py-1 text-[10px] font-semibold leading-snug text-on-surface-variant"
                        >
                          {component.component_group}:{" "}
                          <span className="font-bold text-on-surface">
                            {component.variant_name}
                          </span>
                        </p>
                      ))}
                    </div>
                  ) : null}

                  {/* Total price for item */}
                  <div
                    className={`${!item.components?.length ? "!mt-auto" : ""} flex items-center justify-between`}
                  >
                    <span className="text-xs text-on-surface-variant">
                      Số lượng:{" "}
                      <span className="font-black">{item.quantity}</span>
                    </span>
                    <span className="text-sm font-black text-primary">
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
