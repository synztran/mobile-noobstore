import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ subscribed: false });
    }

    const product_id = req.nextUrl.searchParams.get("product_id");
    const variant_id = req.nextUrl.searchParams.get("variant_id");

    if (!product_id) {
      return NextResponse.json(
        { error: "product_id is required" },
        { status: 400 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from("stock_alert_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", product_id);

    if (variant_id && variant_id !== "undefined") {
      query = query.eq("variant_id", variant_id);
    } else {
      query = query.is("variant_id", null);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;

    return NextResponse.json({ subscribed: !!data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
