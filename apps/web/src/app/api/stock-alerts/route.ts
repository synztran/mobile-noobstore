import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { product_id, variant_id } = await req.json();
    if (!product_id) {
      return NextResponse.json(
        { error: "product_id is required" },
        { status: 400 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("stock_alert_subscriptions")
      .insert({
        user_id: user.id,
        product_id,
        variant_id: variant_id ?? null,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ message: "Already subscribed" });
      }
      throw error;
    }

    return NextResponse.json({ message: "Subscribed" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { product_id, variant_id } = await req.json();
    if (!product_id) {
      return NextResponse.json(
        { error: "product_id is required" },
        { status: 400 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from("stock_alert_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", product_id);

    if (variant_id) {
      query = query.eq("variant_id", variant_id);
    } else {
      query = query.is("variant_id", null);
    }

    const { error } = await query;

    if (error) throw error;

    return NextResponse.json({ message: "Unsubscribed" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ subscriptions: [] });
    }

    const product_id = req.nextUrl.searchParams.get("product_id");
    const variant_id = req.nextUrl.searchParams.get("variant_id");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from("stock_alert_subscriptions")
      .select("id, product_id, variant_id, notified_at, created_at")
      .eq("user_id", user.id);

    if (product_id) query = query.eq("product_id", product_id);
    if (variant_id && variant_id !== "undefined") {
      query = query.eq("variant_id", variant_id);
    } else {
      query = query.is("variant_id", null);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;

    return NextResponse.json({ subscriptions: data ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
