import { getCheckinLimiter, getRateLimitKey, tryRateLimit } from "@/lib/redis/ratelimit";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { claimCheckinToday } from "@/modules/checkin/server/queries";
import { NextRequest, NextResponse } from "next/server";
import { invalidateCache, CACHE_KEYS } from "@/lib/redis/cache";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const limited = await tryRateLimit(getCheckinLimiter(), getRateLimitKey(request, user.id));
    if (!limited.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((limited.reset - Date.now()) / 1000))) } });
    const data = await claimCheckinToday(getAdminClient() as any, user.id);
    if (!data.alreadyCheckedIn) await invalidateCache(CACHE_KEYS.pointsBalance(user.id));
    return NextResponse.json(data, { status: data.alreadyCheckedIn ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("checkin_disabled")) return NextResponse.json({ error: "Điểm danh hiện chưa mở" }, { status: 403 });
    if (message.includes("duplicate key") || message.includes("unique constraint")) {
      return NextResponse.json({ alreadyCheckedIn: true });
    }
    console.error("[checkin/claim] failed", error);
    return NextResponse.json({ error: "Không thể điểm danh lúc này" }, { status: 500 });
  }
}
