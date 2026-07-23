import { getCache, setCache } from "@/lib/redis/cache";
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
  stock_quantity: number;
  is_pre_order: boolean;
  pre_order_config: {
    estimate: string;
    available_date?: string | null;
    notes?: string | null;
  } | null;
  attributes: Record<string, string> | null;
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

export type ProductType = "standard" | "kit" | "component" | "gift";

export interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  description: string | null;
  category: string;
  category_id: string | null;
  base_price: number;
  stock_quantity: number;
  thumbnail: string | null;
  images: string[] | null;
  product_type: ProductType;
  variants: ShopVariantDetail[];
  components: ProductComponentDetail[];
  min_price: number;
  is_used: boolean;
  /** True when at least one variant is pre-order */
  is_pre_order: boolean;
  attributes?: Record<string, string> | null;
  sale_ends_at?: string | null;
  sold_count: number;
  gifts?: Array<{ gift_name: string; gift_slug: string; gift_thumbnail: string | null; quantity: number }>;
}

// ─── GET /api/products/[slug] ─────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }

  try {
    const cacheKey = `product-detail:${slug}`;
    const cached = await getCache<ProductDetail>(cacheKey);
    if (cached) return NextResponse.json(cached);

    const supabase = await createClient();

    const { data: product, error } = await supabase
      .from("products")
      .select(
        `
				id,
				slug,
				name,
				brand,
				description,
				base_price,
				stock_quantity,
				category_id,
				thumbnail,
				images,
				product_type,
 				is_used,
 				is_active,
          is_pre_order,
          attributes,
         sale_ends_at,
				categories(id, name),
				product_variants(id, variant_name, price_adjustment, thumbnail, stock_quantity, is_pre_order, pre_order_config, attributes),
				product_components!product_components_parent_product_id_fkey(
					id,
					component_group,
					is_required,
					component_product_id
				)
			`
      )
      .eq("is_active", true)
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
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
        effective_price: Number(p.base_price) + Number(v.price_adjustment),
        thumbnail: v.thumbnail ?? null,
        stock_quantity: Number(v.stock_quantity ?? 0),
        is_pre_order: v.is_pre_order ?? false,
        pre_order_config: v.pre_order_config ?? null,
        attributes: v.attributes ?? null,
      })
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
          "id, is_active, name, slug, base_price, thumbnail, images, product_variants(id, variant_name, price_adjustment, thumbnail, stock_quantity, is_pre_order, pre_order_config, attributes)"
        )
        .eq("is_active", true)
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
          stock_quantity: Number(v.stock_quantity ?? 0),
          is_pre_order: v.is_pre_order ?? false,
          pre_order_config: v.pre_order_config ?? null,
          attributes: v.attributes ?? null,
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
          componentProductMap.has(c.component_product_id)
      )
      .map((c) => ({
        id: c.id,
        component_group: c.component_group,
        is_required: c.is_required,
        component_product: componentProductMap.get(c.component_product_id!)!,
      }));

    // Fetch gift data
    let gifts: ProductDetail["gifts"];
    const { data: giftRows } = await supabase
      .from("gift_products")
      .select(`product_id, quantity, gift:gift_product_id!inner(name, slug, thumbnail)`)
      .eq("product_id", p.id);
    if (giftRows && giftRows.length > 0) {
      gifts = (giftRows as unknown as Array<Record<string, unknown>>).map((g) => {
        const gift = g.gift as Record<string, unknown>;
        return {
          gift_name: (gift.name as string) ?? "",
          gift_slug: (gift.slug as string) ?? "",
          gift_thumbnail: (gift.thumbnail as string) ?? null,
          quantity: Number(g.quantity ?? 1),
        };
      });
    }

    const result: ProductDetail = {
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand ?? null,
      description: p.description ?? null,
      category: p.categories?.name ?? "",
      category_id: p.category_id,
      base_price: Number(p.base_price),
      stock_quantity: p.stock_quantity,
      thumbnail: p.thumbnail ?? null,
      images: Array.isArray(p.images) ? (p.images as string[]) : null,
      product_type: (p.product_type ?? "standard") as ProductType,
      variants,
      components,
      min_price: minPrice,
      is_used: p.is_used ?? false,
      is_pre_order:
        p.product_type === "kit"
          ? variants.some((v) => v.is_pre_order)
          : p.is_pre_order ?? false,
      attributes: (p as any).attributes ?? null,
      sale_ends_at: (p as any).sale_ends_at ?? null,
      sold_count: Number((p as any).sold_count ?? 0),
      gifts,
    };

    await setCache(cacheKey, result, 300);

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Product detail error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
