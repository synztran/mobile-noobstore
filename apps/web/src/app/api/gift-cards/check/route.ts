import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const code = req.nextUrl.searchParams.get("code")?.trim() ?? "";
  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("gift_cards")
      .select("code, points_value, is_active, expires_at, redeemed_by_user_id, issued_to_user_id")
      .ilike("code", code)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Không tìm thấy thẻ quà tặng" }, { status: 404 });
    }
    if (!data.is_active) {
      return NextResponse.json({ error: "Thẻ quà tặng này đã bị vô hiệu hóa" }, { status: 400 });
    }
    if (data.redeemed_by_user_id) {
      return NextResponse.json({ error: "Thẻ quà tặng này đã được sử dụng" }, { status: 409 });
    }
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ error: "Thẻ quà tặng này đã hết hạn" }, { status: 400 });
    }
    if (!data.issued_to_user_id) {
      return NextResponse.json({ error: "Không tìm thấy thẻ quà tặng" }, { status: 404 });
    }
    if (data.issued_to_user_id !== user.id) {
      return NextResponse.json({ error: "Thẻ quà tặng này không thuộc về bạn" }, { status: 403 });
    }

    return NextResponse.json({
      code: data.code,
      pointsValue: data.points_value,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi kiểm tra thẻ quà tặng" },
      { status: 500 }
    );
  }
}
