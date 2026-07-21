import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = getAdminClient();
    const page = Math.max(
      1,
      parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10),
    );
    const PAGE_SIZE = 20;
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error, count } = await (supabase as any)
      .from("stock_alert_subscriptions")
      .select(
        `
        id,
        user_id,
        product_id,
        variant_id,
        notified_at,
        created_at,
        users!stock_alert_subscriptions_user_id_fkey(email, first_name, last_name),
        products!stock_alert_subscriptions_product_id_fkey(name, slug, thumbnail)
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return NextResponse.json({
      subscriptions: data ?? [],
      count: count ?? 0,
      page,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
