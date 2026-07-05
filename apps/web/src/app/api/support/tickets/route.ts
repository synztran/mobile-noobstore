import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const subject = (formData.get("subject") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || "";
    const category = (formData.get("category") as string) || "other";
    const orderId = (formData.get("order_id") as string)?.trim() || "";
    const orderItemId = (formData.get("order_item_id") as string)?.trim() || null;
    const files = formData.getAll("files") as File[];

    if (!subject || subject.length < 3) {
      return NextResponse.json({ error: "Subject must be at least 3 characters" }, { status: 400 });
    }

    const validCategories = ["defective", "wrong_item", "missing_item", "shipping", "other"];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const sb = supabase as any;

    const { data: ticket, error: ticketError } = await sb
      .from("support_tickets")
      .insert({
        user_id: user.id,
        order_id: orderId,
        order_item_id: orderItemId,
        subject,
        description,
        category,
        status: "open",
      })
      .select("id")
      .single();

    if (ticketError) {
      if (
        ticketError.message?.includes?.("Could not find") ||
        ticketError.message?.includes?.("schema cache") ||
        ticketError.message?.includes?.("does not exist")
      ) {
        return NextResponse.json(
          { error: "Hệ thống hỗ trợ chưa được khởi tạo. Vui lòng thử lại sau ít phút hoặc liên hệ quản trị viên." },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: ticketError.message }, { status: 500 });
    }

    if (files.length > 0) {
      const uploadResults = [];
      for (const file of files) {
        if (file.size === 0) continue;
        const ext = file.name.split(".").pop() || "jpg";
        const filePath = `${user.id}/${ticket.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("ticket-attachments")
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false,
          });
        if (uploadError) {
          continue;
        }
        const { data: urlData } = supabase.storage
          .from("ticket-attachments")
          .getPublicUrl(filePath);
        uploadResults.push({
          ticket_id: ticket.id,
          file_url: urlData.publicUrl,
          file_name: file.name || "unknown",
          file_size: file.size,
          mime_type: file.type || "image/jpeg",
        });
      }
      if (uploadResults.length > 0) {
        const { error: attachError } = await sb.from("ticket_attachments").insert(uploadResults);
        if (attachError) {
          console.error("[support] attachment insert error:", attachError);
        }
      }
    }

    return NextResponse.json({ id: ticket.id });
  } catch (err) {
    console.error("[support] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(sp.get("limit") ?? "20", 10) || 20));
    const offset = (page - 1) * limit;
    const statusFilter = sp.get("status");

    const sb = supabase as any;

    let query = sb
      .from("support_tickets")
      .select("id, subject, category, status, created_at, updated_at, resolved_at, order_id", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (statusFilter && ["open", "in_progress", "resolved", "closed"].includes(statusFilter)) {
      query = query.eq("status", statusFilter);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      if (
        error.message?.includes?.("Could not find") ||
        error.message?.includes?.("schema cache")
      ) {
        return NextResponse.json(
          { error: "Hệ thống hỗ trợ chưa được khởi tạo. Vui lòng thử lại sau ít phút hoặc liên hệ quản trị viên." },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      tickets: data ?? [],
      total: count ?? 0,
      page,
      limit,
      total_pages: count ? Math.ceil(count / limit) : 0,
    });
  } catch (err) {
    console.error("[support] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
