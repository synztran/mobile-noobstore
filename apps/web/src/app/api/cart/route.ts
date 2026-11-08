import { sendStaleCartReminder } from "@/modules/cart/server/reminders";
import {
  clearCart,
  getActiveCartId,
  getCartItems,
} from "@/modules/cart/server/service";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { hasUsableSessionCookie } from "@/lib/auth/session-cookie";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!hasUsableSessionCookie(req.cookies.getAll())) {
    return NextResponse.json({ cart_id: null, items: [] });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ cart_id: null, items: [] });
    }

    const activeCartId = await getActiveCartId(supabase, user.id);

    if (!activeCartId) {
      return NextResponse.json({ cart_id: null, items: [] });
    }

    const items = await getCartItems(supabase, activeCartId);

    void sendStaleCartReminder(supabase, activeCartId, user.id);

    return NextResponse.json({ cart_id: activeCartId, items });
  } catch (err) {
    console.error("[cart/GET] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sp = req.nextUrl.searchParams;
    const cartId = sp.get("cart_id")?.trim();

    if (!cartId) {
      return NextResponse.json(
        { error: "cart_id is required" },
        { status: 400 }
      );
    }

    const { data: cart, error: cartError } = await supabase
      .from("carts")
      .select("id")
      .eq("id", cartId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (cartError) throw new Error(cartError.message);
    if (!cart) return NextResponse.json({ error: "Cart not found" }, { status: 404 });

    await clearCart(supabase, cart.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[cart/DELETE] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
