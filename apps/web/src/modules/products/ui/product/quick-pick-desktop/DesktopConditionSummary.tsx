"use client";

import type { ConfiguratorGroup } from "@/modules/products/types";

export function DesktopConditionSummary({ groups, selections }: { groups: ConfiguratorGroup[]; selections: Record<string, string[]> }) {
  const rows = groups.flatMap((group) => (selections[group.component_group] ?? []).flatMap((id) => {
    const variant = group.variants.find((item) => item.id === id);
    const condition = variant?.attributes?.["Tình trạng"];
    return condition && variant ? [{ id, name: variant.variant_name, condition }] : [];
  }));
  if (!rows.length) return null;
  return <section className="rounded-[11px] border border-[#e8ddd7] bg-[#fbf8f5] px-3 pt-3 pb-3">
    <div className="flex items-center gap-2"><h3 className="text-sm font-black uppercase tracking-[0.06em] text-[#211916]">Tình trạng</h3><span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-[#fae9e1] px-1.5 text-xs font-black text-[#9b3f1c]">{rows.length}</span></div>
    <div className="mt-2 space-y-2">{rows.map((row) => <div key={row.id} className="min-w-0"><p className="truncate text-sm font-extrabold text-[#211916]">{row.name}</p><p className="truncate text-xs text-[#655850]">{row.condition}</p></div>)}</div>
  </section>;
}
