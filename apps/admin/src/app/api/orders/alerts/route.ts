import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { advanceOrderAlertCursor, parseOrderAlertCursor } from "@/lib/order-alerts";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await client.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const raw = request.nextUrl.searchParams.get("cursor");
  const cursor = raw ? parseOrderAlertCursor(raw) : null;
  if (raw && !cursor) return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
  let query = getAdminClient().from("orders")
    .select("id, order_number, total_price, created_at")
    .or("is_quick_order.is.null,is_quick_order.eq.false");
  if (cursor) {
    query = query.or(`created_at.gt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.gt.${cursor.id})`)
      .order("created_at").order("id").limit(100);
  } else {
    query = query.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(1);
  }
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Unable to check new orders" }, { status: 503 });
  const orders = (data ?? []).filter((order): order is typeof order & { created_at: string } => order.created_at !== null);
  return NextResponse.json({
    orders: cursor ? orders : [],
    cursor: advanceOrderAlertCursor(orders) ?? cursor ?? {
      createdAt: "1970-01-01T00:00:00.000Z", id: "00000000-0000-0000-0000-000000000000",
    },
  }, { headers: { "Cache-Control": "private, no-store" } });
}
