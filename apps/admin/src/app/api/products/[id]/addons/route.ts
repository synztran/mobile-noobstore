import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params;
  const supabase = getAdminClient();

  const { data: addons, error } = await (supabase as any)
    .from("product_addons")
    .select(
      `id, main_product_id, addon_product_id, discount_type, discount_value, is_active, sort_order, created_at,
       addon:products!addon_product_id(id, name, base_price, stock_quantity, thumbnail)`
    )
    .eq("main_product_id", productId)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(addons ?? []);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params;
  const supabase = getAdminClient();

  try {
    const body = await request.json();
    const { addon_product_id, discount_type, discount_value, is_active, sort_order } = body;

    if (!addon_product_id) {
      return NextResponse.json(
        { error: "Vui lòng chọn sản phẩm mua kèm" },
        { status: 400 }
      );
    }

    if (productId === addon_product_id) {
      return NextResponse.json(
        { error: "Không thể chọn chính sản phẩm này làm sản phẩm mua kèm" },
        { status: 400 }
      );
    }

    const { data, error } = await (supabase as any)
      .from("product_addons")
      .insert({
        main_product_id: productId,
        addon_product_id,
        discount_type: discount_type ?? "percentage",
        discount_value: Number(discount_value) || 0,
        is_active: is_active ?? true,
        sort_order: Number(sort_order) || 0,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Sản phẩm này đã được thêm vào danh sách mua kèm" },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid payload" },
      { status: 400 }
    );
  }
}
