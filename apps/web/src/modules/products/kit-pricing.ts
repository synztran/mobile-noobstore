/**
 * Relative, not the `@/` alias: the admin app imports this module through its
 * own tsconfig alias (`@web-kit-pricing`), and a relative import resolves from
 * this file's directory regardless of which app is consuming it. `types.ts` has
 * no imports of its own, so this stays a leaf module.
 */
import type { ComponentVariantRule } from "./types";

/**
 * Kit / composite pricing — the single definition of a kit line's price.
 *
 * Pure and dependency-free so every layer agrees: the configurator, the cart
 * store, the cart row, the checkout summary and the authoritative server
 * recompute at submit all call these instead of re-deriving the arithmetic
 * (they had drifted into seven disagreeing copies).
 *
 * The formula, where `o` is a per-pairing override from
 * `component_variant_rule_allowed.price_override`:
 *
 *   unit = products.base_price
 *        + kit_variant.price_adjustment
 *        + SUM(coalesce(o, component_variant.price_adjustment))
 */

/** The minimum a priced input needs: which variant, and what it contributes. */
export interface PricedComponent {
  variant_id: string;
  price_adjustment: number;
}

/** A component contribution after override resolution. */
export interface ResolvedContribution extends PricedComponent {
  /** True when `price_override` supplied the number instead of `price_adjustment`. */
  overridden: boolean;
}

/** Additive overrides keyed by component `variant_id`. */
export type KitPriceOverrides = Record<string, number>;

/**
 * Merge the overrides of every rule armed by the selected kit variant.
 *
 * A rule only applies when its `condition_variant_id` is the kit variant the
 * customer actually picked, so an unarmed rule must never leak its price. Later
 * rules win on a duplicate key, matching rule evaluation order.
 */
export function kitPriceOverrides(
  rules: ComponentVariantRule[],
  conditionVariantIds: ConditionVariantIds
): KitPriceOverrides {
  const out: KitPriceOverrides = {};
  for (const rule of applicableRules(rules, conditionVariantIds)) {
    for (const [variantId, override] of Object.entries(
      rule.price_overrides ?? {}
    )) {
      if (typeof override === "number" && Number.isFinite(override)) {
        out[variantId] = override;
      }
    }
  }
  return out;
}

