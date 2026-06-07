import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string; rewardId: string }> }
) {
    const { id, rewardId } = await params;
    const supabase = getAdminClient();

    const eventIdNum = Number(id);
    const rewardIdNum = Number(rewardId);

    // Use Postgres function for efficient per-win cumulative stats. If the function
    // is not present (e.g., migrations not applied), fall back to JS calculation.
    const { data, error } = await supabase.rpc("get_gacha_reward_winners", {
        event_id: eventIdNum,
        reward_id: rewardIdNum,
    });

    if (!error && Array.isArray(data)) {
        return NextResponse.json(data ?? []);
    }

    // Fallback: compute per-win cumulative stats in JS
    console.warn("get_gacha_reward_winners RPC failed, falling back to JS computation", error?.message ?? "");

    const { data: allHistory, error: histErr } = await supabase
        .from("gacha_history")
        .select("id, user_id, reward_id, played_at")
        .eq("event_id", eventIdNum)
        .order("played_at", { ascending: true })
        .order("id", { ascending: true });

    if (histErr) return NextResponse.json({ error: histErr.message }, { status: 500 });

    // Iterate in chronological order and maintain per-user cumulative counters
    const userCounters = new Map<string, { plays_count: number; wins_count: number }>();
    const winnersEntries: Array<{ history_id: number; user_id: string; played_at: string; plays_count: number; wins_count: number }> = [];

    for (const row of allHistory ?? []) {
        const uid = row.user_id as string;
        const prev = userCounters.get(uid) ?? { plays_count: 0, wins_count: 0 };
        const plays = prev.plays_count + 1;
        const wins = prev.wins_count + (String(row.reward_id) === String(rewardIdNum) ? 1 : 0);
        userCounters.set(uid, { plays_count: plays, wins_count: wins });
        if (String(row.reward_id) === String(rewardIdNum)) {
            winnersEntries.push({ history_id: row.id as number, user_id: uid, played_at: row.played_at, plays_count: plays, wins_count: wins });
        }
    }

    if (winnersEntries.length === 0) return NextResponse.json([]);

    const userIds = Array.from(new Set(winnersEntries.map((w) => w.user_id)));
    const { data: users, error: usersErr } = await supabase
        .from("users")
        .select("id, email, first_name, last_name")
        .in("id", userIds);

    if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 500 });

    const usersMap: Record<string, { email: string | null; full_name: string | null }> = {};
    if (users) {
        for (const u of users) {
            usersMap[u.id] = {
                email: u.email ?? null,
                full_name: [u.first_name, u.last_name].filter(Boolean).join(" ") || null,
            };
        }
    }

    const winners = winnersEntries.map((w) => ({
        history_id: w.history_id,
        user_id: w.user_id,
        user_name: usersMap[w.user_id]?.full_name ?? null,
        user_email: usersMap[w.user_id]?.email ?? null,
        played_at: w.played_at,
        plays_count: w.plays_count,
        wins_count: w.wins_count,
    }));

    return NextResponse.json(winners);
}
