import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface PurchasedItem {
  product_name: string;
  thumbnail: string | null;
  variant_summary: string;
}

export interface PurchaseCheckResponse {
  can_review: boolean;
  has_reviewed: boolean;
  purchased_items: PurchasedItem[];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { can_review: false, has_reviewed: false, purchased_items: [] }
      );
    }

    const { data: product } = await supabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!product) {
      return NextResponse.json(
        { can_review: false, has_reviewed: false, purchased_items: [] }
      );
    }

    const { data: existingReview } = await supabase
      .from("product_reviews")
      .select("id")
      .eq("product_id", product.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingReview) {
      return NextResponse.json(
        { can_review: false, has_reviewed: true, purchased_items: [] }
      );
    }

    const { data: deliveredOrders } = await supabase
      .from("orders")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "delivered");

    if (!deliveredOrders || deliveredOrders.length === 0) {
      return NextResponse.json(
        { can_review: false, has_reviewed: false, purchased_items: [] }
      );
    }

    const orderIds = deliveredOrders.map((o) => o.id);

    const { data: orderItems } = await supabase
      .from("order_items")
      .select("id, product_id, product_name, thumbnail")
      .in("order_id", orderIds)
      .eq("product_id", product.id);

    if (!orderItems || orderItems.length === 0) {
      return NextResponse.json(
        { can_review: false, has_reviewed: false, purchased_items: [] }
      );
    }

    const orderItemIds = orderItems.map((oi) => oi.id);

    const { data: components } = await supabase
      .from("order_item_components")
      .select("order_item_id, variant_name, component_group")
      .in("order_item_id", orderItemIds);

    const componentsByItem = new Map<
      string,
      Array<{ variant_name: string; component_group: string }>
    >();
    for (const c of components ?? []) {
      if (!c.order_item_id) continue;
      const arr = componentsByItem.get(c.order_item_id) ?? [];
      arr.push({
        variant_name: c.variant_name,
        component_group: c.component_group,
      });
      componentsByItem.set(c.order_item_id, arr);
    }

    const purchasedItems: PurchasedItem[] = orderItems.map((oi) => {
      const comps = componentsByItem.get(oi.id) ?? [];
      const variantSummary =
        comps.length > 0
          ? comps.map((c) => `${c.component_group}: ${c.variant_name}`).join(", ")
          : oi.product_name;

      return {
        product_name: oi.product_name,
        thumbnail: oi.thumbnail,
        variant_summary: variantSummary,
      };
    });

    return NextResponse.json({
      can_review: true,
      has_reviewed: false,
      purchased_items: purchasedItems,
    } satisfies PurchaseCheckResponse);
  } catch (err) {
    console.error("[purchase-check] unexpected error:", err);
    return NextResponse.json(
      { can_review: false, has_reviewed: false, purchased_items: [] }
    );
  }
}
