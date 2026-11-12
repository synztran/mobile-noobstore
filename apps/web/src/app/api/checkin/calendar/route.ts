import { getCheckinLimiter, getRateLimitKey, tryRateLimit } from "@/lib/redis/ratelimit";
import { createClient } from "@/lib/supabase/server";
import { getCheckinCalendar } from "@/modules/checkin/server/queries";
import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const limited = await tryRateLimit(getCheckinLimiter(), getRateLimitKey(request, user.id));
    if (!limited.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((limited.reset - Date.now()) / 1000))) } });
    const month = request.nextUrl.searchParams.get("month") ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit" }).format(new Date());
    const data = await getCheckinCalendar(getAdminClient() as any, user.id, month);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[checkin/calendar] failed", error);
    return NextResponse.json({ error: "Không thể tải lịch điểm danh" }, { status: 500 });
  }
}
