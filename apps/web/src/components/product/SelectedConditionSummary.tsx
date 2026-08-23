"use client";

import type { ConfiguratorGroup } from "@/app/api/products/[slug]/configurator/route";
import type { ShopVariant } from "@/app/api/products/route";

// ─── Condition helper ─────────────────────────────────────────────────────────

function getConditionText(
  attrs?: Record<string, string> | null
): string | null {
  const text = attrs?.["Tình trạng"]?.trim();
  return text ? text : null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SelectedConditionSummaryProps {
  groups: ConfiguratorGroup[];
  selections: Record<string, string[]>;
  /** Product variants (simple path). Only used when there are no component groups. */
  productVariants: ShopVariant[];
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Shows the "Tình trạng" attribute of every currently-selected variant.
 * Simple products contribute the selected `__variant__`; kit products
 * contribute each selected component variant. Renders nothing when no
 * selected variant carries a condition text.
 */
export function SelectedConditionSummary({
  groups,
  selections,
  productVariants,
}: SelectedConditionSummaryProps) {
  const hasComponents = groups.length > 0;

  const rows: Array<{ label: string; group: string; text: string }> = [];

  if (!hasComponents) {
    const selectedId = selections["__variant__"]?.[0];
    if (selectedId) {
      const v = productVariants.find((x) => x.id === selectedId);
      const text = getConditionText(v?.attributes);
      if (text) {
        rows.push({ label: v?.variant_name ?? "", group: "", text });
      }
    }
  } else {
    for (const group of groups) {
      for (const id of selections[group.component_group] ?? []) {
        const v = group.variants.find((gv) => gv.id === id);
        const text = getConditionText(v?.attributes);
        if (text) {
          rows.push({
            label: v?.variant_name ?? "",
            group: group.component_group,
            text,
          });
        }
      }
    }
  }

  const countByLabel = new Map<string, number>();
  for (const r of rows) {
    countByLabel.set(r.label, (countByLabel.get(r.label) ?? 0) + 1);
  }

  return (
    <div className="rounded-xl bg-[#f8f8f8] p-3">
      <p className="mb-1.5 text-sm font-black uppercase tracking-wider text-primary">
        Tình trạng
      </p>
      {rows.length > 0 ? (
        <ul className="space-y-1">
          {rows.map((r) => (
            <li
              key={`${r.group}:${r.label}`}
              className="flex items-center gap-1 font-bold text-on-surface"
            >
              <span className="flex-shrink-0 rounded bg-surface-container-high px-2 py-1 text-xs">
                {(countByLabel.get(r.label) ?? 0) > 1 && r.group
                  ? `${r.group} · `
                  : ""}
                {r.label}
              </span>
              <span className="text-sm font-semibold text-on-surface-variant">
                {r.text}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="relative clear-both flex min-h-6 items-center">
          <p className="text-xs font-semibold text-on-surface-variant">
            Chưa có cấu hình nào được thiết lập tình trạng
          </p>
        </div>
      )}
    </div>
  );
}
