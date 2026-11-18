"use client";

import { AlertTriangle } from "lucide-react";
import NumberInput from "@/components/ui/NumberInput";
import {
  effectiveContribution,
  findPriceLadderInversion,
} from "@web-kit-pricing";

/**
 * Per-variant price override inputs for one compatibility rule.
 *
 * An override is the ADDITIVE contribution a component variant makes to the kit
 * line under this rule — not an absolute price. Blank means "inherit the
 * variant's own price_adjustment" (stored as NULL); `0` means the component is
 * free in this pairing. Keeping those two distinguishable is the whole reason
 * the field is a text input rather than a toggle.
 *
 * Presentational only: the caller owns the draft state and decides how to
 * persist. Both rule editors (kit-level and variant-level) use this so the two
 * places that set prices can never drift apart.
 */

export interface OverrideVariant {
  id: string;
  variant_name: string;
  price_adjustment: number;
}

/** A draft override map keyed by variant id. Blank string = inherit. */
export type OverrideDrafts = Record<string, string>;

export const formatVND = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

/**
 * Parse a draft override input. Blank / non-numeric means "inherit" (null), and
 * `0` is preserved as a real value rather than collapsing to null.
 */
export function parseOverride(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

interface Props {
  variants: OverrideVariant[];
  /** Current draft values keyed by variant id. */
  drafts: OverrideDrafts;
  onChange: (variantId: string, value: string) => void;
  /**
   * When provided, a Save button is rendered for each row that differs from
   * `savedOverrides`. Omit for the create-rule form, which persists everything
   * in one submit.
   */
  onSave?: (variantId: string) => void;
  savedOverrides?: Record<string, number | null>;
  disabled?: boolean;
}

export default function PriceOverrideFields({
  variants,
  drafts,
  onChange,
  onSave,
  savedOverrides,
  disabled = false,
}: Props) {
  if (variants.length === 0) return null;

  // A variant with no draft falls back to what is stored, so the warning tracks
  // what the storefront would actually charge rather than just what is typed.
  const priceOf = (v: OverrideVariant) => {
    const draft = drafts[v.id];
    const override =
      draft === undefined
        ? (savedOverrides?.[v.id] ?? null)
        : parseOverride(draft);
    return effectiveContribution(override, v);
  };
  const inversion = findPriceLadderInversion(variants, priceOf);

  return (
    <div className="space-y-1.5">
      {variants.map((v) => {
        const draft = drafts[v.id];
        const saved = savedOverrides?.[v.id] ?? null;
        // Untouched rows display what is stored; a cleared field is an explicit
        // inherit (null), so blank and 0 stay distinguishable.
        const overridden = draft === undefined ? saved : parseOverride(draft);
        const effective = effectiveContribution(overridden, v);
        // Only a row the user actually edited can be dirty.
        const isDirty =
          savedOverrides !== undefined &&
          draft !== undefined &&
          draft !== (saved === null ? "" : String(saved));

        return (
          <div
            key={v.id}
            className={`flex items-center gap-2 rounded px-1 py-0.5 text-xs ${
              isDirty ? "bg-amber-50 ring-1 ring-amber-300" : ""
            }`}
          >
            <span className="min-w-0 flex-1 truncate font-mono text-slate-700">
              {v.variant_name}
            </span>
            <span className="shrink-0 text-slate-400">
              own {formatVND(v.price_adjustment)}
            </span>
            {/* NumberInput sets w-full on its own wrapper, which beats a caller
                w-24 in Tailwind's cascade, so the width is pinned here. */}
            <div className="w-24 shrink-0">
              <NumberInput
                label=""
                value={overridden}
                onChange={(n) => onChange(v.id, n === null ? "" : String(n))}
                disabled={disabled}
                placeholder={String(v.price_adjustment)}
                aria-label={`Price override for ${v.variant_name}`}
              />
            </div>
            <span className="w-24 shrink-0 text-right text-[11px] text-slate-500">
              adds {formatVND(effective)}
            </span>
            {onSave && (
              <button
                type="button"
                disabled={disabled || !isDirty}
                onClick={() => onSave(v.id)}
                className="shrink-0 rounded bg-blue-600 px-2 py-1 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save
              </button>
            )}
            {overridden === 0 && (
              <span
                className="shrink-0 rounded bg-sky-100 px-1 py-0.5 text-[10px] font-medium text-sky-700"
                title="This component is free under this rule"
              >
                free
              </span>
            )}
          </div>
        );
      })}

      <p className="text-[11px] leading-snug text-slate-400">
        The override is what this variant ADDS to the kit line. Leave it blank
        to use the variant&apos;s own price; &quot;0&quot; makes it free.
      </p>

      {inversion && (
        <p className="flex items-start gap-1.5 rounded bg-amber-50 px-2 py-1.5 text-[11px] leading-snug text-amber-800 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            <strong>{inversion.cheaper.variant_name}</strong> now costs more
            than <strong>{inversion.pricier.variant_name}</strong>, so the price
            ladder reads out of order on the storefront. Check the numbers.
          </span>
        </p>
      )}
    </div>
  );
}
