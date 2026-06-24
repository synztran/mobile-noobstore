import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redeemGiftCard } from "@/lib/points/service";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { code: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const code = (body.code ?? "").trim();
  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  const admin = getAdminClient();

  try {
    const result = await redeemGiftCard(admin, user.id, code);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    const errorMap: Record<string, [string, number]> = {
      GIFT_CARD_NOT_FOUND: ["Không tìm thấy thẻ quà tặng", 404],
      GIFT_CARD_INACTIVE: ["Thẻ quà tặng này đã bị vô hiệu hóa", 400],
      GIFT_CARD_ALREADY_REDEEMED: ["Thẻ quà tặng này đã được sử dụng", 409],
      GIFT_CARD_EXPIRED: ["Thẻ quà tặng này đã hết hạn", 400],
      GIFT_CARD_NOT_YOURS: ["Thẻ quà tặng này không thuộc về bạn", 403],
    };

    for (const [key, [friendlyMsg, status]] of Object.entries(errorMap)) {
      if (msg.includes(key)) {
        return NextResponse.json({ error: friendlyMsg }, { status });
      }
    }

    console.error("[gift-cards/redeem] unexpected error:", err);
    return NextResponse.json(
      { error: "Nạp thẻ thất bại, vui lòng thử lại sau" },
      { status: 500 }
    );
  }
}