/** True when `overrides` carries a usable number for this component variant. */
function overrideFor(
  component: PricedComponent,
  overrides: KitPriceOverrides | undefined
): number | null {
  if (!overrides) return null;
  const raw = Object.prototype.hasOwnProperty.call(
    overrides,
    component.variant_id
  )
    ? overrides[component.variant_id]
    : null;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

/**
 * Resolve each component's contribution. A `0` override is honoured as "free"
 * — only a missing/nullish override falls back to `price_adjustment`.
 */
export function resolveComponentContributions(
  components: PricedComponent[],
  overrides?: KitPriceOverrides
): ResolvedContribution[] {
  return components.map((component) => {
    const override = overrideFor(component, overrides);
    return override === null
      ? { ...component, overridden: false }
      : {
          variant_id: component.variant_id,
          price_adjustment: override,
          overridden: true,
        };
  });
}

export interface KitUnitPriceInput {
  basePrice: number;
  /** The kit's own variant; its `price_adjustment` adds to the base. */
  kitVariant?: { price_adjustment: number | null | undefined } | null;
  components: PricedComponent[];
  overrides?: KitPriceOverrides;
}

export interface KitUnitPrice {
  unitPrice: number;
  contributions: ResolvedContribution[];
  /** `kit_variant.price_adjustment`, normalised to a number. */
  kitAdjustment: number;
}

/**
 * The authoritative kit line price. Used for display AND for the server-side
 * recompute, so a tampered request cannot choose its own price.
 */
export function resolveKitUnitPrice(input: KitUnitPriceInput): KitUnitPrice {
  const basePrice = Number(input.basePrice) || 0;
  const kitAdjustment = Number(input.kitVariant?.price_adjustment ?? 0) || 0;
  const contributions = resolveComponentContributions(
    input.components,
    input.overrides
  );
  const componentTotal = contributions.reduce(
    (sum, c) => sum + (Number(c.price_adjustment) || 0),
    0
  );
  return {
    unitPrice: basePrice + kitAdjustment + componentTotal,
    contributions,
    kitAdjustment,
  };
}

/** A submitted component, with the owning product needed to match a rule. */
export interface PairingComponent {
  variant_id: string;
  product_id: string | null | undefined;
}

/** One `component_variant_rules` row as selected by the server loaders. */
export interface RuleRow {
  id: string;
  kit_product_id: string;
  condition_variant_id: string;
  target_component_product_id: string;
  component_variant_rule_allowed: Array<{
    variant_id: string;
    /** NUMERIC over PostgREST may arrive as a string, so accept both. */
    price_override: number | string | null;
  }> | null;
}

/**
 * Normalise raw rule rows (with their nested allowed pairs) into the contract
 * shape, flattening `price_override` into `price_overrides`.
 *
 * `price_override` arrives as a NUMERIC that PostgREST may hand back as a
 * string, and `NULL` is meaningful (no override), so it is normalised here once
 * instead of at every read site. Rows are grouped by kit product because that is
 * how the submit route needs them.
 */
export function rulesByKitProduct(
  rows: RuleRow[]
): Map<string, ComponentVariantRule[]> {
  const grouped = new Map<string, ComponentVariantRule[]>();
  for (const row of rows) {
    const priceOverrides: Record<string, number | null> = {};
    const allowed = row.component_variant_rule_allowed ?? [];
    for (const pair of allowed) {
      const raw = pair.price_override;
      priceOverrides[pair.variant_id] =
        raw === null || raw === undefined || raw === "" || Number.isNaN(raw)
          ? null
          : Number(raw);
    }
    const list = grouped.get(row.kit_product_id) ?? [];
    list.push({
      id: row.id,
      condition_variant_id: row.condition_variant_id,
      target_component_product_id: row.target_component_product_id,
      allowed_variant_ids: allowed.map((p) => p.variant_id),
      price_overrides: priceOverrides,
    });
    grouped.set(row.kit_product_id, list);
  }
  return grouped;
}

/**
 * Same normalisation as `rulesByKitProduct`, returned in the plain record shape
 * the SSR loaders use (`Record<kitProductId, rules[]>`).
 */
export function toRulesByProductId(
  rows: RuleRow[]
): Record<string, ComponentVariantRule[]> {
  return Object.fromEntries(rulesByKitProduct(rows));
}

/** One or more variant ids that can satisfy a rule's condition. */
export type ConditionVariantIds = string | string[] | null | undefined;

/** The minimum a variant needs to appear in a price ladder. */
export interface LadderVariant {
  id: string;
  price_adjustment: number;
}

/**
 * What a variant actually contributes once the override is applied.
 * Mirrors the server resolver exactly, so an admin preview cannot disagree with
 * what the storefront charges.
 */
export function effectiveContribution(
  override: number | null | undefined,
  variant: { price_adjustment: number }
): number {
  return override === null || override === undefined
    ? variant.price_adjustment
    : override;
}

/**
 * Find a pair whose effective prices are out of order relative to their own
 * prices.
 *
 * Staff pick which variants are allowed in ascending cost tiers (x70 < x90 <
 * x100). An override can break that ladder — say x70 is surcharged past x90 —
 * which leaves the storefront showing a cheaper-looking variant costing more.
 * `effectivePrice` supplies each variant's resolved contribution.
 */
export function findPriceLadderInversion<T extends LadderVariant>(
  variants: T[],
  effectivePrice: (variant: T) => number
): { cheaper: T; pricier: T } | null {
  const ordered = [...variants].sort(
    (a, b) => a.price_adjustment - b.price_adjustment
  );
  for (let i = 1; i < ordered.length; i++) {
    const cheaper = ordered[i - 1];
    const pricier = ordered[i];
    if (effectivePrice(cheaper) > effectivePrice(pricier)) {
      return { cheaper, pricier };
    }
  }
  return null;
}

/**
 * Collect the rule ids whose condition is satisfied.
 *
 * A rule's `condition_variant_id` may point at EITHER the kit's own variant (the
 * newer colourway model) OR a variant of one of its components (how every rule
 * in the live catalogue is authored today — e.g. YOK Switches keys off the
 * "Purple" variant of its `YOK Switches - Version` component). So callers pass
 * the whole candidate set and every matching rule applies.
 */
function applicableRules(
  rules: ComponentVariantRule[],
  conditionVariantIds: ConditionVariantIds
): ComponentVariantRule[] {
  const ids = new Set(
    (Array.isArray(conditionVariantIds)
      ? conditionVariantIds
      : [conditionVariantIds]
    ).filter((v): v is string => typeof v === "string" && v.length > 0)
  );
  if (ids.size === 0) return [];
  return rules.filter((rule) => ids.has(rule.condition_variant_id));
}

/**
 * Server-side compatibility check. Returns the first submitted component
 * variant that the selected configuration's rules forbid, or `null` when the
 * pairing is legal.
 *
 * A rule is scoped by `target_component_product_id`: it only judges components
 * belonging to that product, so a variant from another group is not judged by
 * it. When the kit has no rules for a product, that product is unrestricted —
 * the same behaviour the configurator UI has always had.
 */
export function findDisallowedComponentVariant(
  rules: ComponentVariantRule[],
  conditionVariantIds: ConditionVariantIds,
  components: PairingComponent[]
): string | null {
  for (const rule of applicableRules(rules, conditionVariantIds)) {
    const allowed = new Set(rule.allowed_variant_ids);
    for (const component of components) {
      if (component.product_id !== rule.target_component_product_id) continue;
      if (!allowed.has(component.variant_id)) return component.variant_id;
    }
  }
  return null;
}
