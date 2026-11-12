"use client";

import clsx from "clsx";
import type { ConfiguratorGroup } from "@/modules/products/types";

export function DesktopVariantGroup({ groups, selections, disabledVariantIds, onSelect }: { groups: ConfiguratorGroup[]; selections: Record<string, string[]>; disabledVariantIds: Set<string>; onSelect: (group: string, variantId: string) => void }) {
  if (!groups.length) return <p className="py-8 text-center text-xs text-[#76675f]">Không có tuỳ chọn cấu hình.</p>;
  return <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">{groups.map((group) => {
    const selected = selections[group.component_group] ?? [];
    const selectedVariant = group.variants.find((v) => selected.includes(v.id));
    const selectedStatus = selectedVariant
      ? selectedVariant.stock_quantity <= 0 ? "Hết hàng"
        : disabledVariantIds.has(selectedVariant.id) ? "Không khả dụng"
        : selectedVariant.is_pre_order ? "Đặt trước"
        : selectedVariant.stock_quantity <= 2 ? `Sắp hết · Còn ${selectedVariant.stock_quantity}`
        : `Còn ${selectedVariant.stock_quantity}`
      : null;
    return <section key={group.component_group} className="min-w-0 rounded-[11px] border border-[#eadfd9] bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-black text-[#211916]">{group.component_group}</div>
        {selectedStatus && <span className="shrink-0 text-xs font-semibold text-[#76675f]">{selectedStatus}</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-3">{group.variants.map((variant) => {
        const isSelected = selected.includes(variant.id);
        const soldOut = variant.stock_quantity <= 0;
        const ruleDisabled = disabledVariantIds.has(variant.id);
        const capDisabled = !isSelected && !group.is_required && group.max_quantity != null && group.max_quantity > 0 && selected.length >= group.max_quantity;
        const disabled = soldOut || ruleDisabled || capDisabled;
        const status = soldOut ? "Hết hàng" : ruleDisabled ? "Không khả dụng" : variant.is_pre_order ? "Đặt trước" : variant.stock_quantity <= 2 ? `Sắp hết · Còn ${variant.stock_quantity}` : `Còn ${variant.stock_quantity}`;
        const adjustment = variant.effective_price_adjustment ?? variant.price_adjustment;
        return <button key={variant.id} type="button" aria-pressed={isSelected} disabled={disabled} onClick={() => onSelect(group.component_group, variant.id)} className={clsx("relative min-h-[48px] rounded-[7px] border px-2.5 py-2 pr-4 text-left text-xs leading-tight transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#9b3f1c]", isSelected ? "border-[#ad5735] bg-[#fff3ed] font-extrabold text-[#8d3e20]" : "border-[#e8dfda] bg-[#faf8f6] text-[#211916]", disabled && !soldOut ? "cursor-not-allowed opacity-45" : "", soldOut ? "cursor-not-allowed border-[#e8dfda] bg-[#f2efed] text-[#9a8c84] line-through" : "hover:border-[#ad5735]")}>
          {isSelected && <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-[#9b3f1c] text-[8px] font-black text-white">✓</span>}
          <span className="flex flex-col gap-0.5"><span className="flex flex-wrap items-baseline gap-x-1.5"><span>{variant.variant_name}{adjustment !== 0 ? <span className="ml-1">({adjustment > 0 ? "+" : ""}{new Intl.NumberFormat("vi-VN").format(adjustment)})</span> : null}</span></span></span>
        </button>;
      })}</div>
    </section>;
  })}</div>;
}
