import { getAdminClient } from "@/lib/supabase/admin";
import { parseAuctionProductDetails } from "@/lib/auction-product-details";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getAdminClient();

  const { data: auction, error } = await (supabase as any)
    .from("auction_products")
    .select(`
      *,
      product:products (
        id, name, slug, thumbnail, base_price, brand, description
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !auction) {
    return NextResponse.json({ error: "Không tìm thấy phiên đấu giá" }, { status: 404 });
  }

  // Get all bids
  const { data: bids } = await (supabase as any)
    .from("auction_bids")
    .select(`
      *,
      user:users(id, email, first_name, last_name)
    `)
    .eq("auction_id", id)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    auction: {
      ...auction,
      starting_price: Number(auction.starting_price),
      bin_price: auction.bin_price ? Number(auction.bin_price) : null,
      increment_value: Number(auction.increment_value),
      current_price: Number(auction.current_price),
    },
    bids: bids ?? [],
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const supabase = getAdminClient();

  if (body.current_price !== undefined || body.current_winner_id !== undefined || body.order_id !== undefined || body.winner_deadline !== undefined) {
    return NextResponse.json({ error: "Không thể cập nhật trực tiếp trạng thái thanh toán hoặc người thắng" }, { status: 400 });
  }

  const { data: existing, error: existingError } = await (supabase as any)
    .from("auction_products")
    .select("starts_at, ends_at")
    .eq("id", id)
    .maybeSingle();
  if (existingError || !existing) return NextResponse.json({ error: "Không tìm thấy phiên đấu giá" }, { status: 404 });

  const {
    is_featured,
    status,
    bin_price,
    ends_at,
    starts_at,
    anti_snipe_minutes,
    winner_checkout_hours,
    max_winner_cascades,
    required_customer_level,
    required_order_count,
    limit_bids_per_user,
    max_bids_per_user,
  } = body;

  const updates: Record<string, any> = {};
  const pricingFields = ["starting_price", "increment_type", "increment_value"] as const;
  const hasLockedPricingEdit = pricingFields.some((field) => body[field] !== undefined);
  if (hasLockedPricingEdit) {
    for (const field of pricingFields) {
      if (body[field] === undefined) continue;
      if (field === "increment_type") {
        if (!["fixed", "percentage"].includes(body[field])) {
          return NextResponse.json({ error: "Loại bước giá không hợp lệ" }, { status: 400 });
        }
      } else {
        const value = Number(body[field]);
        if (!Number.isFinite(value) || value <= 0) {
          return NextResponse.json({ error: "Giá và bước giá phải là số dương hợp lệ" }, { status: 400 });
        }
        updates[field] = value;
      }
      if (field === "increment_type") updates[field] = body[field];
    }
  }
  if (bin_price !== undefined) {
    if (bin_price === null || bin_price === "") updates.bin_price = null;
    else {
      const value = Number(bin_price);
      if (!Number.isFinite(value) || value <= 0) {
        return NextResponse.json({ error: "Giá mua ngay phải là số dương hợp lệ" }, { status: 400 });
      }
      updates.bin_price = value;
    }
  }
  if (required_customer_level !== undefined || required_order_count !== undefined || max_bids_per_user !== undefined) {
    for (const [field, value] of Object.entries({ required_customer_level, required_order_count })) {
      if (value === undefined) continue;
      const numeric = Number(value);
      if (!Number.isInteger(numeric) || numeric < 0) {
        return NextResponse.json({ error: "Điều kiện đấu giá phải là số nguyên không âm" }, { status: 400 });
      }
      updates[field] = numeric;
    }
  }
  if (limit_bids_per_user !== undefined && typeof limit_bids_per_user !== "boolean") {
    return NextResponse.json({ error: "Giới hạn lượt bid không hợp lệ" }, { status: 400 });
  }
  if (limit_bids_per_user !== undefined) {
    updates.limit_bids_per_user = Boolean(limit_bids_per_user);
    if (limit_bids_per_user) {
      const value = Number(max_bids_per_user);
      if (!Number.isInteger(value) || value <= 0) {
        return NextResponse.json({ error: "Số lượt đấu giá tối đa phải là số nguyên dương" }, { status: 400 });
      }
      updates.max_bids_per_user = value;
    } else updates.max_bids_per_user = null;
  }
  if (body.product_details !== undefined) {
    const productDetails = body.product_details === null
      ? null
      : parseAuctionProductDetails(body.product_details);
    if (body.product_details !== null && !productDetails) {
      return NextResponse.json({ error: "Thông tin chi tiết sản phẩm không hợp lệ" }, { status: 400 });
    }
    updates.product_details = productDetails;
  }
  if (is_featured !== undefined) {
    if (typeof is_featured !== "boolean") return NextResponse.json({ error: "Giá trị nổi bật không hợp lệ" }, { status: 400 });
    updates.is_featured = is_featured;
  }
  if (status !== undefined) {
    if (typeof status !== "string" || !["draft", "active", "ended", "cancelled"].includes(status)) return NextResponse.json({ error: "Trạng thái phiên đấu giá không hợp lệ" }, { status: 400 });
    updates.status = status;
  }
  for (const [field, value] of Object.entries({ starts_at, ends_at })) {
    if (value === undefined) continue;
    if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return NextResponse.json({ error: "Thời gian phiên đấu giá không hợp lệ" }, { status: 400 });
    updates[field] = new Date(value).toISOString();
  }
  const resultingStart = updates.starts_at ?? existing.starts_at;
  const resultingEnd = updates.ends_at ?? existing.ends_at;
  if (!Number.isFinite(Date.parse(resultingStart)) || !Number.isFinite(Date.parse(resultingEnd)) || Date.parse(resultingEnd) <= Date.parse(resultingStart)) {
    return NextResponse.json({ error: "Thời gian kết thúc phải sau thời gian bắt đầu" }, { status: 400 });
  }
  for (const [field, value, min] of [["anti_snipe_minutes", anti_snipe_minutes, 0], ["winner_checkout_hours", winner_checkout_hours, 1], ["max_winner_cascades", max_winner_cascades, 0]] as const) {
    if (value === undefined) continue;
    const numeric = Number(value);
    if (!Number.isInteger(numeric) || numeric < min) return NextResponse.json({ error: "Cấu hình thời gian và cascade không hợp lệ" }, { status: 400 });
    updates[field] = numeric;
  }
  if (updates.bin_price != null && updates.starting_price !== undefined && updates.bin_price <= updates.starting_price) {
    return NextResponse.json({ error: "Giá mua ngay (BIN) phải lớn hơn giá khởi điểm" }, { status: 400 });
  }

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "Không có thông tin cập nhật" }, { status: 400 });
  updates.updated_at = new Date().toISOString();

  const { data, error } = await (supabase as any).rpc("admin_update_auction", {
    p_auction_id: id,
    p_updates: updates,
    p_check_price_lock: hasLockedPricingEdit,
  });

  if (error) {
    if (error.message?.includes("auction_price_edit_forbidden")) {
      return NextResponse.json({ code: "AUCTION_PRICE_EDIT_FORBIDDEN", error: "Không thể thay đổi giá khi phiên đấu giá đã có lượt đặt giá hoặc đang diễn ra" }, { status: 409 });
    }
    if (error.message?.includes("auction_not_found")) return NextResponse.json({ error: "Không tìm thấy phiên đấu giá" }, { status: 404 });
    if (error.message?.includes("auction_schedule_invalid")) return NextResponse.json({ error: "Thời gian kết thúc phải sau thời gian bắt đầu" }, { status: 400 });
    if (error.message?.includes("auction_edit_value_invalid")) return NextResponse.json({ error: "Giá trị cập nhật phiên đấu giá không hợp lệ" }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, auction: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getAdminClient();

  // If bids exist, do not hard-delete, mark cancelled instead
  const { count } = await (supabase as any)
    .from("auction_bids")
    .select("id", { count: "exact", head: true })
    .eq("auction_id", id);

  if ((count ?? 0) > 0) {
    const { error } = await (supabase as any)
      .from("auction_products")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: "Phiên đấu giá đã có lượt bid nên được chuyển sang trạng thái đã hủy." });
  }

  const { error } = await (supabase as any)
    .from("auction_products")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
