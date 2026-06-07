import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

/**
 * GET /api/admin/points/transactions?page=1&search=email&source_type=order_delivered
 * Returns paginated point_transactions joined with profile info.
 *
 * Strategy: fetch transactions first, then batch-fetch profiles for the
 * user_ids in the result. Direct PostgREST join doesn't work because
 * point_transactions.user_id → auth.users, not public.profiles.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const search = (searchParams.get("search") ?? "").trim().toLowerCase();
  const sourceType = (searchParams.get("source_type") ?? "").trim();

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = getAdminClient();

  // ── Step 1: query transactions ─────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let txQuery = (supabase as any)
    .from("point_transactions")
    .select(
      "id, user_id, delta, balance_after, source_type, source_ref, note, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (sourceType) {
    txQuery = txQuery.eq("source_type", sourceType);
  }
  // Note-level search only at DB — email search handled client-side after join
  if (search) {
    txQuery = txQuery.ilike("note", `%${search}%`);
  }

  const { data: txRows, error: txError, count } = await txQuery;

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 });
  }

  const transactions: any[] = txRows ?? [];

  // ── Step 2: batch-fetch profiles for user_ids in the page ─────────────────
  const userIds: string[] = [
    ...new Set(transactions.map((t: any) => t.user_id as string)),
  ];

  let profileMap: Record<
    string,
    { email: string; full_name: string | null; points_balance: number }
  > = {};

  if (userIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profileRows } = await (supabase as any)
      .from("users")
      .select("id, email, first_name, last_name, points_balance")
      .in("id", userIds);

    for (const p of profileRows ?? []) {
      const fullName =
        [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || null;
      profileMap[p.id] = {
        email: p.email,
        full_name: fullName,
        points_balance: p.points_balance ?? 0,
      };
    }
  }

  // ── Step 3: merge & optionally filter by email ─────────────────────────────
  let merged = transactions.map((t: any) => ({
    ...t,
    profiles: profileMap[t.user_id] ?? null,
  }));

  // If search term provided but didn't match by note, also filter by email
  if (search) {
    merged = merged.filter(
      (t) =>
        t.profiles?.email?.toLowerCase().includes(search) ||
        t.note?.toLowerCase().includes(search)
    );
  }

  return NextResponse.json({
    transactions: merged,
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    hasMore: (count ?? 0) > to + 1,
  });
}
