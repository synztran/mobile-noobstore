"use client";

"use client";

import type { ConfiguratorGroup } from "@/app/api/products/[slug]/configurator/route";
import type { ShopVariant } from "@/app/api/products/route";
import Image from "@/components/ui/AdaptiveImage";

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
 * Shows every currently-selected variant with its linked image (so a
 * selection is represented visually, not only by name) plus its "Tình trạng"
 * attribute when present. Simple products contribute the selected
 * `__variant__`; kit products contribute each selected component variant.
 * Renders nothing when nothing is selected.
 */
export function SelectedConditionSummary({
  groups,
  selections,
  productVariants,
}: SelectedConditionSummaryProps) {
  const hasComponents = groups.length > 0;

  const rows: Array<{
    label: string;
    group: string;
    text: string | null;
    thumbnail: string | null;
  }> = [];

  if (!hasComponents) {
    const selectedId = selections["__variant__"]?.[0];
    if (selectedId) {
      const v = productVariants.find((x) => x.id === selectedId);
      if (v) {
        rows.push({
          label: v.variant_name ?? "",
          group: "",
          text: getConditionText(v.attributes),
          thumbnail: v.thumbnail,
        });
      }
    }
  } else {
    for (const group of groups) {
      for (const id of selections[group.component_group] ?? []) {
        const v = group.variants.find((gv) => gv.id === id);
        if (v) {
          rows.push({
            label: v.variant_name ?? "",
            group: group.component_group,
            text: getConditionText(v.attributes),
            thumbnail: v.thumbnail,
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
        <ul className="space-y-1.5">
          {rows
            ?.filter((r) => r.text)
            .map((r) => (
              <li
                key={`${r.group}:${r.label}`}
                className="flex items-center gap-1.5"
              >
                {r.thumbnail ? (
                  <Image
                    src={r.thumbnail}
                    alt={r.label}
                    width={32}
                    height={24}
                    className="h-6 w-8 flex-shrink-0 rounded object-cover"
                  />
                ) : null}
                <span className="flex-shrink-0 rounded bg-surface-container-high px-2 py-1 text-xs font-bold text-on-surface">
                  {(countByLabel.get(r.label) ?? 0) > 1 && r.group
                    ? `${r.group} · `
                    : ""}
                  {r.label}
                </span>
                {r.text && (
                  <span className="text-sm font-semibold text-on-surface-variant">
                    {r.text}
                  </span>
                )}
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
