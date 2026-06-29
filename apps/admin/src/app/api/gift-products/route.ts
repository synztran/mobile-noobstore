import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("gift_products")
      .select(
        `id, product_id, gift_product_id, quantity, created_at,
         product:product_id!inner(name, slug, thumbnail),
         gift:gift_product_id!inner(name, slug, thumbnail)`
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    const mapped = (data ?? []).map((r: Record<string, unknown>) => {
      const product = r.product as Record<string, unknown>;
      const gift = r.gift as Record<string, unknown>;
      return {
        id: r.id as string,
        product_id: r.product_id as string,
        gift_product_id: r.gift_product_id as string,
        quantity: r.quantity as number,
        created_at: r.created_at as string,
        product_name: (product.name as string) ?? "",
        product_slug: (product.slug as string) ?? "",
        product_thumbnail: (product.thumbnail as string) ?? null,
        gift_name: (gift.name as string) ?? "",
        gift_slug: (gift.slug as string) ?? "",
        gift_thumbnail: (gift.thumbnail as string) ?? null,
      };
    });

    return NextResponse.json(mapped);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      product_id: string;
      gift_product_id: string;
      quantity?: number;
    };

    if (!body.product_id || !body.gift_product_id) {
      return NextResponse.json(
        { error: "product_id and gift_product_id are required" },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();
    const { error } = await supabase.from("gift_products").insert({
      product_id: body.product_id,
      gift_product_id: body.gift_product_id,
      quantity: body.quantity ?? 1,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Sản phẩm này đã có quà tặng" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const id = sp.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const supabase = getAdminClient();
    const { error } = await supabase.from("gift_products").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
