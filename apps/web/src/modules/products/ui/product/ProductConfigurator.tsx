"use client";

import type { ConfiguratorGroup, ShopVariant } from "@/modules/products/types";
import { formatShortVND, formatVND } from "@/lib/currency";
import { Check } from "lucide-react";
import clsx from "clsx";
import type { ReactNode } from "react";

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

function getVariantStatus(
  soldOut: boolean,
  ruleDisabled: boolean,
  stockQuantity: number
) {
  if (soldOut) return { label: "Hết hàng", className: "text-error" };
  if (ruleDisabled) return { label: "Không khả dụng", className: "text-error" };
  if (stockQuantity <= 2) {
    return {
      label: `Sắp hết · Còn ${stockQuantity}`,
      className: "text-amber-700",
    };
  }
  return { label: `Còn ${stockQuantity}`, className: "text-secondary" };
}

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
      "cursor-not-allowed border-dashed border-outline-variant/80 "
    );
  }
  if (o.isDisabled) {
    return clsx(
      base,
      "cursor-not-allowed border-transparent bg-surface-container "
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
  showStockInline?: boolean;
  purchaseActions?: ReactNode;
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
  showStockInline = false,
  purchaseActions,
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
    <div className="rounded-xl bg-[#f8f8f8] p-2 lg:rounded-none lg:bg-transparent lg:p-0">
      {showTitle ? (
        <span className="block text-sm font-black uppercase text-primary lg:mb-3">
          Lựa chọn cấu hình
        </span>
      ) : null}
      <div className="mt-2 flex min-h-0 flex-wrap gap-2 lg:block">
        {/* Component group selectors */}
        {groups?.map((group) => {
          const groupSelection = selections[group.component_group] ?? [];
          const cap = group.is_required
            ? 1
            : (group.max_quantity ?? group.variants.length);
          const selectedCount = groupSelection.length;
          const capReached = cap > 0 && selectedCount >= cap;
          const selectedVariant = group.variants.find((variant) =>
            groupSelection.includes(variant.id)
          );
          const showLowStock =
            selectedVariant &&
            selectedVariant.stock_quantity > 0 &&
            selectedVariant.stock_quantity <= 3;
          return (
            <div
              key={group.component_group}
              className="-mt-4 w-full max-w-max space-y-2.5 rounded-lg bg-surface-container-low p-2 lg:mt-0 lg:max-w-none lg:space-y-2 lg:rounded-xl lg:bg-surface lg:p-0"
            >
              <div className="flex items-center gap-2 lg:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="text-xs font-black tracking-widest text-on-surface-variant">
                    {group.component_group}
                  </p>
                  {showLowStock && (
                    <span className="text-[10px] font-semibold text-amber-700">
                      Sẵn hàng {selectedVariant.stock_quantity}
                    </span>
                  )}
                </div>
                <span
                  className={clsx(
                    "rounded px-1.5 py-0.5 text-[8px] font-black tracking-wider lg:order-1 lg:rounded-md lg:px-2 lg:py-0.5 lg:text-[10px]",
                    group.is_required
                      ? "bg-error/10 text-error"
                      : "bg-surface-container-highest"
                  )}
                >
                  {group.is_required ? "Bắt buộc" : "Tùy chọn"}
                </span>
                {/* {!group.is_required && groupSelection.length > 0 && (
                  <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    Đã chọn {selectedCount}/{group.variants.length}
                  </span>
                )} */}
              </div>
              <div className="flex flex-wrap items-center gap-3 lg:hidden">
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
                        "relative flex min-w-24 items-center justify-center gap-2 rounded-sm border px-2 pb-1 pt-1.5 font-bold transition-all",
                        { selected, soldOut, ruleDisabled, isDisabled }
                      )}
                    >
                      <div className="flex flex-col items-start gap-0.5">
                        <div className="inline-flex items-center gap-1">
                          <p className="text-left text-xs font-black">
                            {v.variant_name}
                          </p>
                          {(() => {
                            const eff =
                              v.effective_price_adjustment ??
                              v.price_adjustment;
                            const shouldShow =
                              eff !== undefined && eff !== null && eff !== 0;
                            return (
                              <p
                                className={clsx(
                                  "text-right text-xs font-black",
                                  soldOut || ruleDisabled || overCap
                                    ? "sr-only"
                                    : "",
                                  shouldShow ? "" : "sr-only",
                                  eff > 0
                                    ? `${selected ? "text-green-400" : "text-green-700"}`
                                    : `${selected ? "text-red-400" : "text-red-700"}`
                                )}
                              >
                                ({shouldShow && (eff > 0 ? "+" : "")}
                                {formatShortVND(eff)})
                              </p>
                            );
                          })()}
                        </div>
                        {/* {showStockInline && (
                          <span
                            className={clsx(
                              "text-[9px] font-semibold",
                              soldOut
                                ? "text-on-surface-variant"
                                : v.stock_quantity <= 2
                                  ? "text-amber-700"
                                  : "text-emerald-700"
                            )}
                          >
                            {soldOut
                              ? "Hết hàng"
                              : v.is_pre_order
                                ? "Đặt trước"
                                : v.stock_quantity <= 2
                                  ? `Sắp hết · Còn ${v.stock_quantity}`
                                  : `Còn ${v.stock_quantity}`}
                          </span>
                        )} */}
                      </div>
                      <div className="absolute -top-2 left-1">
                        <VariantStatusBadge
                          soldOut={soldOut}
                          ruleDisabled={ruleDisabled}
                          isPreOrder={v.is_pre_order}
                        />
                      </div>
                      {v.sale_price_percent && !soldOut ? (
                        <div className="absolute -top-1.5 right-0.5">
                          <div className="rounded bg-red-600 px-1 text-[8px] text-white">
                            Giảm {v.sale_price_percent}%
                          </div>
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <div className="hidden flex-wrap items-start gap-4 lg:flex">
                {group.variants.map((v) => {
                  const selected = groupSelection.includes(v.id);
                  const soldOut = v.stock_quantity === 0;
                  const ruleDisabled = disabledVariantIds?.has(v.id) ?? false;
                  const overCap = !selected && capReached && !group.is_required;
                  const isDisabled = soldOut || ruleDisabled || overCap;
                  const adjustment =
                    v.effective_price_adjustment ?? v.price_adjustment;
                  const hasAdjustment =
                    adjustment !== undefined && adjustment !== 0;
                  const status = getVariantStatus(
                    soldOut,
                    ruleDisabled,
                    v.stock_quantity
                  );

                  return (
                    <button
                      key={`desktop-${v.id}`}
                      type="button"
                      disabled={isDisabled}
                      aria-pressed={selected}
                      onClick={() => onSelect(group.component_group, v.id)}
                      className={clsx(
                        "relative grid min-h-[76px] w-fit min-w-[min(100%,180px)] max-w-full grid-cols-[minmax(0,1fr)] items-center gap-x-2 rounded-xl border p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:max-w-max",
                        selected
                          ? "border-primary bg-primary/[0.06]"
                          : "border-outline-variant/30 bg-surface hover:border-primary/50",
                        isDisabled && "cursor-not-allowed opacity-60"
                      )}
                    >
                      {selected && (
                        <span
                          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white"
                          aria-hidden="true"
                        >
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        </span>
                      )}
                      <span className="flex min-w-0 items-center gap-2">
                        {soldOut && (
                          <span className="absolute -left-1 -top-2 rounded-md bg-error px-2 py-0.5 text-[10px] font-bold text-white">
                            Hết hàng
                          </span>
                        )}
                        {v.is_pre_order && !soldOut && (
                          <span className="rounded-sm bg-primary-fixed px-2 py-0.5 text-[10px] font-bold text-primary">
                            Pre-order
                          </span>
                        )}
                        <span className="break-words text-sm font-bold text-on-surface">
                          {v.variant_name}
                        </span>
                        {/* {!v.is_pre_order && (
                          <span
                            className={clsx(
                              "shrink-0 text-xs font-semibold",
                              status.className
                            )}
                          >
                            {status.label}
                          </span>
                        )} */}
                      </span>
                      <span className="flex items-center justify-end gap-2 text-right text-sm">
                        {hasAdjustment && (
                          <span
                            className={clsx(
                              "text-sm font-bold",
                              adjustment > 0 ? "text-secondary" : "text-error"
                            )}
                          >
                            {adjustment > 0 ? "+" : "−"}
                            {formatVND(Math.abs(adjustment))}
                          </span>
                        )}
                        {v.sale_price_percent && !soldOut && (
                          <span className="rounded bg-error px-1.5 py-0.5 text-[10px] font-bold text-white">
                            −{v.sale_price_percent}%
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {purchaseActions && <div className="mt-4">{purchaseActions}</div>}
    </div>
  );
}
