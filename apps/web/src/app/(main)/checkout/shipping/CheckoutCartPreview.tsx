"use client";

import Image from "@/components/ui/AdaptiveImage";
import { formatVND } from "@/lib/currency";
import { useCartStore } from "@/modules/cart/client/hooks/useCartStore";
import { Package } from "lucide-react";
import Link from "next/link";
import { memo } from "react";

interface Props {
  unstyled?: boolean;
}

function CheckoutCartPreview({ unstyled = false }: Props) {
  const items = useCartStore((s) => s.items);

  if (items.length === 0) return null;

  const content = (
    <>
      <div className="mb-3.5 flex items-center justify-between border-b border-outline-variant/30 pb-3">
        <p className="text-xs font-black uppercase tracking-wider text-on-surface">
          Tóm tắt đơn hàng ({items.length} món)
        </p>
        <Link
          href="/shop"
          className="text-[11px] font-bold text-primary transition-opacity hover:opacity-80"
        >
          Sửa giỏ hàng
        </Link>
      </div>

      <div className="max-h-72 space-y-3.5 overflow-y-auto px-1 pt-1.5">
        {items.map((item, idx) => {
          const displayImage =
            item.variant?.thumbnail ??
            item.product.thumbnail ??
            null;
          const unitPrice =
            (item.variant?.effective_price ?? item.product.base_price) +
            (item.components ?? []).reduce(
              (sum, c) => sum + (c.price_adjustment || 0),
              0
            );

          const isPreOrder =
            item.is_pre_order ||
            item.product?.is_pre_order ||
            (item.components ?? []).some((c) => c.is_pre_order);

          return (
            <div
              key={`${item.product.id}-${item.variant?.id ?? idx}`}
              className="flex items-start gap-3.5"
            >
              <div className="relative flex-shrink-0">
                <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container">
                  {displayImage ? (
                    <Image
                      src={displayImage}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-outline-variant">
                      <Package size={22} />
                    </div>
                  )}
                </div>
                {/* Elevated Circle Quantity Badge top-left */}
                <div className="absolute -left-1 -top-1.5 z-10 grid h-4 w-4 place-items-center rounded-full bg-neutral text-[9px] font-black leading-none text-white shadow-sm ring-1.5 ring-surface">
                  {item.quantity}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isPreOrder && (
                        <span className="inline-flex items-center rounded bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-violet-700 dark:text-violet-400">
                          Pre-order
                        </span>
                      )}
                      <p className="line-clamp-2 text-xs font-bold leading-snug text-on-surface">
                        {item.product.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className="text-xs font-black tracking-tight text-on-surface leading-snug sm:text-sm">
                      {formatVND(unitPrice * item.quantity)}
                    </span>
                  </div>
                </div>
                {item.variant?.variant_name && (
                  <p className="mt-1 truncate text-[11px] text-on-surface-variant">
                    {item.variant.variant_name}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  if (unstyled) {
    return content;
  }

  return (
    <div className="rounded-2xl border border-outline-variant/20 bg-surface p-5 shadow-ambient-sm">
      {content}
    </div>
  );
}

export default memo(CheckoutCartPreview);