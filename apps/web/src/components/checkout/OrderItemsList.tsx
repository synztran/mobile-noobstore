"use client";

import { formatVND } from "@/lib/currency";
import type { CartItem } from "@/lib/data";
import Image from "next/image";

interface OrderItemsListProps {
  items: CartItem[];
  oosProductIds?: Set<string>;
  onRemove?: (productId: string, variantId: string | null) => void;
}

export function OrderItemsList({
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
        Đơn hàng của bạn
      </h2>
      <div className="space-y-3">
        {items.map((item) => {
          const isOos = oosProductIds?.has(item.product.id) ?? false;
          const itemKey = item.components?.length
            ? `${item.product.id}-kit-${item.components.map((c) => c.variant_id).join("+")}`
            : `${item.product.id}-${item.variant?.id ?? "base"}`;
          return (
            <div
              key={itemKey}
              className={`relative overflow-hidden rounded-3xl p-4 transition-colors ${
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
                className={`flex items-start gap-2 ${isOos ? "opacity-50" : ""}`}
              >
                {/* Product thumbnail */}
                <div className="relative h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-surface-container">
                  {item.product.thumbnail ? (
                    <Image
                      src={item.product.thumbnail}
                      alt={item.product.name}
                      fill
                      className="rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
                      <span className="text-xs">No Image</span>
                    </div>
                  )}
                </div>

                {/* Product details */}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold text-on-surface">
                    {item.product.name}
                  </h3>
                  {item.variant && (
                    <p className="mt-0.5 text-xs font-semibold text-outline">
                      {item.variant.variant_name}
                    </p>
                  )}
                  <p className="mt-1 text-sm font-black text-primary">
                    {formatVND(
                      item.variant?.effective_price ?? item.product.base_price
                    )}
                  </p>
                  <div className="inline-flex items-center gap-2">
                    {item.components?.some((c) => c.is_pre_order) && (
                      <span className="rounded-sm bg-violet-500 px-1 py-0.5 text-[10px] font-black uppercase text-white">
                        Pre-order
                      </span>
                    )}
                  </div>
                </div>
                <span className="flex-shrink-0 rounded-full bg-surface-container px-3 py-1 text-xs font-bold text-on-surface-variant">
                  x{item.quantity}
                </span>
              </div>

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
                    <div className="mt-2 space-y-2 border-t border-outline-variant/20 pt-3">
                      {item.components.map((component) => (
                        <div
                          key={component.variant_id}
                          className="flex items-center justify-between gap-2"
                        >
                          <div className="grid w-full grid-cols-[90px_auto_max-content] items-center gap-2">
                            <span className="rounded-sm bg-gray-100 px-2 py-1 text-center text-xs font-black text-on-surface-variant">
                              {component.component_group}
                            </span>
                            <span className="truncate text-xs font-semibold text-on-tertiary-fixed-variant">
                              {component.variant_name}
                            </span>
                            <span
                              className={`ml-auto flex-shrink-0 text-[10px] font-bold text-primary ${component.price_adjustment > 0 ? "" : "opacity-0"}`}
                            >
                              +{formatVND(component.price_adjustment)}
                            </span>
                          </div>
                        </div>
                      ))}
                      {/* Total price for item */}
                      <div className="flex w-full items-center justify-end border-t border-outline-variant/20 pt-2 text-right">
                        <span className="text-sm font-black text-primary">
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
}
