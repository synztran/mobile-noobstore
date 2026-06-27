import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/component-rules/variant-context?variantId=<id>&productId=<id>
 *
 * Returns:
 *  - kits: kits that use `productId` as a component, with sibling components + their variants
 *  - rules: existing component_variant_rules where condition_variant_id = variantId
 */
export async function GET(req: NextRequest) {
  const variantId = req.nextUrl.searchParams.get("variantId")?.trim();
  const productId = req.nextUrl.searchParams.get("productId")?.trim();

  if (!variantId || !productId) {
    return NextResponse.json(
      { error: "variantId and productId are required" },
      { status: 400 }
    );
  }

  const supabase = getAdminClient();

  // Find all kit products that use productId as a component
  const { data: links, error: linksError } = await supabase
    .from("product_components")
    .select(
      "parent_product_id, products!product_components_parent_product_id_fkey(id, name, product_type)"
    )
    .eq("component_product_id", productId);

  if (linksError) {
    return NextResponse.json({ error: linksError.message }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kitIds = (links ?? [])
    .filter((l: any) => l.products?.product_type === "kit")
    .map((l: any) => l.parent_product_id as string);

  if (kitIds.length === 0) {
    return NextResponse.json({ kits: [], rules: [] });
  }

  // For each kit, get all components (deduplicated by component_product_id) with variants
  const { data: kitsData, error: kitsError } = await supabase
    .from("products")
    .select(
      `id, name, is_active,
			product_components!product_components_parent_product_id_fkey(
				component_product_id,
				products!product_components_component_product_id_fkey(
					id, name,
					product_variants(id, variant_name)
				)
			)`
    )
    .in("id", kitIds);

  if (kitsError) {
    return NextResponse.json({ error: kitsError.message }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kits = (kitsData ?? []).map((kit: any) => {
    const seen = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const components = (kit.product_components ?? []).reduce(
      (acc: any[], comp: any) => {
        if (!seen.has(comp.component_product_id)) {
          seen.add(comp.component_product_id);
          acc.push({
            component_product_id: comp.component_product_id,
            name: comp.products?.name ?? comp.component_product_id,
            product_variants: comp.products?.product_variants ?? [],
          });
        }
        return acc;
      },
      []
    );
    return { id: kit.id, name: kit.name, components };
  });

  // Fetch existing rules for this variant
  const { data: rulesData, error: rulesError } = await supabase
    .from("component_variant_rules")
    .select(
      `id, kit_product_id, condition_variant_id, target_component_product_id,
			component_variant_rule_allowed(variant_id)`
    )
    .eq("condition_variant_id", variantId);

  if (rulesError) {
    return NextResponse.json({ error: rulesError.message }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rules = (rulesData ?? []).map((r: any) => ({
    id: r.id,
    kit_product_id: r.kit_product_id,
    condition_variant_id: r.condition_variant_id,
    target_component_product_id: r.target_component_product_id,
    allowed_variant_ids: (r.component_variant_rule_allowed ?? []).map(
      (a: { variant_id: string }) => a.variant_id
    ),
  }));

  return NextResponse.json({ kits, rules });
}
