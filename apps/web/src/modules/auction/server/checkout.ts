import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";

export interface AuctionCheckoutInput {
  auctionId: string;
  userId: string;
  deliveryAddress: {
    fullName: string;
    phoneNumber: string;
    address: string;
    city: string;
    district: string;
    ward: string;
  };
  paymentType?: "bank_transfer" | "cod";
  shippingFee?: number;
}

export async function checkoutAuctionServer(input: AuctionCheckoutInput): Promise<{
  success: boolean;
  order_id?: string;
  order_number?: string;
  error?: string;
  code?: string;
}> {
  const supabase = getAdminClient();
  const { auctionId, userId, deliveryAddress, paymentType = "bank_transfer", shippingFee = 0 } = input;

  // 1. Fetch & lock auction
  const { data: auction, error: fetchErr } = await (supabase as any)
    .from("auction_products")
    .select(`
      id, product_id, current_price, current_winner_id, status, winner_deadline, order_id,
      product:products(name, thumbnail)
    `)
    .eq("id", auctionId)
    .maybeSingle();

  if (fetchErr || !auction) {
    return { success: false, code: "auction_not_found", error: "Không tìm thấy phiên đấu giá" };
  }

  if (auction.status !== "ended") {
    return { success: false, code: "auction_not_ended", error: "Phiên đấu giá chưa kết thúc" };
  }

  if (auction.current_winner_id !== userId) {
    return { success: false, code: "not_the_winner", error: "Bạn không phải là người chiến thắng phiên này" };
  }

  if (auction.order_id) {
    return { success: false, code: "already_ordered", error: "Đơn hàng cho phiên đấu giá này đã được tạo" };
  }

  if (auction.winner_deadline && new Date(auction.winner_deadline) < new Date()) {
    return { success: false, code: "deadline_expired", error: "Thời hạn thanh toán cho phiên đấu giá đã kết thúc" };
  }

  const orderId = crypto.randomUUID();
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const orderNumber = `AUC-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
  const totalPrice = Number(auction.current_price) + (shippingFee || 0);

  // 2. Insert order
  const { error: orderErr } = await (supabase as any).from("orders").insert({
    id: orderId,
    order_number: orderNumber,
    user_id: userId,
    status: "pending_payment",
    total_price: totalPrice,
    shipping_fee: shippingFee,
    payment_type: paymentType,
    delivery_address: deliveryAddress,
  });

  if (orderErr) {
    console.error("[auction/checkout] order insert error:", orderErr);
    return { success: false, code: "order_creation_failed", error: "Không thể tạo đơn hàng, vui lòng thử lại" };
  }

  // 3. Insert order_items
  const { error: itemErr } = await (supabase as any).from("order_items").insert({
    id: crypto.randomUUID(),
    order_id: orderId,
    product_id: auction.product_id,
    product_name: auction.product?.name ?? "Sản phẩm đấu giá",
    thumbnail: auction.product?.thumbnail ?? null,
    quantity: 1,
    unit_price: Number(auction.current_price),
  });

  if (itemErr) {
    console.error("[auction/checkout] item insert error:", itemErr);
  }

  // 4. Update auction_products with order_id
  await (supabase as any)
    .from("auction_products")
    .update({ order_id: orderId, updated_at: new Date().toISOString() })
    .eq("id", auctionId);

  return {
    success: true,
    order_id: orderId,
    order_number: orderNumber,
  };
}
