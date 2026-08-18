import { CACHE_KEYS, readThroughCache } from "@/lib/redis/cache";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BALANCE_TTL_SECONDS = 60;

/**
 * GET /api/points/balance
 * Returns the authenticated customer's current NSP balance.
 * Cached per-user for 60s in Redis (still auth-validated on every hit, but the
 * single-PK read is skipped on warm hits).
 */
export async function GET(_req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const balance = await readThroughCache<number>(
    CACHE_KEYS.pointsBalance(user.id),
    BALANCE_TTL_SECONDS,
    async () => {
      const { data, error } = await supabase
        .from("users")
        .select("points_balance")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data?.points_balance ?? 0;
    }
  );

  return NextResponse.json({ balance });
}
