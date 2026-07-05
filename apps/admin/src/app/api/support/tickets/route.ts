import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCache, setCache } from "@/lib/redis/cache";
import { NextRequest, NextResponse } from "next/server";

const TTL = 300;

export async function GET(req: NextRequest) {
  try {
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

    const sp = req.nextUrl.searchParams;
    const cacheKey = `admin-support-tickets:${sp.toString()}`;

    const cached = await getCache<Record<string, unknown>>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const supabase = getAdminClient();
    const sb = supabase as any;

    const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(sp.get("limit") ?? "20", 10) || 20));
    const offset = (page - 1) * limit;
    const statusFilter = sp.get("status");
    const q = sp.get("q")?.trim() || "";

    let countQuery = sb
      .from("support_tickets")
      .select("*", { count: "exact", head: true });

    let dataQuery = sb
      .from("support_tickets")
      .select("id, subject, category, status, created_at, updated_at, resolved_at, order_id, user_id")
      .order("created_at", { ascending: false });

    if (statusFilter && ["open", "in_progress", "resolved", "closed"].includes(statusFilter)) {
      countQuery = countQuery.eq("status", statusFilter);
      dataQuery = dataQuery.eq("status", statusFilter);
    }

    if (q) {
      countQuery = countQuery.or(`subject.ilike.%${q}%,id.ilike.%${q}%`);
      dataQuery = dataQuery.or(`subject.ilike.%${q}%,id.ilike.%${q}%`);
    }

    const { count, error: countError } = await countQuery;
    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    const { data: tickets, error: dataError } = await dataQuery.range(offset, offset + limit - 1);

    if (dataError) {
      return NextResponse.json({ error: dataError.message }, { status: 500 });
    }

    const { data: attachments } = await sb
      .from("ticket_attachments")
      .select("ticket_id, id")
      .in("ticket_id", (tickets ?? []).map((t: any) => t.id));

    const attachCountMap: Record<string, number> = {};
    for (const a of attachments ?? []) {
      attachCountMap[a.ticket_id] = (attachCountMap[a.ticket_id] ?? 0) + 1;
    }

    const result = {
      tickets: (tickets ?? []).map((t: any) => ({
        ...t,
        attachment_count: attachCountMap[t.id] ?? 0,
      })),
      total: count ?? 0,
      page,
      limit,
      total_pages: count ? Math.ceil(count / limit) : 0,
    };

    await setCache(cacheKey, result, TTL);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[admin support] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
