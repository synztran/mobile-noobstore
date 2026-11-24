import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkoutAuctionServer } from "@/modules/auction/server/checkout";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, code: "unauthenticated", error: "Vui lòng đăng nhập" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body?.deliveryAddress) {
      return NextResponse.json(
        { success: false, code: "missing_address", error: "Vui lòng cung cấp địa chỉ nhận hàng" },
        { status: 400 }
      );
    }

    const result = await checkoutAuctionServer({
      auctionId: id,
      userId: user.id,
      deliveryAddress: body.deliveryAddress,
      paymentType: body.paymentType,
      shippingFee: body.shippingFee,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/auctions/[id]/checkout] error:", err);
    return NextResponse.json(
      { success: false, code: "server_error", error: "Lỗi hệ thống khi tạo đơn hàng" },
      { status: 500 }
    );
  }
}
