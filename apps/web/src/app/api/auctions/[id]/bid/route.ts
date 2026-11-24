import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { placeBidServer } from "@/modules/auction/server/place-bid";

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
        { success: false, code: "unauthenticated", error: "Vui lòng đăng nhập để đặt giá" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const amount = Number(body?.amount);

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, code: "invalid_amount", error: "Mức giá đặt không hợp lệ" },
        { status: 400 }
      );
    }

    const result = await placeBidServer(id, user.id, amount);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/auctions/[id]/bid] error:", err);
    return NextResponse.json(
      { success: false, code: "server_error", error: "Lỗi hệ thống khi đặt giá" },
      { status: 500 }
    );
  }
}
