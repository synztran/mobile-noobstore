import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buyNowServer } from "@/modules/auction/server/buy-now";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
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
        { success: false, code: "unauthenticated", error: "Vui lòng đăng nhập để mua ngay" },
        { status: 401 }
      );
    }

    const result = await buyNowServer(id, user.id);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/auctions/[id]/buy-now] error:", err);
    return NextResponse.json(
      { success: false, code: "server_error", error: "Lỗi hệ thống khi mua ngay" },
      { status: 500 }
    );
  }
}
