import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductType = "standard" | "kit" | "component";

export interface CreateVariantInput {
	variant_name: string;
	price_adjustment?: number;
	thumbnail?: string | null;
}

export interface CreateComponentInput {
	/** ID of an existing product to attach as a component */
	component_product_id: string;
	component_group: string;
	is_required?: boolean;
}

export interface CreateProductRequest {
	name: string;
	slug: string;
	category_id?: string | null;
	base_price: number;
	stock_quantity?: number;
	thumbnail?: string | null;
	images?: string[] | null;
	/** Defaults to 'standard' */
	product_type?: ProductType;
	/** Optional variants (size, switch type, etc.) */
	variants?: CreateVariantInput[];
	/**
	 * Component links for kit products.
	 * Only meaningful when product_type = 'kit'.
	 */
	components?: CreateComponentInput[];
}

export interface CreateProductResponse {
	id: string;
	slug: string;
	product_type: ProductType;
}

// ─── POST /apiAdmin/products ──────────────────────────────────────────────────
//
// Admin-only. Creates a product with optional variants and component links.
//
// product_type rules:
//   standard  — regular product, may have variants, no components
//   kit       — parent product; include components[] to define its parts
//   component — a part meant to be used inside a kit; may have variants
//
// Auth: requires an authenticated user with role = 'admin'.
// Uses admin client for inserts to bypass RLS.

export async function POST(req: NextRequest) {
	// ── 1. Authenticate and authorise ────────────────────────────────────
	const userClient = await createClient();
	const {
		data: { user },
		error: authError,
	} = await userClient.auth.getUser();

	if (authError || !user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { data: profile } = await userClient
		.from("users")
		.select("role")
		.eq("id", user.id)
		.maybeSingle();

	if (profile?.role !== "admin") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	// ── 2. Parse and validate body ────────────────────────────────────────
	let body: CreateProductRequest;
	try {
		body = await req.json();
	} catch {
		return NextResponse.json(
			{ error: "Invalid JSON body" },
			{ status: 400 },
		);
	}

	const { name, slug, base_price } = body;
	if (!name?.trim() || !slug?.trim() || base_price == null) {
		return NextResponse.json(
			{ error: "name, slug, and base_price are required" },
			{ status: 400 },
		);
	}

	if (base_price < 0) {
		return NextResponse.json(
			{ error: "base_price must be non-negative" },
			{ status: 400 },
		);
	}

	const productType: ProductType = body.product_type ?? "standard";
	const validTypes: ProductType[] = ["standard", "kit", "component"];
	if (!validTypes.includes(productType)) {
		return NextResponse.json(
			{ error: `product_type must be one of: ${validTypes.join(", ")}` },
			{ status: 400 },
		);
	}

	const admin = getAdminClient();

	// ── 3. Insert product ─────────────────────────────────────────────────
	const productId = crypto.randomUUID();

	const { error: productError } = await admin.from("products").insert({
		id: productId,
		name: name.trim(),
		slug: slug.trim(),
		category_id: body.category_id ?? null,
		base_price,
		stock_quantity: body.stock_quantity ?? 0,
		thumbnail: body.thumbnail ?? null,
		images: body.images ?? null,
		product_type: productType,
	});

	if (productError) {
		// Unique constraint on slug
		if (productError.code === "23505") {
			return NextResponse.json(
				{ error: `A product with slug '${slug}' already exists` },
				{ status: 409 },
			);
		}
		return NextResponse.json(
			{ error: productError.message },
			{ status: 500 },
		);
	}

	// ── 4. Insert variants ────────────────────────────────────────────────
	if (body.variants?.length) {
		const variantRows = body.variants.map((v) => ({
			id: crypto.randomUUID(),
			product_id: productId,
			variant_name: v.variant_name,
			price_adjustment: v.price_adjustment ?? 0,
			thumbnail: v.thumbnail ?? null,
		}));

		const { error: variantError } = await admin
			.from("product_variants")
			.insert(variantRows);

		if (variantError) {
			return NextResponse.json(
				{ error: `Variants: ${variantError.message}` },
				{ status: 500 },
			);
		}
	}

	// ── 5. Insert component links (kit only) ──────────────────────────────
	if (productType === "kit" && body.components?.length) {
		const componentRows = body.components.map((c) => ({
			id: crypto.randomUUID(),
			parent_product_id: productId,
			component_product_id: c.component_product_id,
			component_group: c.component_group,
			is_required: c.is_required ?? true,
		}));

		const { error: componentError } = await admin
			.from("product_components")
			.insert(componentRows);

		if (componentError) {
			return NextResponse.json(
				{ error: `Components: ${componentError.message}` },
				{ status: 500 },
			);
		}

		// Mark component products as product_type = 'component' if not already set
		const componentProductIds = body.components.map(
			(c) => c.component_product_id,
		);
		await admin
			.from("products")
			.update({ product_type: "component" })
			.in("id", componentProductIds)
			.eq("product_type", "standard");
	}

	return NextResponse.json<CreateProductResponse>(
		{ id: productId, slug: slug.trim(), product_type: productType },
		{ status: 201 },
	);
}
