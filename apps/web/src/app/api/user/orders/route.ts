import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface OrderSummary {
  id: string;
  order_number: string;
  status: string;
  total_price: number;
  item_count: number;
  service_line_count: number;
  created_at: string;
  voucher_code: string | null;
  voucher_discount_amount: number;
  shipping_discount_amount: number;
  /** NSP points earned for this order (only set for delivered orders) */
  points_earned?: number;
}

export interface OrdersPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}

export interface OrdersResponse {
  orders: OrderSummary[];
  total: number;
  pagination: OrdersPagination;
  status_counts: Record<string, number>;
}

const ALLOWED_STATUS_FILTERS = new Set([
  "pending",
  "paid",
  "confirmed",
  "preparing",
  "shipped",
  "delivering",
  "delivered",
  "cancelled",
]);

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const rawStatus = searchParams.get("status")?.trim().toLowerCase() ?? "";
    const statusFilter =
      rawStatus && ALLOWED_STATUS_FILTERS.has(rawStatus) ? rawStatus : null;
    const parsedPage = parseInt(searchParams.get("page") ?? "1", 10);
    const parsedLimit = parseInt(searchParams.get("limit") ?? "20", 10);
    const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(50, Math.max(1, parsedLimit))
      : 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("orders")
      .select(
        "id, order_number, status, total_price, voucher_code, voucher_discount_amount, shipping_discount_amount, order_items(count), order_services(count), created_at",
        {
          count: "exact",
        }
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (q) {
      query = query.ilike("order_number", `%${q}%`);
    }

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    // Lightweight per-status count query (no limit, only fetches status column)
    const { data: allStatusRows } = await supabase
      .from("orders")
      .select("status")
      .eq("user_id", user.id);

    const statusCounts = (allStatusRows ?? []).reduce<Record<string, number>>(
      (acc, row) => {
        acc[row.status] = (acc[row.status] ?? 0) + 1;
        return acc;
      },
      {}
    );
    statusCounts["all"] = Object.values(statusCounts).reduce(
      (s, v) => s + v,
      0
    );

    const { data, error, count } = (await (query as ReturnType<
      typeof query.range
    >)) as unknown as {
      data: Array<{
        id: string;
        order_number: string;
        status: string;
        total_price: number;
        voucher_code: string | null;
        voucher_discount_amount: number | string | null;
        shipping_discount_amount: number | string | null;
        order_items: Array<{ count: number }>;
        order_services: Array<{ count: number }>;
        created_at: string;
      }> | null;
      error: { message: string } | null;
      count: number | null;
    };

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Batch-fetch NSP points earned for delivered orders in this page
    const deliveredIds = (data ?? [])
      .filter((r) => r.status === "delivered")
      .map((r) => r.id);

    const pointsMap: Record<string, number> = {};
    if (deliveredIds.length > 0) {
      const { data: ptRows } = await supabase
        .from("point_transactions")
        .select("source_ref, delta")
        .eq("source_type", "order_delivered")
        .in("source_ref", deliveredIds);
      for (const pt of ptRows ?? []) {
        if (pt.source_ref) pointsMap[pt.source_ref] = pt.delta;
      }
    }

    const orders: OrderSummary[] = (data ?? []).map((row) => ({
      id: row.id,
      order_number: row.order_number,
      status: row.status,
      total_price: Number(row.total_price),
      item_count: row.order_items?.[0]?.count ?? 0,
      service_line_count: row.order_services?.[0]?.count ?? 0,
      created_at: row.created_at,
      voucher_code: row.voucher_code ?? null,
      voucher_discount_amount: Number(row.voucher_discount_amount ?? 0),
      shipping_discount_amount: Number(row.shipping_discount_amount ?? 0),
      ...(row.status === "delivered" && pointsMap[row.id] !== undefined
        ? { points_earned: pointsMap[row.id] }
        : {}),
    }));

    const totalOrders = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalOrders / limit));
    const pagination: OrdersPagination = {
      page,
      limit,
      total: totalOrders,
      total_pages: totalPages,
      has_next_page: page < totalPages,
      has_prev_page: page > 1,
    };

    return NextResponse.json({
      orders,
      total: totalOrders,
      pagination,
      status_counts: statusCounts,
    } satisfies OrdersResponse);
  } catch (err) {
    console.error("[orders] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
