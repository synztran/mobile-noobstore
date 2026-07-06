import { restoreOrderStock } from "@/lib/services/orderService";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const reason = (body?.reason ?? "").trim().slice(0, 500);

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, status, order_number")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch order" },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const cancellable = ["pending", "confirmed"];
    if (!cancellable.includes(order.status)) {
      return NextResponse.json(
        {
          error:
            "Đơn hàng không thể hủy. Chỉ hủy được đơn hàng ở trạng thái chờ xác nhận hoặc đã xác nhận.",
        },
        { status: 400 }
      );
    }

    // Restore stock BEFORE updating status — guard checks old status
    try {
      await restoreOrderStock(id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.error(
        `[cancel order] Failed to restore stock for order ${id}: ${msg}`
      );
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_note: reason || "Không cung cấp lí do",
      })
      .eq("id", id);

    if (updateError) {
      console.error("[cancel order] update error:", updateError);
      return NextResponse.json(
        { error: "Không thể hủy đơn hàng. Vui lòng thử lại." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[cancel order] error:", error);
    return NextResponse.json(
      { error: "Failed to cancel order" },
      { status: 500 }
    );
  }
}
