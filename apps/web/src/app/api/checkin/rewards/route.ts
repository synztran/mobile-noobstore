import { getCheckinLimiter, getRateLimitKey, tryRateLimit } from "@/lib/redis/ratelimit";
import { createClient } from "@/lib/supabase/server";
import { getCheckinRewards } from "@/modules/checkin/server/queries";
import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const limit = await tryRateLimit(getCheckinLimiter(), getRateLimitKey(request, user.id));
    if (!limit.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000))) } });
    const rewards = await getCheckinRewards(getAdminClient() as any);
    return NextResponse.json(rewards);
  } catch (error) {
    console.error("[checkin/rewards] failed", error);
    return NextResponse.json({ error: "Unable to load rewards" }, { status: 500 });
  }
}
