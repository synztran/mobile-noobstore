"use client";

import Image from "@/components/ui/AdaptiveImage";
import { formatVND } from "@/lib/currency";
import { useCartStore } from "@/modules/cart/client/hooks/useCartStore";
import { useCartQuery } from "@/modules/cart/client/react-query/queries";
import { Package } from "lucide-react";
import Link from "next/link";
import { memo } from "react";

interface Props {
  unstyled?: boolean;
}

export function CheckoutCartPreviewSkeleton({
  unstyled = false,
}: {
  unstyled?: boolean;
}) {
  const content = (
    <div className="animate-pulse space-y-3.5">
      <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
        <div className="h-3.5 w-32 rounded-lg bg-surface-container-high" />
        <div className="h-3 w-16 rounded-lg bg-surface-container-high" />
      </div>

      <div className="space-y-3.5 px-1 pt-1.5">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-start gap-3.5">
            {/* Column 1: Thumbnail */}
            <div className="h-16 w-16 shrink-0 rounded-xl bg-surface-container-high" />

            {/* Column 2: Name + Variants */}
            <div className="min-w-0 flex-1 space-y-2 pt-0.5">
              <div className="h-3.5 w-4/5 rounded-md bg-surface-container-high" />
              <div className="h-2.5 w-1/2 rounded-md bg-surface-container-high" />
              <div className="h-3.5 w-20 rounded-md bg-surface-container-high" />
            </div>

            {/* Column 3: Price */}
            <div className="shrink-0 pt-0.5">
              <div className="h-3.5 w-16 rounded-md bg-surface-container-high" />
            </div>
          </div>
        ))}
      </div>
    </div>
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

function CheckoutCartPreview({ unstyled = false }: Props) {
  const items = useCartStore((s) => s.items);
  const isHydrated = useCartStore((s) => s.isHydrated);
  const cartFetching = useCartStore((s) => s.cartFetching);
  const { isLoading } = useCartQuery();

  const isCartLoading =
    !isHydrated || isLoading || (cartFetching && items.length === 0);

  if (isCartLoading) {
    return <CheckoutCartPreviewSkeleton unstyled={unstyled} />;
  }

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
            item.variant?.thumbnail ?? item.product.thumbnail ?? null;
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
                <div className="ring-1.5 absolute -left-1 -top-1.5 z-10 grid h-4 w-4 place-items-center rounded-full bg-neutral text-[9px] font-black leading-none text-white shadow-sm ring-surface">
                  {item.quantity}
                </div>
              </div>
              {/* Column 2: name + variant + components */}
              <div className="min-w-0 flex-1 space-y-1">
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
                {item.variant?.variant_name && (
                  <p className="truncate text-[11px] font-medium text-on-surface-variant">
                    {item.variant.variant_name}
                  </p>
                )}
                {item.components && item.components.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {item.components.map((component) => (
                      <span
                        key={component.variant_id}
                        className="inline-flex max-w-full items-center gap-1 rounded-sm bg-surface-container px-1 py-1 text-[10px] font-semibold leading-tight text-on-surface-variant"
                      >
                        <span className="shrink-0">
                          {component.component_group}:
                        </span>
                        <span className="min-w-0 truncate text-on-surface">
                          {component.variant_name}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Column 3: total price */}
              <div className="flex-shrink-0 text-right">
                <span className="text-xs font-black leading-snug tracking-tight text-on-surface sm:text-sm">
                  {formatVND(unitPrice * item.quantity)}
                </span>
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
