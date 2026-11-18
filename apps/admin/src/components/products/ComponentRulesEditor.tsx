"use client";

import { Trash2, Plus, AlertCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import PriceOverrideFields, {
  formatVND,
  parseOverride,
  type OverrideDrafts,
} from "@/components/rules/PriceOverrideFields";
import {
  effectiveContribution,
  kitPriceOverrides,
  resolveKitUnitPrice,
} from "@web-kit-pricing";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Variant {
  id: string;
  variant_name: string;
  price_adjustment: number;
}

interface ComponentProduct {
  id: string;
  name: string;
  slug: string;
  product_variants: Variant[];
}

interface ComponentLink {
  id: string;
  component_group: string;
  is_required: boolean;
  component_product_id: string;
  products: ComponentProduct;
}

interface KitDetail {
  id: string;
  base_price: number;
  product_variants: Variant[];
  product_components: ComponentLink[];
}

interface Rule {
  id: string;
  condition_variant_id: string;
  target_component_product_id: string;
  allowed_variant_ids: string[];
  /** Additive contribution overrides keyed by allowed component variant id. */
  price_overrides: Record<string, number | null>;
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  /** The ID of the kit product. */
  kitProductId: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ComponentRulesEditor({ kitProductId }: Props) {
  const [kit, setKit] = useState<KitDetail | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── New rule form state ───────────────────────────────────────────────
  const [conditionComponentProductId, setConditionComponentProductId] =
    useState("");
  const [conditionVariantId, setConditionVariantId] = useState("");
  const [targetComponentProductId, setTargetComponentProductId] = useState("");
  const [allowedVariantIds, setAllowedVariantIds] = useState<string[]>([]);
  /**
   * Draft overrides for the new-rule form, keyed by allowed variant id.
   * Kept as strings so a blank field means "inherit the variant's own
   * price_adjustment" (NULL) while "0" stays a real override.
   */
  const [overrideDrafts, setOverrideDrafts] = useState<OverrideDrafts>({});
  /**
   * Draft edits to saved rules' overrides, keyed by `${ruleId}:${variantId}`.
   * Kept apart from `rules` so a half-typed value is never persisted by accident
   * — each field needs an explicit Save.
   */
  const [ruleOverrideDrafts, setRuleOverrideDrafts] = useState<OverrideDrafts>(
    {}
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [kitRes, rulesRes] = await Promise.all([
        fetch(`/api/products/${kitProductId}`),
        fetch(`/api/component-rules?kitProductId=${kitProductId}`),
      ]);
      if (!kitRes.ok) throw new Error("Failed to load kit data");
      if (!rulesRes.ok) throw new Error("Failed to load rules");
      const [kitData, rulesData] = await Promise.all([
        kitRes.json() as Promise<KitDetail>,
        rulesRes.json() as Promise<Rule[]>,
      ]);
      setKit(kitData);
      setRules(rulesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [kitProductId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Reset downstream selections when condition component changes ────
  useEffect(() => {
    setConditionVariantId("");
    setTargetComponentProductId("");
    setAllowedVariantIds([]);
  }, [conditionComponentProductId]);

  // ── Reset allowed variant selection when target changes ──────────────
  useEffect(() => {
    setAllowedVariantIds([]);
  }, [targetComponentProductId]);

  const toggleAllowed = (variantId: string) => {
    setAllowedVariantIds((prev) =>
      prev.includes(variantId)
        ? prev.filter((id) => id !== variantId)
        : [...prev, variantId]
    );
    setOverrideDrafts((prev) => {
      const next = { ...prev };
      delete next[variantId];
      return next;
    });
  };

  const setOverrideDraft = (variantId: string, value: string) => {
    setOverrideDrafts((prev) => ({ ...prev, [variantId]: value }));
  };

  const setRuleOverrideDraft = (fieldKey: string, value: string) => {
    setRuleOverrideDrafts((prev) => ({ ...prev, [fieldKey]: value }));
  };

  const handleAddRule = async () => {
    if (
      !conditionComponentProductId ||
      !conditionVariantId ||
      !targetComponentProductId ||
      allowedVariantIds.length === 0
    ) {
      setError(
        "Please fill in all rule fields and select at least one allowed variant."
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
          kit_product_id: kitProductId,
          condition_variant_id: conditionVariantId,
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
      // Reset form and reload
      setConditionComponentProductId("");
      setConditionVariantId("");
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

  const handleSaveOverrides = async (
    ruleId: string,
    overrides: Record<string, number | null>
  ) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/component-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId, price_overrides: overrides }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to save price overrides");
      }
      // Drop this rule's drafts so the inputs re-seed from the saved values.
      setRuleOverrideDrafts((prev) => {
        const next: Record<string, string> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (!k.startsWith(`${ruleId}:`)) next[k] = v;
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

  const handleDeleteRule = async (ruleId: string) => {
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

  // ── Helpers to resolve display names ─────────────────────────────────
  const getVariantName = (variantId: string): string => {
    if (!kit) return variantId;
    const v = kit.product_variants.find((v) => v.id === variantId);
    if (v) return v.variant_name;
    for (const comp of kit.product_components) {
      const cv = comp.products.product_variants.find((v) => v.id === variantId);
      if (cv) return `${comp.products.name} · ${cv.variant_name}`;
    }
    return variantId;
  };

  const getComponentProductName = (productId: string): string => {
    if (!kit) return productId;
    const comp = kit.product_components.find(
      (c) => c.component_product_id === productId
    );
    return comp?.products.name ?? productId;
  };

  const findVariant = (variantId: string): Variant | null => {
    if (!kit) return null;
    const own = kit.product_variants.find((v) => v.id === variantId);
    if (own) return own;
    for (const comp of kit.product_components) {
      const cv = comp.products.product_variants.find((v) => v.id === variantId);
      if (cv) return cv;
    }
    return null;
  };

  /**
   * What the kit line costs for the minimum legal choice under a rule:
   * kit base + kit variant adjustment + every component group's cheapest
   * contribution (using this rule's override for its target group).
   */
  const rulePricePreview = (rule: Rule): number | null => {
    if (!kit) return null;

    // Pick the cheapest legal variant per component group, then let the shared
    // resolver do the arithmetic. This used to re-derive the formula here, which
    // is how the admin preview drifted from the storefront's real price.
    const overrides = kitPriceOverrides([rule], rule.condition_variant_id);
    const counted = new Set<string>();
    const components: Array<{
      variant_id: string;
      price_adjustment: number;
    }> = [];

    for (const comp of kit.product_components) {
      const productId = comp.component_product_id;
      if (counted.has(productId)) continue;
      counted.add(productId);

      const candidates =
        productId === rule.target_component_product_id
          ? rule.allowed_variant_ids
              .map((id) => findVariant(id))
              .filter((v): v is Variant => v !== null)
          : comp.products.product_variants;
      if (candidates.length === 0) continue;

      const cheapest = candidates.reduce((best, v) =>
        effectiveContribution(overrides[v.id], v) <
        effectiveContribution(overrides[best.id], best)
          ? v
          : best
      );
      components.push({
        variant_id: cheapest.id,
        price_adjustment: cheapest.price_adjustment,
      });
    }

    return resolveKitUnitPrice({
      basePrice: kit.base_price,
      // The condition variant is itself one of the selected components when the
      // rule is keyed on a component variant (which is how every live rule is
      // authored), so it must not be added twice.
      kitVariant: kit.product_variants.some(
        (v) => v.id === rule.condition_variant_id
      )
        ? findVariant(rule.condition_variant_id)
        : null,
      components,
      overrides,
    }).unitPrice;
  };

  // ── Render ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="animate-pulse space-y-2 py-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-8 rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  // Deduplicate component products (multiple links can share the same product via different groups)
  const componentProductMap = new Map<string, ComponentProduct>();
  for (const comp of kit?.product_components ?? []) {
    if (!componentProductMap.has(comp.component_product_id)) {
      componentProductMap.set(comp.component_product_id, comp.products);
    }
  }
  const componentProducts = Array.from(componentProductMap.values());

  const conditionComponentProduct =
    componentProductMap.get(conditionComponentProductId) ?? null;

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Existing rules */}
      {rules.length === 0 ? (
        <p className="text-sm italic text-slate-400">No rules defined yet.</p>
      ) : (
        <ul className="space-y-2">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800">
                    When{" "}
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs text-blue-800">
                      {getVariantName(rule.condition_variant_id)}
                    </span>{" "}
                    is selected
                  </p>
                  <p className="mt-0.5 text-slate-600">
                    <span className="font-medium">
                      {getComponentProductName(
                        rule.target_component_product_id
                      )}
                    </span>{" "}
                    restricted to:
                  </p>
                  {rulePricePreview(rule) !== null && (
                    <p className="mt-1 text-xs text-slate-500">
                      Cheapest legal build:{" "}
                      <span className="font-semibold text-slate-700">
                        {formatVND(rulePricePreview(rule)!)}
                      </span>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleDeleteRule(rule.id)}
                  className="mt-0.5 flex-shrink-0 text-red-400 transition-colors hover:text-red-600 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Per-variant additive contribution. Blank = inherit the
                  component variant's own price_adjustment. */}
              <div className="mt-2 border-t border-slate-200 pt-2">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Price overrides
                </p>
                <PriceOverrideFields
                  variants={rule.allowed_variant_ids
                    .map((vid) => findVariant(vid))
                    .filter((v): v is Variant => v !== null)}
                  drafts={Object.fromEntries(
                    rule.allowed_variant_ids.flatMap((vid) => {
                      const key = `${rule.id}:${vid}`;
                      return ruleOverrideDrafts[key] !== undefined
                        ? [[vid, ruleOverrideDrafts[key]]]
                        : [];
                    })
                  )}
                  savedOverrides={rule.price_overrides ?? {}}
                  disabled={saving}
                  onChange={(vid, value) =>
                    setRuleOverrideDraft(`${rule.id}:${vid}`, value)
                  }
                  onSave={(vid) => {
                    const next: Record<string, number | null> = {};
                    next[vid] = parseOverride(
                      ruleOverrideDrafts[`${rule.id}:${vid}`] ?? ""
                    );
                    void handleSaveOverrides(rule.id, next);
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add new rule form */}
      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Add Rule
        </p>

        {componentProducts.length === 0 ? (
          <p className="text-sm italic text-slate-400">
            This kit has no components. Add components to create rules.
          </p>
        ) : (
          <>
            {/* Step 1: Condition component product */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                When a variant of this component is selected…
              </label>
              <select
                value={conditionComponentProductId}
                onChange={(e) => setConditionComponentProductId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Pick a component —</option>
                {componentProducts.map((cp) => (
                  <option key={cp.id} value={cp.id}>
                    {cp.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Condition variant from that component */}
            {conditionComponentProductId && conditionComponentProduct && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  …specifically this variant:
                </label>
                {conditionComponentProduct.product_variants.length === 0 ? (
                  <p className="text-sm italic text-slate-400">
                    No variants on this component.
                  </p>
                ) : (
                  <select
                    value={conditionVariantId}
                    onChange={(e) => setConditionVariantId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Pick a variant —</option>
                    {conditionComponentProduct.product_variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.variant_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Step 3: Target component (different from condition) */}
            {conditionVariantId && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  …then restrict this component:
                </label>
                <select
                  value={targetComponentProductId}
                  onChange={(e) => setTargetComponentProductId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Pick a component —</option>
                  {componentProducts
                    .filter((cp) => cp.id !== conditionComponentProductId)
                    .map((cp) => (
                      <option key={cp.id} value={cp.id}>
                        {cp.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Step 4: Allowed variants from target component */}
            {targetComponentProductId &&
              conditionComponentProduct &&
              (() => {
                const targetProduct = componentProductMap.get(
                  targetComponentProductId
                );
                if (!targetProduct) return null;
                return (
                  <div>
                    <label className="mb-2 block text-xs font-medium text-slate-600">
                      …to only these variants (check all that are allowed):
                    </label>
                    {targetProduct.product_variants.length === 0 ? (
                      <p className="text-sm italic text-slate-400">
                        No variants found for this component.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {targetProduct.product_variants.map((v) => {
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
                    {allowedVariantIds.length > 0 && (
                      <div className="mt-3 space-y-1.5 rounded-lg border border-slate-200 bg-white p-3">
                        <label className="block text-xs font-medium text-slate-600">
                          Price overrides (optional) — what each variant ADDS to
                          the kit
                        </label>
                        {allowedVariantIds.map((vid) => {
                          const v = targetProduct.product_variants.find(
                            (x) => x.id === vid
                          );
                          if (!v) return null;
                          return (
                            <div
                              key={vid}
                              className="flex items-center gap-2 text-xs"
                            >
                              <span className="min-w-0 flex-1 truncate font-mono text-slate-700">
                                {v.variant_name}
                              </span>
                              <span className="text-slate-400">
                                own {formatVND(v.price_adjustment)}
                              </span>
                              <input
                                type="number"
                                inputMode="numeric"
                                placeholder={String(v.price_adjustment)}
                                value={overrideDrafts[vid] ?? ""}
                                onChange={(e) =>
                                  setOverrideDraft(vid, e.target.value)
                                }
                                className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-right text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          );
                        })}
                        <p className="text-[11px] leading-snug text-slate-400">
                          Blank uses the variant&apos;s own price. &quot;0&quot;
                          makes it free in this pairing.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

            {/* Submit */}
            {conditionVariantId && targetComponentProductId && (
              <button
                type="button"
                disabled={saving || allowedVariantIds.length === 0}
                onClick={handleAddRule}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {saving ? "Saving…" : "Add Rule"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
