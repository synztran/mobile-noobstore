import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface ShopVariantDetail {
	id: string;
	variant_name: string;
	price_adjustment: number;
	effective_price: number;
	thumbnail: string | null;
}

export interface ComponentProductDetail {
	id: string;
	name: string;
	slug: string;
	base_price: number;
	thumbnail: string | null;
	images: string[] | null;
	variants: ShopVariantDetail[];
}

export interface ProductComponentDetail {
	id: string;
	component_group: string;
	is_required: boolean;
	component_product: ComponentProductDetail;
}

export interface ProductDetail {
	id: string;
	slug: string;
	name: string;
	category: string;
	category_id: string | null;
	base_price: number;
	stock_quantity: number;
	thumbnail: string | null;
	images: string[] | null;
	variants: ShopVariantDetail[];
	components: ProductComponentDetail[];
	min_price: number;
}

// ─── GET /api/products/[slug] ─────────────────────────────────────────────────

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ slug: string }> },
) {
	const { slug } = await params;
	if (!slug) {
		return NextResponse.json(
			{ error: "Slug is required" },
			{ status: 400 },
		);
	}

	try {
		const supabase = await createClient();

		const { data: product, error } = await supabase
			.from("products")
			.select(
				`
				id,
				slug,
				name,
				base_price,
				stock_quantity,
				category_id,
				thumbnail,
				images,
				categories(id, name),
				product_variants(id, variant_name, price_adjustment, thumbnail),
				product_components!product_components_parent_product_id_fkey(
					id,
					component_group,
					is_required,
					component_product_id
				)
			`,
			)
			.eq("slug", slug)
			.maybeSingle();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}
		if (!product) {
			return NextResponse.json(
				{ error: "Product not found" },
				{ status: 404 },
			);
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const p = product as any;

		// ── Shape variants ────────────────────────────────────────────────
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const variants: ShopVariantDetail[] = (p.product_variants ?? []).map(
			(v: any) => ({
				id: v.id,
				variant_name: v.variant_name,
				price_adjustment: Number(v.price_adjustment),
				effective_price:
					Number(p.base_price) + Number(v.price_adjustment),
				thumbnail: v.thumbnail ?? null,
			}),
		);

		const minPrice =
			variants.length > 0
				? Math.min(...variants.map((v) => v.effective_price))
				: Number(p.base_price);

		// ── Fetch component products ──────────────────────────────────────
		const rawComponents: Array<{
			id: string;
			component_group: string;
			is_required: boolean;
			component_product_id: string | null;
		}> = p.product_components ?? [];

		const componentProductIds = rawComponents
			.map((c) => c.component_product_id)
			.filter((id): id is string => id !== null);

		let componentProductMap = new Map<string, ComponentProductDetail>();
		if (componentProductIds.length > 0) {
			const { data: compProducts } = await supabase
				.from("products")
				.select(
					"id, name, slug, base_price, thumbnail, images, product_variants(id, variant_name, price_adjustment, thumbnail)",
				)
				.in("id", componentProductIds);

			for (const cp of compProducts ?? []) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const cpAny = cp as any;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const cpVariants: ShopVariantDetail[] = (
					cpAny.product_variants ?? []
				).map((v: any) => ({
					id: v.id,
					variant_name: v.variant_name,
					price_adjustment: Number(v.price_adjustment),
					effective_price:
						Number(cpAny.base_price) + Number(v.price_adjustment),
					thumbnail: v.thumbnail ?? null,
				}));
				componentProductMap.set(cpAny.id, {
					id: cpAny.id,
					name: cpAny.name,
					slug: cpAny.slug,
					base_price: Number(cpAny.base_price),
					thumbnail: cpAny.thumbnail ?? null,
					images: Array.isArray(cpAny.images)
						? (cpAny.images as string[])
						: null,
					variants: cpVariants,
				});
			}
		}

		const components: ProductComponentDetail[] = rawComponents
			.filter(
				(c) =>
					c.component_product_id &&
					componentProductMap.has(c.component_product_id),
			)
			.map((c) => ({
				id: c.id,
				component_group: c.component_group,
				is_required: c.is_required,
				component_product: componentProductMap.get(
					c.component_product_id!,
				)!,
			}));

		const result: ProductDetail = {
			id: p.id,
			slug: p.slug,
			name: p.name,
			category: p.categories?.name ?? "",
			category_id: p.category_id,
			base_price: Number(p.base_price),
			stock_quantity: p.stock_quantity,
			thumbnail: p.thumbnail ?? null,
			images: Array.isArray(p.images) ? (p.images as string[]) : null,
			variants,
			components,
			min_price: minPrice,
		};

		return NextResponse.json(result);
	} catch (err: unknown) {
		console.error("Product detail error:", err);
		return NextResponse.json(
			{
				error:
					err instanceof Error
						? err.message
						: "Internal server error",
			},
			{ status: 500 },
		);
	}
}
