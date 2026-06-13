"use client";

import type { ConfiguratorGroup } from "@/app/api/products/[slug]/configurator/route";
import type { ShopVariant } from "@/app/api/products/route";
import { formatVND } from "@/lib/currency";
import { Thumbnail } from "@/components/ui/Thumbnail";
import clsx from "clsx";

// ─── VariantStatusBadge ─────────────────────────────────────────────────────────

type VariantStatusBadgeProps = {
  soldOut: boolean;
  ruleDisabled: boolean;
  isPreOrder: boolean;
};

const VARIANT_STATUS_BADGE = [
  {
    key: "soldOut" as const,
    label: "Hết hàng",
    className: "tracking-wide",
  },
  {
    key: "ruleDisabled" as const,
    label: "Không khả dụng",
    className: "tracking-wide",
  },
  {
    key: "isPreOrder" as const,
    label: "Pre-order",
    className: "tracking-wide bg-violet-400",
  },
] satisfies Array<{
  key: keyof VariantStatusBadgeProps;
  label: string;
  className: string;
}>;

function VariantStatusBadge(props: VariantStatusBadgeProps) {
  const match = VARIANT_STATUS_BADGE.find((s) => props[s.key]);
  if (!match) return null;
  return (
    <div
      className={clsx(
        match.className,
        `rounded-[4px] px-1 text-[8px] text-white`
      )}
    >
      {match.label}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export type ProductConfiguratorProps = {
  groups: ConfiguratorGroup[];
  variants: ShopVariant[];
  selections: Record<string, string>;
  loadingConfigurator: boolean;
  basePrice?: number;
  onSelect: (group: string, variantId: string) => void;
  isHideComppGroup?: boolean;
  /** Variant IDs that are unavailable due to conditional rules. */
  disabledVariantIds?: Set<string>;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductConfigurator({
  groups,
  variants,
  selections,
  loadingConfigurator,
  basePrice,
  onSelect,
  disabledVariantIds,
}: ProductConfiguratorProps) {
  const hasComponents = groups.length > 0;

  if (loadingConfigurator) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse space-y-2">
            <div className="h-3 w-32 rounded-full bg-surface-container" />
            <div className="flex gap-2">
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="h-14 w-24 rounded-xl bg-surface-container"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-wrap gap-4">
      {/* Component group selectors */}
      {groups.map((group) => (
        <div key={group.component_group} className={`space-y-3`}>
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${group.is_required ? "bg-error/10 text-error" : "bg-surface-container"}`}
            >
              {group.is_required ? "Bắt buộc" : "Tùy chọn"}
            </span>
            <p
              className={`text-xs font-black tracking-widest text-on-surface-variant`}
            >
              {group.component_group}
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            {group.variants.map((v) => {
              const selected = selections[group.component_group] === v.id;
              const soldOut = v.stock_quantity === 0;
              const ruleDisabled = disabledVariantIds?.has(v.id) ?? false;
              const isDisabled = soldOut || ruleDisabled;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => onSelect(group.component_group, v.id)}
                  className={clsx(
                    "relative flex min-w-20 items-center justify-center gap-2 rounded-md border px-2 py-1.5 font-bold transition-all",
                    isDisabled
                      ? "cursor-not-allowed border-transparent bg-surface-container opacity-40"
                      : selected
                        ? "border-primary bg-primary text-white shadow-lg"
                        : "border-transparent bg-gray-200 text-on-surface hover:border-outline-variant"
                  )}
                >
                  <div className="max-w-26 space-y-1 text-left">
                    <p className="line-clamp-2 text-xs font-bold">
                      {v.variant_name}
                    </p>
                    <p
                      className={clsx(
                        "text-right text-[10px] text-green-600",
                        v.price_adjustment !== 0 ? "" : "sr-only"
                      )}
                    >
                      {v.price_adjustment &&
                        (v.price_adjustment > 0 ? "+" : "-")}
                      {formatVND(v.price_adjustment)}
                    </p>
                  </div>
                  {v.sale_price_percent ? (
                    <strong className="py-0.25 absolute -top-2 right-1 rounded-md bg-red-600 px-2 text-[10px] text-white">
                      Giảm {v.sale_price_percent}%
                    </strong>
                  ) : null}
                  <div className="absolute -top-2.5 left-1">
                    <VariantStatusBadge
                      soldOut={soldOut}
                      ruleDisabled={ruleDisabled}
                      isPreOrder={v.is_pre_order}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Simple variant selector (non-composite products) */}
      {!hasComponents && variants.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Chọn tùy chọn
          </p>
          <div className="grid grid-cols-2 gap-2">
            {variants.map((v) => {
              const isSelected = selections["__variant__"] === v.id;
              const soldOut = v.stock_quantity === 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={soldOut}
                  onClick={() => onSelect("__variant__", v.id)}
                  className={clsx(
                    "rounded-xl px-4 py-3 text-left text-sm font-bold transition-all",
                    soldOut
                      ? "cursor-not-allowed bg-surface-container opacity-40"
                      : isSelected
                        ? "bg-primary text-white shadow-lg"
                        : "bg-surface-container text-on-surface hover:bg-surface-container-high"
                  )}
                >
                  <p className="truncate font-black">{v.variant_name}</p>
                  {soldOut ? (
                    <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-error">
                      Hết hàng
                    </p>
                  ) : v.is_pre_order ? (
                    <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-violet-400">
                      Đặt trước
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs opacity-70">
                      {formatVND(v.effective_price)}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
