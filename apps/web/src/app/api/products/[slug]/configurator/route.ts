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
	pre_order_config: { estimate: string; available_date?: string | null; notes?: string | null } | null;
  sale_price_percent?: number;
}

export interface ConfiguratorGroup {
	component_group: string;
	is_required: boolean;
	variants: ConfiguratorVariant[];
}

export type ConfiguratorResponse = ConfiguratorGroup[];

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
			return NextResponse.json<ConfiguratorResponse>([]);
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
			for (const v of rawVariants) {
				group.variants.push({
					id: v.id,
					variant_name: v.variant_name,
					price_adjustment: Number(v.price_adjustment),
					thumbnail: v.thumbnail ?? null,
					stock_quantity: Number(v.stock_quantity ?? 0),
					is_pre_order: v.is_pre_order ?? false,
					pre_order_config: (v.pre_order_config as ConfiguratorVariant["pre_order_config"]) ?? null,
				});
			}
		}

		return NextResponse.json<ConfiguratorResponse>(
			Array.from(groupMap.values()),
		);
	} catch (err) {
		console.error("[configurator] unexpected error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
