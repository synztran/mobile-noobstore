import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/points/rules
 * Returns all point earning rules.
 */
export async function GET(_req: NextRequest) {
  const supabase = getAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("point_rules")
    .select(
      "id, rule_type, rate_type, rate_value, is_active, description, updated_at"
    )
    .order("rule_type");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rules: data ?? [] });
}
