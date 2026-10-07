import { getAdminClient } from "@/lib/supabase/admin";
import { invalidateProductCaches } from "@/lib/redis/cache";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = {
	params: Promise<{ id: string }>;
};

const KIT_SELECT = `
	id, name, slug, product_type, base_price, stock_quantity, max_quantity, is_active,
	product_variants(id, variant_name, stock_quantity, price_adjustment),
	product_components!product_components_parent_product_id_fkey(
		id, component_group, is_required, component_product_id,
		products!product_components_component_product_id_fkey(
			id, name, slug,
			product_variants(id, variant_name, stock_quantity, price_adjustment)
		)
	)
`;

export async function GET(_req: NextRequest, context: RouteContext) {
	const { id } = await context.params;
	const supabase = getAdminClient();

	const { data, error } = await supabase
		.from("products")
		.select(KIT_SELECT)
		.eq("id", id)
		.single();

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 404 });
	}
	return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
	const { id } = await context.params;
	const body = await req.json();
	const supabase = getAdminClient();

	// Fetch product type to decide where is_pre_order lives
	const { data: product } = await supabase
		.from("products")
		.select("product_type, slug")
		.eq("id", id)
		.single();

	// Never let a kit go live without component products: the cart gate finds
	// no component variants to validate against and 409s every add-to-cart.
	if (body?.is_active === true && product?.product_type === "kit") {
		const { count } = await supabase
			.from("product_components")
			.select("id", { count: "exact", head: true })
			.eq("parent_product_id", id);

		if ((count ?? 0) === 0) {
			return NextResponse.json(
				{
					error:
						"Cannot activate: this kit has no component products attached. Add components first, then activate.",
				},
				{ status: 400 },
			);
		}
	}

	const productType = product?.product_type ?? "standard";
	const { is_pre_order, ...productBody } = body;

	// For standard: save is_pre_order to products table directly
	// For kit: save is_pre_order to product_variants (propagate to all variants)
	if (typeof is_pre_order === "boolean") {
		if (productType === "kit") {
			await supabase
				.from("product_variants")
				.update({ is_pre_order })
				.eq("product_id", id);
		} else {
			productBody.is_pre_order = is_pre_order;
		}
	}

	const { error } = await supabase
		.from("products")
		.update(productBody)
		.eq("id", id);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	// Product/stock/variant fields changed — invalidate storefront caches so
	// /shop and product pages reflect the new data immediately.
	await invalidateProductCaches();

	try {
		const slug = (body as any)?.slug ?? (product as any)?.slug;
		if (slug) {
			const { scrapeFacebookProduct } = await import("@/lib/facebook/scrape");
			const url = `https://www.noobstore.xyz/shop/${slug}`;
			void scrapeFacebookProduct(url);
		}
	} catch (err) {
		console.error("[admin/products/PATCH] fb scrape failed:", err);
	}

	return NextResponse.json({ success: true }, { status: 200 });
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
	const { id } = await context.params;
	const supabase = getAdminClient();

	const { error } = await supabase.from("products").delete().eq("id", id);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	return NextResponse.json({ success: true }, { status: 200 });
}
