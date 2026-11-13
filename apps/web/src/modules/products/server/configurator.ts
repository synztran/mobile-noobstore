import "server-only";

import { toRulesByProductId } from "@/modules/products/kit-pricing";
import { sortConfiguratorVariants } from "./configurator-order";

import { getPublicClient } from "@/lib/supabase/public";
import type {
  ComponentVariantRule,
  ConfiguratorGroup,
  ConfiguratorResponse,
  ConfiguratorVariant,
} from "@/modules/products/types";

/**
 * Loads the kit configurator payload for a parent product — the component
 * groups with selectable variants plus the conditional availability rules.
 * This is what hydrates the Quick Add Drawer configurator UI.
 *
 * Returns empty groups/rules when the product has no component links. Throws
 * on Supabase errors.
 */
export async function getConfiguratorData(
  slug: string
): Promise<ConfiguratorResponse> {
  const supabase = getPublicClient();

  // Fetch all component links for this parent kit, joined to
  // the component product (for its variants)
  const { data, error } = await supabase
    .from("product_components")
    .select(
      `
			component_group,
			is_required,
			max_quantity,
			component_product_id,
			products!product_components_component_product_id_fkey(
				product_variants(id, variant_name, price_adjustment, thumbnail, stock_quantity, is_pre_order, pre_order_config, attributes)
			)
		`
    )
    .eq("parent_product_id", slug)
    .order("component_group");

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    return { groups: [], rules: [] };
  }

  // Aggregate rows into groups (multiple component products can belong
  // to the same group label, all their variants go into the same bucket)
  const groupMap = new Map<string, ConfiguratorGroup>();

  for (const row of data) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rowAny = row as any;
    const key = rowAny.component_group as string;
    const isRequired = rowAny.is_required as boolean;
    const maxQuantity = rowAny.max_quantity as number | null;
    const rawVariants: Array<{
      id: string;
      variant_name: string;
      price_adjustment: number;
      thumbnail: string | null;
      stock_quantity: number;
      is_pre_order: boolean;
      pre_order_config: unknown;
    }> = rowAny.products?.product_variants ?? [];

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        component_group: key,
        is_required: isRequired,
        max_quantity: maxQuantity,
        variants: [],
      });
    }

    const group = groupMap.get(key)!;
    const componentProductId = rowAny.component_product_id as string;
    for (const v of rawVariants) {
      group.variants.push({
        id: v.id,
        variant_name: v.variant_name,
        price_adjustment: Number(v.price_adjustment),
        thumbnail: v.thumbnail ?? null,
        stock_quantity: Number(v.stock_quantity ?? 0),
        is_pre_order: v.is_pre_order ?? false,
        pre_order_config:
          (v.pre_order_config as ConfiguratorVariant["pre_order_config"]) ??
          null,
        component_product_id: componentProductId,
        attributes: (v as any).attributes ?? null,
      });
    }
  }

  // Fetch conditional variant rules for this kit
  const { data: ruleRows } = await supabase
    .from("component_variant_rules")
    .select(
      `id, kit_product_id, condition_variant_id, target_component_product_id,
       component_variant_rule_allowed(variant_id, price_override)`
    )
    .eq("kit_product_id", slug);

  const rules = toRulesByProductId(ruleRows ?? [])[slug] ?? [];

  return {
    groups: Array.from(groupMap.values()).map((group) => ({
      ...group,
      variants: sortConfiguratorVariants(group.variants),
    })),
    rules,
  };
}
