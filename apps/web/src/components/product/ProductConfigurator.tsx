"use client";

import type { ConfiguratorGroup } from "@/app/api/products/[slug]/configurator/route";
import type { ShopVariant } from "@/app/api/products/route";
import { formatShortVND, formatVND } from "@/lib/currency";
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
    className: "tracking-wide bg-slate-400",
  },
  {
    key: "ruleDisabled" as const,
    label: "Không khả dụng",
    className: "tracking-wide bg-slate-400",
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

function configuratorButtonClass(
  base: string,
  o: {
    selected: boolean;
    soldOut: boolean;
    ruleDisabled: boolean;
    isDisabled: boolean;
  }
): string {
  if (o.isDisabled && !o.soldOut && !o.ruleDisabled) {
    return clsx(
      base,
      "cursor-not-allowed border-dashed border-outline-variant/80 opacity-55"
    );
  }
  if (o.isDisabled) {
    return clsx(
      base,
      "cursor-not-allowed border-transparent bg-surface-container opacity-40"
    );
  }
  if (o.selected) {
    return clsx(base, "border-primary bg-primary text-white shadow-lg");
  }
  return clsx(
    base,
    "border-transparent bg-surface-container-highest text-on-surface hover:border-outline-variant"
  );
}

function simpleVariantButtonClass(
  base: string,
  o: { soldOut: boolean; isSelected: boolean }
): string {
  if (o.soldOut) {
    return clsx(base, "cursor-not-allowed bg-surface-container opacity-40");
  }
  if (o.isSelected) {
    return clsx(base, "bg-primary text-white shadow-lg");
  }
  return clsx(
    base,
    "bg-surface-container text-on-surface hover:bg-surface-container-high"
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export type ProductConfiguratorProps = {
  groups: ConfiguratorGroup[];
  variants: ShopVariant[];
  selections: Record<string, string[]>;
  loadingConfigurator: boolean;
  basePrice?: number;
  onSelect: (group: string, variantId: string) => void;
  /** Variant IDs that are unavailable due to conditional rules. */
  disabledVariantIds?: Set<string>;
  showTitle?: boolean;
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
  showTitle = true,
}: ProductConfiguratorProps) {
  const hasComponents = groups.length > 0;

  if (loadingConfigurator) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse space-y-2">
            <div className="h-3 w-32 rounded-full bg-surface-dim" />
            <div className="flex gap-2">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-14 w-24 rounded-xl bg-surface-dim" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`space-y-2 rounded-xl bg-[#f8f8f8] ${showTitle ? "p-2" : ""}`}
    >
      {showTitle ? (
        <span className="text-sm font-black uppercase text-primary">
          Lựa chọn cấu hình ({groups.length})
        </span>
      ) : null}
      <div className="flex min-h-0 flex-wrap gap-2">
        {/* Component group selectors */}
        {groups?.map((group) => {
          const groupSelection = selections[group.component_group] ?? [];
          const cap = group.is_required
            ? 1
            : (group.max_quantity ?? group.variants.length);
          const selectedCount = groupSelection.length;
          const capReached = cap > 0 && selectedCount >= cap;
          return (
            <div
              key={group.component_group}
              className={`w-full max-w-max space-y-2.5 rounded-lg bg-surface-container-low p-2`}
            >
              <div className="flex items-center gap-1">
                <span
                  className={clsx(
                    "rounded px-1.5 py-0.5 text-[10px] font-black tracking-wider",
                    group.is_required
                      ? "bg-error/10 text-error"
                      : "bg-surface-container"
                  )}
                >
                  {group.is_required ? "Bắt buộc" : "Tùy chọn"}
                </span>
                <p
                  className={`text-[10px] font-black tracking-widest text-on-surface-variant`}
                >
                  {group.component_group}
                </p>
                {!group.is_required && groupSelection.length > 0 && (
                  <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    Đã chọn {selectedCount}/{group.variants.length}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {group.variants.map((v) => {
                  const selected = groupSelection.includes(v.id);
                  const soldOut = v.stock_quantity === 0;
                  const ruleDisabled = disabledVariantIds?.has(v.id) ?? false;
                  const overCap = !selected && capReached && !group.is_required;
                  const isDisabled = soldOut || ruleDisabled || overCap;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => onSelect(group.component_group, v.id)}
                      className={configuratorButtonClass(
                        "relative flex min-w-20 items-center justify-center gap-2 rounded-sm border px-2 pb-1 pt-1.5 font-bold transition-all",
                        { selected, soldOut, ruleDisabled, isDisabled }
                      )}
                    >
                      <div className="inline-flex items-center gap-1">
                        <p className="line-clamp-2 text-left text-xs font-black">
                          {v.variant_name}
                        </p>
                        <p
                          className={clsx(
                            "text-right text-xs font-black",
                            v.price_adjustment !== 0 ? "" : "sr-only",
                            v.price_adjustment > 0
                              ? `${selected ? "text-green-400" : "text-green-700"}`
                              : `${selected ? "text-red-400" : "text-red-700"}`
                          )}
                        >
                          (
                          {v.price_adjustment &&
                            (v.price_adjustment > 0 ? "+" : "")}
                          {formatShortVND(v.price_adjustment)})
                        </p>
                      </div>
                      {v.sale_price_percent ? (
                        <div className="absolute -top-2 right-0.5">
                          <div className="rounded bg-red-600 px-2 text-[9px] text-white">
                            Giảm {v.sale_price_percent}%
                          </div>
                        </div>
                      ) : null}
                      <div className="absolute -top-2 left-1">
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
          );
        })}

        {/* Simple variant selector (non-composite products) */}
        {!hasComponents && variants.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Chọn tùy chọn
            </p>
            <div className="grid grid-cols-2 gap-2">
              {variants.map((v) => {
                const isSelected =
                  selections["__variant__"]?.includes(v.id) ?? false;
                const soldOut = v.stock_quantity === 0;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={soldOut}
                    onClick={() => onSelect("__variant__", v.id)}
                    className={simpleVariantButtonClass(
                      "rounded-xl px-4 py-3 text-left text-sm font-bold transition-all",
                      { soldOut, isSelected }
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
    </div>
  );
}
