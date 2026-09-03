"use client";

import Icon from "@/components/ui/Icon";
import { formatVND } from "@/lib/currency";
import type { CartItem } from "@/lib/data";
import { Trash } from "lucide-react";
import Image from "@/components/ui/AdaptiveImage";
import { memo, useMemo } from "react";

function itemUnitPrice(item: CartItem) {
  const base = item.variant?.effective_price ?? item.product.base_price;
  const components =
    item.components?.reduce((s, c) => s + c.price_adjustment, 0) ?? 0;
  return base + components;
}

interface CartItemRowProps {
  item: CartItem;
  isRemoving?: boolean;
  onRemove: () => void;
  onMinus: () => void;
  onPlus: () => void;
}

function CartItemRow({
  item,
  isRemoving,
  onRemove,
  onMinus,
  onPlus,
}: CartItemRowProps) {
  const unitTotal = useMemo(() => itemUnitPrice(item) * item.quantity, [item]);
  const showPreOrderBadge = useMemo(
    () => item.is_pre_order || item.components?.some((c) => c.is_pre_order),
    [item]
  );

  return (
    <div
      className={`relative flex gap-2 rounded-xl bg-surface-container-low p-2 transition-opacity duration-300 ${
        isRemoving ? "pointer-events-none opacity-50" : ""
      }`}
    >
      <button
        onClick={onRemove}
        disabled={isRemoving}
        aria-label={`Xóa ${item.product.name} khỏi giỏ hàng`}
        className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-400 transition-transform active:scale-90 disabled:opacity-50"
      >
        {isRemoving ? (
          <span className="loading loading-spinner loading-xs text-white" />
        ) : (
          <Trash className="text-white" size={14} />
        )}
      </button>
      <div className="relative h-24 w-24 flex-shrink-0 bg-surface-container">
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
        {showPreOrderBadge && (
          <span className="absolute -top-2 left-1/2 min-w-16 -translate-x-1/2 transform truncate text-nowrap rounded-sm bg-violet-500 px-1 py-0.5 text-center text-[8px] font-black uppercase text-white">
            Pre-order
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col space-y-2">
        <div className="mr-6 line-clamp-3 text-sm font-black tracking-wide text-on-surface">
          {item.product.name}
        </div>
        {item.variant && (
          <p className="mt-0.5 text-xs font-semibold tracking-wide text-on-surface-variant">
            {item.variant.variant_name}
          </p>
        )}
        {item.product.tags ? (
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
        ) : null}
        <div className="flex flex-wrap gap-2">
          {item.components &&
            item.components.map((c) => (
              <span
                key={c.variant_id}
                className="inline-flex items-center rounded-sm bg-gray-200 px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant"
              >
                {c.component_group}:&nbsp;
                <span className="font-black">{c.variant_name}</span>
              </span>
            ))}
        </div>
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
        <div className="!mt-auto flex items-center justify-between">
          <div className="flex items-center gap-2 rounded-lg bg-gray-200 px-2 py-1">
            <button
              onClick={onMinus}
              disabled={isRemoving}
              className="text-base font-bold leading-none text-on-surface transition-transform active:scale-90 disabled:opacity-30"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-bold text-on-surface">
              {item.quantity}
            </span>
            <button
              onClick={onPlus}
              disabled={isRemoving}
              className="text-base font-bold leading-none text-on-surface transition-transform active:scale-90 disabled:opacity-30"
            >
              +
            </button>
          </div>
          <p className="font-black text-primary">{formatVND(unitTotal)}</p>
        </div>
      </div>
    </div>
  );
}

export default memo(CartItemRow);
