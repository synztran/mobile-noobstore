import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const code = body.code?.trim();
  if (!code || code.length > 32) {
    return NextResponse.json({ error: "Invalid gift card code" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const admin = getAdminClient();
  const { data: card, error: lookupError } = await admin
    .from("gift_cards")
    .select("id, issued_to_user_id, is_active, redeemed_at, redeemed_by_user_id, expires_at")
    .ilike("code", code)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: "Could not verify gift card" }, { status: 500 });
  }
  if (!card) return NextResponse.json({ error: "Gift card not found" }, { status: 404 });
  if (
    !card.is_active ||
    card.redeemed_at ||
    card.redeemed_by_user_id ||
    (card.expires_at && new Date(card.expires_at) <= new Date()) ||
    (card.issued_to_user_id && card.issued_to_user_id !== user.id)
  ) {
    return NextResponse.json({ error: "Gift card unavailable" }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("gift_cards")
    .update({ is_scratched: true })
    .eq("id", card.id)
    .eq("is_active", true)
    .is("redeemed_at", null)
    .is("redeemed_by_user_id", null)
    .or(`issued_to_user_id.is.null,issued_to_user_id.eq.${user.id}`)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Could not save scratch status" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Gift card not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
