import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface RecentReviewItem {
  id: string;
  rating: number;
  body: string | null;
  reviewer_name: string;
  created_at: string;
  product_name: string;
  product_slug: string;
  product_thumbnail: string | null;
  source: "native" | "google";
}

export async function GET() {
  try {
    const supabase = await createClient();
    const sb = supabase as any;

    const { data: reviews, error } = await sb
      .from("product_reviews")
      .select("id, rating, body, reviewer_name, created_at, product_id, source")
      .eq("is_visible", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const productIds = [
      ...new Set((reviews ?? []).map((r: any) => r.product_id)),
    ];

    const { data: products } = await sb
      .from("products")
      .select("id, name, slug, thumbnail")
      .in("id", productIds);

    const productMap: Record<string, any> = {};
    for (const p of products ?? []) {
      productMap[p.id] = p;
    }

    const result: RecentReviewItem[] = (reviews ?? []).map((r: any) => {
      const product = productMap[r.product_id] ?? {};
      return {
        id: r.id,
        rating: r.rating,
        body: r.body,
        reviewer_name: r.reviewer_name || "Ẩn danh",
        created_at: r.created_at,
        product_name: product.name ?? "",
        product_slug: product.slug ?? "",
        product_thumbnail: product.thumbnail ?? null,
        source: r.source || "native",
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[reviews recent] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
