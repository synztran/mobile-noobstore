import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function canUserReviewProduct(
  supabase: Supabase,
  userId: string,
  productId: string
): Promise<boolean> {
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "delivered");

  if (ordersError || !orders?.length) return false;

  const { data: purchasedItem, error: itemError } = await supabase
    .from("order_items")
    .select("id")
    .eq("product_id", productId)
    .in(
      "order_id",
      orders.map(({ id }) => id)
    )
    .limit(1)
    .maybeSingle();

  return !itemError && Boolean(purchasedItem);
}
