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
    // Pre-check: card must exist, be un-redeemed, and be assigned to a user.
    // The DB RPC also enforces this, but this guards unassigned cards even if
    // the remote schema hasn't been migrated yet.
    const { data: card } = await admin
      .from("gift_cards")
      .select("id, issued_to_user_id, redeemed_by_user_id, is_active")
      .ilike("code", code)
      .maybeSingle();

    if (!card) {
      return NextResponse.json(
        { error: "Không tìm thấy thẻ quà tặng" },
        { status: 404 }
      );
    }
    if (!card.issued_to_user_id) {
      return NextResponse.json(
        { error: "Không tìm thấy thẻ quà tặng" },
        { status: 404 }
      );
    }
    if (card.issued_to_user_id !== user.id) {
      return NextResponse.json(
        { error: "Thẻ quà tặng này không thuộc về bạn" },
        { status: 403 }
      );
    }
    if (card.redeemed_by_user_id) {
      return NextResponse.json(
        { error: "Thẻ quà tặng này đã được sử dụng" },
        { status: 409 }
      );
    }
    if (!card.is_active) {
      return NextResponse.json(
        { error: "Thẻ quà tặng này đã bị vô hiệu hóa" },
        { status: 400 }
      );
    }

    const result = await redeemGiftCard(admin, user.id, code);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    const errorMap: Record<string, [string, number]> = {
      GIFT_CARD_NOT_FOUND: ["Không tìm thấy thẻ quà tặng", 404],
      GIFT_CARD_INACTIVE: ["Thẻ quà tặng này đã bị vô hiệu hóa", 400],
      GIFT_CARD_ALREADY_REDEEMED: ["Thẻ quà tặng này đã được sử dụng", 409],
      GIFT_CARD_EXPIRED: ["Thẻ quà tặng này đã hết hạn", 400],
      GIFT_CARD_NOT_ASSIGNED: ["Không tìm thấy thẻ quà tặng", 404],
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
