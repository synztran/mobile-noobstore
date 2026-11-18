"use client";

import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import PriceOverrideFields, {
  parseOverride,
  type OverrideDrafts,
} from "@/components/rules/PriceOverrideFields";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Variant {
  id: string;
  variant_name: string;
  price_adjustment: number;
}

interface KitComponent {
  component_product_id: string;
  name: string;
  product_variants: Variant[];
}

interface Kit {
  id: string;
  name: string;
  components: KitComponent[];
}

interface Rule {
  id: string;
  kit_product_id: string;
  condition_variant_id: string;
  target_component_product_id: string;
  allowed_variant_ids: string[];
  /** Additive contribution overrides keyed by allowed component variant id. */
  price_overrides: Record<string, number | null>;
}

interface Context {
  kits: Kit[];
  rules: Rule[];
}

interface Props {
  variantId: string;
  productId: string;
  /** The product_id that this variant belongs to — used to exclude self from target list */
  selfProductId: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function VariantRulesEditor({
  variantId,
  productId,
  selfProductId,
}: Props) {
  const [ctx, setCtx] = useState<Context | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form state — one rule at a time, per kit
  const [selectedKitId, setSelectedKitId] = useState("");
  const [targetComponentProductId, setTargetComponentProductId] = useState("");
  const [allowedVariantIds, setAllowedVariantIds] = useState<string[]>([]);
  /** Draft overrides for the add-rule form, keyed by allowed variant id. */
  const [overrideDrafts, setOverrideDrafts] = useState<OverrideDrafts>({});
  /**
   * Draft edits to saved rules, keyed `${ruleId}:${variantId}`. Kept apart from
   * `ctx.rules` so a half-typed value is never persisted without an explicit
   * Save — these are live production prices.
   */
  const [ruleDrafts, setRuleDrafts] = useState<OverrideDrafts>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/component-rules/variant-context?variantId=${variantId}&productId=${productId}`
      );
      if (!res.ok) throw new Error("Failed to load rule context");
      const data: Context = await res.json();
      setCtx(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [variantId, productId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // auto-select kit when there's only one
  useEffect(() => {
    if (ctx && ctx.kits.length === 1 && !selectedKitId) {
      setSelectedKitId(ctx.kits[0].id);
    }
  }, [ctx, selectedKitId]);

  // reset target + allowed when kit changes
  useEffect(() => {
    setTargetComponentProductId("");
    setAllowedVariantIds([]);
    setOverrideDrafts({});
  }, [selectedKitId]);

  // reset allowed when target changes
  useEffect(() => {
    setAllowedVariantIds([]);
    setOverrideDrafts({});
  }, [targetComponentProductId]);

  const toggleAllowed = (vid: string) => {
    setAllowedVariantIds((prev) =>
      prev.includes(vid) ? prev.filter((id) => id !== vid) : [...prev, vid]
    );
    setOverrideDrafts((prev) => {
      const next = { ...prev };
      delete next[vid];
      return next;
    });
  };

  const setOverrideDraft = (vid: string, value: string) => {
    setOverrideDrafts((prev) => ({ ...prev, [vid]: value }));
  };

  const setRuleDraft = (key: string, value: string) => {
    setRuleDrafts((prev) => ({ ...prev, [key]: value }));
  };

  /**
   * Persist one override on an existing rule. A blank field clears the override
   * (stored as NULL), which restores the variant's own price_adjustment.
   */
  const handleSaveOverride = async (
    ruleId: string,
    variantId: string,
    raw: string
  ) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/component-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleId,
          price_overrides: { [variantId]: parseOverride(raw) },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to save price override");
      }
      setRuleDrafts((prev) => {
        const next: OverrideDrafts = {};
        for (const [k, v] of Object.entries(prev)) {
          if (k !== `${ruleId}:${variantId}`) next[k] = v;
        }
        return next;
      });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    if (
      !selectedKitId ||
      !targetComponentProductId ||
      allowedVariantIds.length === 0
    ) {
      setError(
        "Select a kit, target component, and at least one allowed variant."
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/component-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kit_product_id: selectedKitId,
          condition_variant_id: variantId,
          target_component_product_id: targetComponentProductId,
          allowed_variant_ids: allowedVariantIds,
          price_overrides: Object.fromEntries(
            allowedVariantIds.map((id) => [
              id,
              parseOverride(overrideDrafts[id]),
            ])
          ),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to create rule");
      }
      setSelectedKitId("");
      setTargetComponentProductId("");
      setAllowedVariantIds([]);
      setOverrideDrafts({});
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ruleId: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/component-rules?ruleId=${ruleId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to delete rule");
      }
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────

  const getComponentName = (kitId: string, productId: string) => {
    const kit = ctx?.kits.find((k) => k.id === kitId);
    return (
      kit?.components.find((c) => c.component_product_id === productId)?.name ??
      productId
    );
  };

  const getVariantName = (kitId: string, productId: string, varId: string) => {
    const kit = ctx?.kits.find((k) => k.id === kitId);
    const comp = kit?.components.find(
      (c) => c.component_product_id === productId
    );
    return (
      comp?.product_variants.find((v) => v.id === varId)?.variant_name ?? varId
    );
  };

  // ── Selected kit components (excluding self) ──────────────────────────

  const selectedKit = ctx?.kits.find((k) => k.id === selectedKitId) ?? null;
  const siblingComponents =
    selectedKit?.components.filter(
      (c) => c.component_product_id !== selfProductId
    ) ?? [];
  const targetComponent =
    siblingComponents.find(
      (c) => c.component_product_id === targetComponentProductId
    ) ?? null;

  // ── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="animate-pulse space-y-2 py-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-7 rounded bg-slate-100" />
        ))}
      </div>
    );
  }

  if (!ctx || ctx.kits.length === 0) {
    return (
      <p className="text-sm italic text-slate-400">
        This variant&apos;s product is not used by any kit — no rules
        applicable.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Existing rules */}
      {ctx.rules.length === 0 ? (
        <p className="text-sm italic text-slate-400">
          No rules yet for this variant.
        </p>
      ) : (
        <ul className="space-y-2">
          {ctx.rules.map((rule) => {
            const targetKit = ctx.kits.find(
              (k) => k.id === rule.kit_product_id
            );
            const targetComp = targetKit?.components.find(
              (c) => c.component_product_id === rule.target_component_product_id
            );
            const overrideVariants = rule.allowed_variant_ids
              .map((vid) =>
                targetComp?.product_variants.find((v) => v.id === vid)
              )
              .filter((v): v is Variant => v !== undefined);
            // Drafts are keyed per rule so two rules touching the same variant
            // (e.g. Purple -> Pack and Trash -> Pack) never share a field.
            const drafts: OverrideDrafts = {};
            for (const vid of rule.allowed_variant_ids) {
              const key = `${rule.id}:${vid}`;
              if (ruleDrafts[key] !== undefined) drafts[vid] = ruleDrafts[key];
            }

            return (
              <li
                key={rule.id}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="mb-0.5 text-xs text-slate-400">
                      Kit:{" "}
                      <span className="font-medium text-slate-600">
                        {targetKit?.name ?? rule.kit_product_id}
                      </span>
                    </p>
                    <p className="text-slate-700">
                      Restricts{" "}
                      <span className="font-semibold">
                        {getComponentName(
                          rule.kit_product_id,
                          rule.target_component_product_id
                        )}
                      </span>{" "}
                      to:
                    </p>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {rule.allowed_variant_ids.map((vid) => (
                        <span
                          key={vid}
                          className="rounded bg-green-100 px-1.5 py-0.5 font-mono text-xs text-green-800"
                        >
                          {getVariantName(
                            rule.kit_product_id,
                            rule.target_component_product_id,
                            vid
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleDelete(rule.id)}
                    className="mt-0.5 shrink-0 text-red-400 transition-colors hover:text-red-600 disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {overrideVariants.length > 0 && (
                  <div className="mt-2 border-t border-slate-200 pt-2">
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      Price overrides
                    </p>
                    <PriceOverrideFields
                      variants={overrideVariants}
                      drafts={drafts}
                      savedOverrides={rule.price_overrides ?? {}}
                      disabled={saving}
                      onChange={(vid, value) =>
                        setRuleDraft(`${rule.id}:${vid}`, value)
                      }
                      onSave={(vid) =>
                        void handleSaveOverride(
                          rule.id,
                          vid,
                          ruleDrafts[`${rule.id}:${vid}`] ?? ""
                        )
                      }
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Add rule form */}
      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Add Rule
        </p>

        {/* Kit selector (only if multiple kits) */}
        {ctx.kits.length > 1 && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Apply rule to kit:
            </label>
            <select
              value={selectedKitId}
              onChange={(e) => setSelectedKitId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Pick a kit —</option>
              {ctx.kits.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Target component */}
        {selectedKitId && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              When this variant is selected, restrict:
            </label>
            {siblingComponents.length === 0 ? (
              <p className="text-sm italic text-slate-400">
                No sibling components in this kit.
              </p>
            ) : (
              <select
                value={targetComponentProductId}
                onChange={(e) => setTargetComponentProductId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Pick a component to restrict —</option>
                {siblingComponents.map((c) => (
                  <option
                    key={c.component_product_id}
                    value={c.component_product_id}
                  >
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Allowed variants */}
        {targetComponent && (
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-600">
              …to only these variants (toggle to allow):
            </label>
            {targetComponent.product_variants.length === 0 ? (
              <p className="text-sm italic text-slate-400">
                No variants on this component.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {targetComponent.product_variants.map((v) => {
                  const checked = allowedVariantIds.includes(v.id);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => toggleAllowed(v.id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        checked
                          ? "border-green-600 bg-green-600 text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:border-green-400"
                      }`}
                    >
                      {v.variant_name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Optional price overrides for the ticked variants */}
            {targetComponent && allowedVariantIds.length > 0 && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                <p className="mb-1.5 text-xs font-medium text-slate-600">
                  Price overrides (optional) — what each variant ADDS to the kit
                </p>
                <PriceOverrideFields
                  variants={targetComponent.product_variants.filter((v) =>
                    allowedVariantIds.includes(v.id)
                  )}
                  drafts={overrideDrafts}
                  onChange={setOverrideDraft}
                />
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        {targetComponentProductId && (
          <button
            type="button"
            disabled={saving || allowedVariantIds.length === 0}
            onClick={handleAdd}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {saving ? "Saving…" : "Add Rule"}
          </button>
        )}
      </div>
    </div>
  );
}
