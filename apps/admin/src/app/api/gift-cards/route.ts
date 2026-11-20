import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

function generateCode(length = 16): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0, I/1 to avoid confusion
  let code = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (const b of bytes) {
    code += chars[b % chars.length];
  }
  // Format as XXXX-XXXX-XXXX-XXXX
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}-${code.slice(12, 16)}`;
}

/**
 * GET /api/admin/gift-cards?page=1&search=code
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const search = (searchParams.get("search") ?? "").trim();

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = getAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("gift_cards")
    .select(
      "id, code, points_value, batch_label, note, is_active, expires_at, created_at, redeemed_at, redeemed_by_user_id, issued_to_user_id, theme_id, is_scratched",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.ilike("code", `%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const cards: any[] = data ?? [];

  // Batch-fetch profiles for redeemed_by_user_id and issued_to_user_id
  const userIds: string[] = [
    ...new Set(
      cards.flatMap((c: any) => [
        c.redeemed_by_user_id as string | null,
        c.issued_to_user_id as string | null,
      ]).filter(Boolean) as string[]
    ),
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let profileMap: Record<string, { email: string; full_name: string | null }> =
    {};
  if (userIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profileRows } = await (supabase as any)
      .from("users")
      .select("id, email, first_name, last_name")
      .in("id", userIds);

    for (const p of profileRows ?? []) {
      const fullName =
        [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || null;
      profileMap[p.id] = { email: p.email, full_name: fullName };
    }
  }

  const merged = cards.map((c: any) => ({
    ...c,
    redeemed_by_profile: c.redeemed_by_user_id
      ? (profileMap[c.redeemed_by_user_id] ?? null)
      : null,
    issued_to_profile: c.issued_to_user_id
      ? (profileMap[c.issued_to_user_id] ?? null)
      : null,
  }));

  return NextResponse.json({
    giftCards: merged,
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    hasMore: (count ?? 0) > to + 1,
  });
}

/** Update editable fields on an unredeemed gift card. Code is immutable. */
export async function PATCH(req: NextRequest) {
  let body: {
    id?: number;
    points_value?: number;
    batch_label?: string | null;
    note?: string | null;
    expires_at?: string | null;
    issued_to_user_id?: string | null;
    is_active?: boolean;
    theme_id?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Number.isInteger(body.id) || !body.id ||
      !Number.isInteger(body.points_value) || (body.points_value ?? 0) < 1_000 || (body.points_value ?? Infinity) > 5_000_000 ||
      typeof body.is_active !== "boolean" ||
      !(body.batch_label == null || typeof body.batch_label === "string") ||
      !(body.note == null || typeof body.note === "string") ||
      !(body.expires_at == null || (typeof body.expires_at === "string" && !Number.isNaN(Date.parse(body.expires_at)))) ||
      !(body.issued_to_user_id == null || typeof body.issued_to_user_id === "string") ||
      !(body.theme_id == null || ["amber", "emerald", "indigo", "rose", "sky"].includes(body.theme_id))) {
    return NextResponse.json({ error: "Invalid gift card fields" }, { status: 400 });
  }

  const supabase = getAdminClient();
  // Redeemed cards are immutable; filter in the update itself to avoid a race.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("gift_cards")
    .update({
      points_value: body.points_value,
      batch_label: body.batch_label ?? null,
      note: body.note ?? null,
      expires_at: body.expires_at ?? null,
      issued_to_user_id: body.issued_to_user_id ?? null,
      is_active: body.is_active,
      theme_id: body.theme_id ?? null,
    })
    .eq("id", body.id)
    .is("redeemed_at", null)
    .is("redeemed_by_user_id", null)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Gift card not found or already redeemed" }, { status: 409 });
  return NextResponse.json({ success: true });
}

/**
 * POST /api/admin/gift-cards
 * Body: { points_value: number; quantity?: number; batch_label?: string; note?: string; expires_at?: string; issued_to_user_id?: string }
 *
 * quantity defaults to 1. Use > 1 to bulk-generate a batch of cards.
 */
export async function POST(req: NextRequest) {
  const supabase = getAdminClient();

  let body: {
    points_value: number;
    quantity?: number;
    batch_label?: string;
    note?: string;
    expires_at?: string | null;
    issued_to_user_id?: string | null;
    theme_id?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    points_value,
    quantity = 1,
    batch_label,
    note,
    expires_at,
    issued_to_user_id,
    theme_id,
  } = body;

  if (!Number.isInteger(points_value) || points_value < 1_000 || points_value > 5_000_000) {
    return NextResponse.json(
      { error: "points_value must be > 0" },
      { status: 400 }
    );
  }
  if (quantity < 1 || quantity > 500) {
    return NextResponse.json(
      { error: "quantity must be between 1 and 500" },
      { status: 400 }
    );
  }
  if (!(theme_id == null || ["amber", "emerald", "indigo", "rose", "sky"].includes(theme_id))) {
    return NextResponse.json({ error: "Invalid theme_id" }, { status: 400 });
  }

  if (!(theme_id == null || ["amber", "emerald", "indigo", "rose", "sky"].includes(theme_id))) {
    return NextResponse.json({ error: "Invalid theme_id" }, { status: 400 });
  }

  const cards = Array.from({ length: quantity }, () => ({
    code: generateCode(),
    points_value,
    batch_label: batch_label ?? null,
    note: note ?? null,
    expires_at: expires_at ?? null,
    issued_to_user_id: quantity === 1 ? (issued_to_user_id ?? null) : null,
    is_active: true,
    theme_id: theme_id ?? null,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("gift_cards")
    .insert(cards)
    .select("id, code, points_value, batch_label, expires_at, created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ giftCards: data }, { status: 201 });
}
