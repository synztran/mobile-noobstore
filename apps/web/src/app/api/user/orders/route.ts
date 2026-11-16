import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface OrderSummaryProduct {
  id?: string;
  product_id?: string | null;
  product_slug?: string | null;
  name: string;
  variant: string | null;
  quantity: number;
  thumbnail: string | null;
  has_reviewed?: boolean;
  reviewed_rating?: number | null;
  reviewed_comment?: string | null;
}

export interface OrderSummary {
  id: string;
  order_number: string;
  status: string;
  total_price: number;
  item_count: number;
  service_line_count: number;
  product_summaries: OrderSummaryProduct[];
  created_at: string;
  voucher_code: string | null;
  voucher_discount_amount: number;
  shipping_discount_amount: number;
  has_reviewed?: boolean;
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
  "first_paid",
  "second_paid",
  "preparing",
  "shipped",
  "delivering",
  "delivered",
  "returning",
  "cancelled",
  "refunded",
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
        "id, order_number, status, total_price, voucher_code, voucher_discount_amount, shipping_discount_amount, order_items(id, quantity, product_name, thumbnail, product_id), order_services(count), created_at",
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
        order_items: Array<{
          id: string;
          quantity: number;
          product_name: string;
          thumbnail: string | null;
          product_id: string | null;
        }>;
        order_services: Array<{ count: number }>;
        created_at: string;
      }> | null;
      error: { message: string } | null;
      count: number | null;
    };

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const orderItems = (data ?? []).flatMap(
      (row) => row.order_items ?? []
    );
    const orderItemIds = orderItems.map((item) => item.id);
    const productIds = Array.from(
      new Set(
        orderItems
          .map((item) => item.product_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    let productMap = new Map<
      string,
      { slug: string; thumbnail: string | null }
    >();
    let reviewMap = new Map<
      string,
      { rating: number; body: string | null; criteria?: unknown }
    >();

    if (productIds.length > 0) {
      const [{ data: prodRows }, { data: reviewRows }] = await Promise.all([
        supabase
          .from("products")
          .select("id, slug, thumbnail")
          .in("id", productIds),
        supabase
          .from("product_reviews")
          .select("product_id, rating, body")
          .eq("user_id", user.id)
          .in("product_id", productIds),
      ]);

      if (prodRows) {
        productMap = new Map(
          prodRows.map((p) => [
            p.id,
            { slug: p.slug, thumbnail: p.thumbnail },
          ])
        );
      }
      if (reviewRows) {
        reviewMap = new Map(
          reviewRows.map((r) => [
            r.product_id,
            { rating: Number(r.rating), body: r.body ?? null },
          ])
        );
      }
    }

    const variantNamesByItemId = new Map<string, string[]>();
    if (orderItemIds.length > 0) {
      const { data: components } = await supabase
        .from("order_item_components")
        .select("order_item_id, variant_name")
        .in("order_item_id", orderItemIds);
      for (const component of components ?? []) {
        if (!component.order_item_id || !component.variant_name) continue;
        const names = variantNamesByItemId.get(component.order_item_id) ?? [];
        names.push(component.variant_name);
        variantNamesByItemId.set(component.order_item_id, names);
      }
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
      item_count:
        row.order_items?.reduce((sum, item) => sum + (item.quantity ?? 0), 0) ??
        0,
      service_line_count: row.order_services?.[0]?.count ?? 0,
      product_summaries: (row.order_items ?? []).map((item) => {
        const prod = item.product_id ? productMap.get(item.product_id) : null;
        const review = item.product_id ? reviewMap.get(item.product_id) : null;
        return {
          id: item.id,
          product_id: item.product_id ?? null,
          product_slug: prod?.slug ?? null,
          name: item.product_name,
          variant: variantNamesByItemId.get(item.id)?.join(", ") ?? null,
          quantity: item.quantity,
          thumbnail: item.thumbnail || prod?.thumbnail || null,
          has_reviewed: Boolean(review),
          reviewed_rating: review ? review.rating : null,
          reviewed_comment: review ? review.body : null,
        };
      }),
      has_reviewed:
        (row.order_items ?? []).length > 0 &&
        (row.order_items ?? []).every(
          (item) => item.product_id && reviewMap.has(item.product_id)
        ),
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
