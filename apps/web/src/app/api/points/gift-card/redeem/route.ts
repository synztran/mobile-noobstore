import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CACHE_KEYS, invalidateCache } from "@/lib/redis/cache";
import { redeemGiftCard } from "@/lib/points/service";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/points/gift-card/redeem
 * Body: { code: string }
 *
 * Redeems a gift card and credits points to the authenticated user.
 */
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

  // Use admin client so the RPC can bypass RLS
  const admin = getAdminClient();

  try {
    const result = await redeemGiftCard(admin, user.id, code);
    await invalidateCache(CACHE_KEYS.pointsBalance(user.id));
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    // Map DB exception messages to user-friendly errors
    const errorMap: Record<string, [string, number]> = {
      GIFT_CARD_NOT_FOUND: ["Gift card not found", 404],
      GIFT_CARD_INACTIVE: ["This gift card is no longer active", 400],
      GIFT_CARD_ALREADY_REDEEMED: [
        "This gift card has already been redeemed",
        409,
      ],
      GIFT_CARD_EXPIRED: ["This gift card has expired", 400],
      GIFT_CARD_NOT_YOURS: [
        "This gift card is not assigned to your account",
        403,
      ],
    };

    for (const [key, [friendlyMsg, status]] of Object.entries(errorMap)) {
      if (msg.includes(key)) {
        return NextResponse.json({ error: friendlyMsg }, { status });
      }
    }

    console.error("[gift-card/redeem] unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to redeem gift card" },
      { status: 500 }
    );
  }
}
