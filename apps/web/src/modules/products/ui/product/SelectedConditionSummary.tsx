"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { ConfiguratorGroup, ShopVariant } from "@/modules/products/types";
import Image from "@/components/ui/AdaptiveImage";
import { CheckCircle2, Eye } from "lucide-react";

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

  // Separators must hide at the end of every wrapped line; CSS has no
  // "last item in a flex-wrap line" selector, so detect it via offsetTop.
  const rowsSignature = visibleRows
    .map((r) => `${r.group}:${r.label}`)
    .join("|");
  const listRef = useRef<HTMLUListElement>(null);
  const [lineEnds, setLineEnds] = useState<ReadonlySet<number> | null>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const compute = () => {
      const items = Array.from(list.children) as HTMLLIElement[];
      if (items.length === 0) return;
      const ends = new Set<number>();
      ends.add(items.length - 1);
      for (let i = 1; i < items.length; i++) {
        if (items[i].offsetTop !== items[i - 1].offsetTop) {
          ends.add(i - 1);
        }
      }
      setLineEnds(ends);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(list);
    return () => ro.disconnect();
  }, [rowsSignature]);

  // Only render the section once something selected carries a "Tình trạng"
  // value — no empty-state placeholder.
  if (visibleRows.length === 0) return null;

  return (
    <section className="rounded-2xl border border-surface-container-high bg-surface-container-low p-3.5">
      <div className="mb-3 flex items-center gap-1.5">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-black uppercase leading-none tracking-wider text-on-surface">
          Tình trạng
        </h3>
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-black text-primary">
          {visibleRows.length}
        </span>
      </div>
      <ul ref={listRef} className="flex flex-wrap gap-2">
        {visibleRows
          .sort((a, b) => (a?.text?.length || 0) - (b?.text?.length || 0))
          .map((r, i) => {
            const thumb = r.thumbnail;
            const atLineEnd = lineEnds
              ? lineEnds.has(i)
              : i === visibleRows.length - 1;
            return (
              <li
                key={`${r.group}:${r.label}`}
                className="flex max-w-max items-center gap-2"
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
                      <Eye className="h-4 w-4 text-white" />
                    </span>
                  </button>
                ) : null}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate text-sm font-semibold leading-tight tracking-wide text-on-surface">
                    {r.group && (countByLabel.get(r.label) ?? 0) > 1
                      ? `${r.group} · `
                      : ""}
                    {r.label}
                  </p>
                  <p className="text-xs text-on-surface-variant">{r.text}</p>
                </div>
                {!atLineEnd ? (
                  <span className="h-1/2 w-[1px] bg-slate-300" />
                ) : null}
              </li>
            );
          })}
      </ul>
    </section>
  );
}
