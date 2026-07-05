import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCache, setCache, invalidateCache, invalidateCacheByPattern } from "@/lib/redis/cache";
import { NextRequest, NextResponse } from "next/server";

const TTL = 300;

const STATUS_LABELS: Record<string, string> = {
  open: "Đã gửi",
  in_progress: "Đang xử lý",
  resolved: "Đã giải quyết",
  closed: "Đã đóng",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Ticket ID is required" },
        { status: 400 }
      );
    }

    const cacheKey = `admin-support-ticket:${id}`;
    const cached = await getCache<Record<string, unknown>>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await authClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = getAdminClient();
    const sb = supabase as any;

    const { data: ticket, error: ticketError } = await sb
      .from("support_tickets")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (ticketError) {
      return NextResponse.json({ error: ticketError.message }, { status: 500 });
    }
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
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

    let userFullName: string | null = null;
    let userEmail: string | null = null;
    if (ticket.user_id) {
      const { data: ticketUser } = await supabase
        .from("users")
        .select("full_name, email")
        .eq("id", ticket.user_id)
        .maybeSingle();
      userFullName = (ticketUser as { full_name: string | null } | null)?.full_name ?? null;
      userEmail = (ticketUser as { email: string | null } | null)?.email ?? null;
    }

    const { data: attachments } = await sb
      .from("ticket_attachments")
      .select("id, file_url, file_name, mime_type, created_at")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true });

    const result = {
      ...ticket,
      order_order_number: orderNumber,
      order_item: orderItem,
      user_full_name: userFullName,
      user_email: userEmail,
      attachments: attachments ?? [],
    };

    await setCache(cacheKey, result, TTL);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[admin support] GET detail error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Ticket ID is required" },
        { status: 400 }
      );
    }

    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await authClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = getAdminClient();
    const sb = supabase as any;

    const body = (await req.json()) as {
      status?: string;
      admin_notes?: string;
    };

    const updateData: Record<string, string | null> = {};
    if (
      body.status &&
      ["open", "in_progress", "resolved", "closed"].includes(body.status)
    ) {
      updateData.status = body.status;
      if (body.status === "resolved" || body.status === "closed") {
        updateData.resolved_at = new Date().toISOString();
      }
    }
    if (body.admin_notes !== undefined) {
      updateData.admin_notes = body.admin_notes;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { error: updateError } = await sb
      .from("support_tickets")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await Promise.all([
      invalidateCache(`admin-support-ticket:${id}`),
      invalidateCacheByPattern(`admin-support-tickets:*`),
    ]);

    if (body.status) {
      const { data: ticket } = await sb
        .from("support_tickets")
        .select("user_id, subject")
        .eq("id", id)
        .single();

      if (ticket) {
        await sb.from("user_notifications").insert({
          user_id: ticket.user_id,
          title: "Cập nhật yêu cầu hỗ trợ",
          body: `Yêu cầu "${ticket.subject}" đã chuyển sang trạng thái: ${STATUS_LABELS[body.status] ?? body.status}`,
          type: "support_status",
          deep_link: `/profile/support/${id}`,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin support] PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
