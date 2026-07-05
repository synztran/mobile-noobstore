import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function fetchTicket(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Unauthorized", status: 401 };
  }

  const sb = supabase as any;

  const { data: ticket, error: ticketError } = await sb
    .from("support_tickets")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (ticketError) {
    if (
      ticketError.message?.includes?.("Could not find") ||
      ticketError.message?.includes?.("schema cache")
    ) {
      return {
        error:
          "Hệ thống hỗ trợ chưa được khởi tạo. Vui lòng thử lại sau ít phút hoặc liên hệ quản trị viên.",
        status: 503,
      };
    }
    return { error: ticketError.message, status: 500 };
  }
  if (!ticket) {
    return { error: "Ticket not found", status: 404 };
  }
  if (ticket.user_id !== user.id) {
    return { error: "Forbidden", status: 403 };
  }

  let orderNumber: string | null = null;
  if (ticket.order_id) {
    const { data: order } = await supabase
      .from("orders")
      .select("order_number")
      .eq("id", ticket.order_id)
      .maybeSingle();
    orderNumber = (order as { order_number: string } | null)?.order_number ?? null;
  }

  let orderItem: Record<string, unknown> | null = null;
  if (ticket.order_item_id) {
    const { data: item } = await supabase
      .from("order_items")
      .select("id, product_id, product_name, unit_price, quantity, thumbnail")
      .eq("id", ticket.order_item_id)
      .maybeSingle();
    if (item) {
      const { data: components } = await supabase
        .from("order_item_components")
        .select("variant_name, component_group, price_adjustment, thumbnail")
        .eq("order_item_id", ticket.order_item_id);
      orderItem = { ...item, components: components ?? [] };
    }
  }

  const { data: attachments } = await sb
    .from("ticket_attachments")
    .select("id, file_url, file_name, mime_type, created_at")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  return {
    data: {
      ...ticket,
      order_order_number: orderNumber,
      order_item: orderItem,
      attachments: attachments ?? [],
    },
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });
    }

    const result = await fetchTicket(id);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
    }
    return NextResponse.json(result.data);
  } catch (err) {
    console.error("[support] GET detail error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
