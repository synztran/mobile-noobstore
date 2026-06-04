import { getPublicClient } from "@/lib/supabase/public";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface ConfiguratorVariant {
	id: string;
	variant_name: string;
	price_adjustment: number;
	thumbnail: string | null;
	stock_quantity: number;
	is_pre_order: boolean;
	pre_order_config: {
		estimate: string;
		available_date?: string | null;
		notes?: string | null;
	} | null;
	sale_price_percent?: number;
	/** The component product this variant belongs to (used for rule resolution). */
	component_product_id?: string;
}

export interface ConfiguratorGroup {
	component_group: string;
	is_required: boolean;
	variants: ConfiguratorVariant[];
}

/** A single conditional-availability rule for a kit. */
export interface ComponentVariantRule {
	id: string;
	/** The variant that triggers this rule (e.g. case = red). */
	condition_variant_id: string;
	/** The component product whose variants get restricted. */
	target_component_product_id: string;
	/** Variants that ARE allowed when the rule fires. */
	allowed_variant_ids: string[];
}

export type ConfiguratorResponse = {
	groups: ConfiguratorGroup[];
	rules: ComponentVariantRule[];
};

// ─── GET /api/products/[id]/configurator ──────────────────────────────────────
//
// Returns the component groups + selectable variants for a parent kit.
// This is what hydrates the Quick Add Drawer configurator UI.

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ slug: string }> },
) {
	const { slug } = await params;
	if (!slug) {
		return NextResponse.json(
			{ error: "slug is required" },
			{ status: 400 },
		);
	}

	try {
		const supabase = getPublicClient();

		// Fetch all component links for this parent kit, joined to
		// the component product (for its variants)
		const { data, error } = await supabase
			.from("product_components")
			.select(
				`
				component_group,
				is_required,
				component_product_id,
				products!product_components_component_product_id_fkey(
					product_variants(id, variant_name, price_adjustment, thumbnail, stock_quantity, is_pre_order, pre_order_config)
				)
			`,
			)
			.eq("parent_product_id", slug)
			.order("component_group");

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		if (!data || data.length === 0) {
			return NextResponse.json<ConfiguratorResponse>({
				groups: [],
				rules: [],
			});
		}

		// Aggregate rows into groups (multiple component products can belong
		// to the same group label, all their variants go into the same bucket)
		const groupMap = new Map<string, ConfiguratorGroup>();

		for (const row of data) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const rowAny = row as any;
			const key = rowAny.component_group as string;
			const isRequired = rowAny.is_required as boolean;
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
				});
			}
		}

		// Fetch conditional variant rules for this kit
		const { data: ruleRows } = await supabase
			.from("component_variant_rules")
			.select(
				`id, condition_variant_id, target_component_product_id,
				 component_variant_rule_allowed(variant_id)`,
			)
			.eq("kit_product_id", slug);

		const rules: ComponentVariantRule[] = (ruleRows ?? []).map(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(r: any) => ({
				id: r.id,
				condition_variant_id: r.condition_variant_id,
				target_component_product_id: r.target_component_product_id,
				allowed_variant_ids: (
					r.component_variant_rule_allowed ?? []
				).map((a: { variant_id: string }) => a.variant_id),
			}),
		);

		return NextResponse.json<ConfiguratorResponse>({
			groups: Array.from(groupMap.values()),
			rules,
		});
	} catch (err) {
		console.error("[configurator] unexpected error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
