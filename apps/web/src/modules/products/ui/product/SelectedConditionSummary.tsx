"use client";

import type { ConfiguratorGroup, ShopVariant } from "@/modules/products/types";
import Image from "@/components/ui/AdaptiveImage";
import Icon from "@/components/ui/Icon";

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
  /** Opens the full-screen viewer for the tapped image. */
  onShowImage?: (image: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Shows every currently-selected variant with its linked image (so a
 * selection is represented visually, not only by name) plus its "Tình trạng"
 * attribute when present. Simple products contribute the selected
 * `__variant__`; kit products contribute each selected component variant.
 * Thumbnails open the full-screen image viewer. Renders nothing when nothing
 * is selected.
 */
export function SelectedConditionSummary({
  groups,
  selections,
  productVariants,
  onShowImage,
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

  const visibleRows = rows.filter((r) => r.text && r.label);

  // Only render the section once something selected carries a "Tình trạng"
  // value — no empty-state placeholder.
  if (visibleRows.length === 0) return null;

  return (
    <section className="rounded-2xl border border-surface-container-high bg-surface-container-low p-3.5">
      <div className="mb-3 flex items-center gap-1.5">
        <Icon name="check_circle" className="text-sm text-primary" />
        <h3 className="text-xs font-black uppercase leading-none tracking-wider text-on-surface">
          Tình trạng linh kiện
        </h3>
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-black text-primary">
          {visibleRows.length}
        </span>
      </div>
      <ul className="space-y-2">
        {visibleRows.map((r) => {
          const thumb = r.thumbnail;
          return (
            <li
              key={`${r.group}:${r.label}`}
              className="flex items-center gap-2.5"
            >
              {thumb ? (
                <button
                  type="button"
                  aria-label={`Xem ảnh lớn: ${r.label}`}
                  onClick={() => onShowImage?.(thumb)}
                  className="group relative box-border h-12 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-surface-container-high bg-surface-container-high transition-transform active:scale-95"
                >
                  <Image
                    src={thumb}
                    alt={r.label}
                    width={64}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Icon
                      name="visibility"
                      className="text-base text-white"
                    />
                  </span>
                </button>
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black leading-tight text-on-surface">
                  {r.group && (countByLabel.get(r.label) ?? 0) > 1
                    ? `${r.group} · `
                    : ""}
                  {r.label}
                </p>
                <p className="text-[10px] font-semibold text-on-surface-variant">
                  {r.text}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
