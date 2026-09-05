import { createClient } from "@/lib/supabase/server";
import type { GiftProductInfo } from "@/modules/products/types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: product } = await supabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!product) {
      return NextResponse.json({ gift: null });
    }

    const { data, error } = await supabase
      .from("gift_products")
      .select(
        `id, product_id, gift_product_id, quantity,
         gift:gift_product_id!inner(name, slug, thumbnail)`
      )
      .eq("product_id", product.id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ gift: null });
    }

    const r = data as Record<string, unknown>;
    const gift = r.gift as Record<string, unknown>;

    return NextResponse.json({
      gift: {
        id: r.id as string,
        gift_product_id: r.gift_product_id as string,
        quantity: r.quantity as number,
        gift_name: (gift.name as string) ?? "",
        gift_slug: (gift.slug as string) ?? "",
        gift_thumbnail: (gift.thumbnail as string) ?? null,
      } as GiftProductInfo,
    });
  } catch {
    return NextResponse.json({ gift: null });
  }
}
